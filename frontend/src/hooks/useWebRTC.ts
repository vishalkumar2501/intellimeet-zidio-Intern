import { useEffect, useRef, useCallback } from "react";
import { useMeetingStore } from "@/stores/meetingStore";

interface UseWebRTCOptions {
  meetingCode: string;
  socket: import("socket.io-client").Socket;
  onRemoteStream?: (peerId: string, stream: MediaStream) => void;
}

interface ExistingUser {
  socketId: string;
  dbUserId: string;
  userName: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export const useWebRTC = ({
  meetingCode,
  socket,
  onRemoteStream,
}: UseWebRTCOptions) => {
  const { setLocalStream } = useMeetingStore();

  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerSocketIdMap = useRef<Map<string, string>>(new Map());
  const mediaReadyRef = useRef<boolean>(false);
  const pendingSignals = useRef<Array<() => Promise<void>>>([]);
  const iceCandidatesQueue = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map(),
  );

  const startLocalMedia = useCallback(async () => {
    try {
      console.log("[WebRTC] Starting local media...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      const { isMuted: initMuted, isCameraOff: initCameraOff } =
        useMeetingStore.getState();
      stream.getAudioTracks().forEach((t) => (t.enabled = !initMuted));
      stream.getVideoTracks().forEach((t) => (t.enabled = !initCameraOff));

      mediaReadyRef.current = true;
      console.log(
        "[WebRTC] Local media ready, processing pending signals:",
        pendingSignals.current.length,
      );

      for (const fn of pendingSignals.current) {
        await fn();
      }
      pendingSignals.current = [];

      return stream;
    } catch (err) {
      console.warn("[WebRTC] getUserMedia failed:", err);
      mediaReadyRef.current = true;
      // Continue even if media fails so signaling can still happen (e.g. for chat or seeing others)
      return null;
    }
  }, [setLocalStream]);

  const createPeerConnection = useCallback(
    (dbUserId: string): RTCPeerConnection => {
      console.log("[WebRTC] Creating PeerConnection for:", dbUserId);
      const existing = peersRef.current.get(dbUserId);
      if (existing) {
        console.log("[WebRTC] Closing existing PC for:", dbUserId);
        existing.close();
        peersRef.current.delete(dbUserId);
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          const targetSocketId = peerSocketIdMap.current.get(dbUserId);
          if (targetSocketId) {
            socket.emit("ice-candidate", {
              target: targetSocketId,
              candidate,
            });
          }
        }
      };

      pc.ontrack = (event) => {
        console.log("[WebRTC] Received remote track from:", dbUserId);
        const remoteStream = event.streams[0] || new MediaStream([event.track]);

        const existingEl = remoteVideoRefs.current.get(dbUserId);
        if (existingEl) {
          existingEl.srcObject = remoteStream;
        }

        onRemoteStream?.(dbUserId, remoteStream);
      };

      pc.oniceconnectionstatechange = () => {
        console.log(
          `[WebRTC] ICE state for ${dbUserId}:`,
          pc.iceConnectionState,
        );
        if (pc.iceConnectionState === "failed") {
          pc.restartIce();
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(
          `[WebRTC] Connection state for ${dbUserId}:`,
          pc.connectionState,
        );
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          // Attempting recovery or cleanup could go here
        }
      };

      peersRef.current.set(dbUserId, pc);
      return pc;
    },
    [socket, onRemoteStream],
  );

  const processQueuedIceCandidates = useCallback(async (dbUserId: string) => {
    const pc = peersRef.current.get(dbUserId);
    const queue = iceCandidatesQueue.current.get(dbUserId);
    if (pc && pc.remoteDescription && queue) {
      console.log(
        `[WebRTC] Processing ${queue.length} queued ICE candidates for:`,
        dbUserId,
      );
      while (queue.length > 0) {
        const candidate = queue.shift();
        if (candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn("[WebRTC] Error adding queued ICE candidate:", e);
          }
        }
      }
      iceCandidatesQueue.current.delete(dbUserId);
    }
  }, []);

  const toggleMicTrack = useCallback((enabled: boolean) => {
    localStreamRef.current
      ?.getAudioTracks()
      .forEach((t) => (t.enabled = enabled));
  }, []);

  const toggleCameraTrack = useCallback((enabled: boolean) => {
    localStreamRef.current
      ?.getVideoTracks()
      .forEach((t) => (t.enabled = enabled));
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });
      screenStreamRef.current = screenStream;
      const videoTrack = screenStream.getVideoTracks()[0];

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      for (const [dbId, pc] of peersRef.current.entries()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(videoTrack);
        } else {
          pc.addTrack(videoTrack, screenStream);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          const targetSocketId = peerSocketIdMap.current.get(dbId);
          if (targetSocketId) {
            socket.emit("offer", {
              target: targetSocketId,
              caller: socket.id,
              sdp: offer,
            });
          }
        }
      }

      socket.emit("toggle-screen-share", {
        meetingCode,
        isScreenSharing: true,
      });

      videoTrack.onended = () => {
        stopScreenShare();
      };

      return screenStream;
    } catch (err) {
      console.warn("Screen share failed:", err);
      return null;
    }
  }, [socket, meetingCode]);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;

    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null;
    peersRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      sender?.replaceTrack(cameraTrack);
    });

    socket.emit("toggle-screen-share", {
      meetingCode,
      isScreenSharing: false,
    });
  }, [socket, meetingCode]);

  const registerRemoteVideoRef = useCallback(
    (peerId: string, el: HTMLVideoElement | null) => {
      if (el) {
        remoteVideoRefs.current.set(peerId, el);
      } else {
        remoteVideoRefs.current.delete(peerId);
      }
    },
    [],
  );

  useEffect(() => {
    const handleUserConnected = async ({
      dbUserId,
      socketId,
    }: {
      dbUserId: string;
      socketId: string;
    }) => {
      // We don't initiate offers here to avoid glare.
      // The joiner will receive 'existing-users' and initiate the offer to us.
      console.log(
        "[WebRTC] user-connected | Adding socket mapping for:",
        dbUserId,
      );
      peerSocketIdMap.current.set(dbUserId, socketId);
    };

    const handleExistingUsers = async (users: ExistingUser[]) => {
      console.log("[WebRTC] existing-users received. Count:", users.length);

      const doWork = async () => {
        const { user: currentUser } = await import("@/stores/authStore").then(
          (m) => m.useAuthStore.getState(),
        );

        for (const u of users) {
          if (!u.dbUserId || u.dbUserId === currentUser?._id) continue;

          console.log(
            "[WebRTC] Joiner initiating offer to existing user:",
            u.dbUserId,
          );
          peerSocketIdMap.current.set(u.dbUserId, u.socketId);
          const pc = createPeerConnection(u.dbUserId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", {
            target: u.socketId,
            caller: socket.id,
            sdp: offer,
          });
        }
      };

      if (!mediaReadyRef.current) {
        pendingSignals.current.push(doWork);
      } else {
        await doWork();
      }
    };

    const handleOffer = async (payload: {
      caller: string;
      callerDbUserId: string;
      callerSocketId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      const doWork = async () => {
        const dbUserId = payload.callerDbUserId;
        const socketId = payload.callerSocketId || payload.caller;
        console.log("[WebRTC] Received offer from:", dbUserId);

        peerSocketIdMap.current.set(dbUserId, socketId);
        const pc = createPeerConnection(dbUserId);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

        // Process any queued ICE candidates now that remote description is set
        await processQueuedIceCandidates(dbUserId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", {
          target: socketId,
          caller: socket.id,
          sdp: answer,
        });
      };

      if (!mediaReadyRef.current) {
        pendingSignals.current.push(doWork);
      } else {
        await doWork();
      }
    };

    const handleAnswer = async (payload: {
      caller: string;
      callerDbUserId: string;
      callerSocketId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      const dbUserId = payload.callerDbUserId;
      console.log("[WebRTC] Received answer from:", dbUserId);

      const pc = peersRef.current.get(dbUserId);
      if (pc) {
        if (pc.signalingState !== "stable") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          await processQueuedIceCandidates(dbUserId);
        }
      } else {
        console.warn(
          "[WebRTC] Received answer but no PeerConnection found for:",
          dbUserId,
        );
      }
    };

    const handleIceCandidate = async (incoming: {
      target: string;
      candidate: RTCIceCandidateInit;
      fromDbUserId: string;
      fromSocketId: string;
    }) => {
      const dbUserId = incoming.fromDbUserId;
      const pc = peersRef.current.get(dbUserId);

      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(incoming.candidate));
        } catch (e) {
          console.warn("[WebRTC] Error adding ICE candidate:", e);
        }
      } else {
        // Queue candidates if remote description is not yet set
        const queue = iceCandidatesQueue.current.get(dbUserId) || [];
        queue.push(incoming.candidate);
        iceCandidatesQueue.current.set(dbUserId, queue);
      }
    };

    const handleUserDisconnected = ({ dbUserId }: { dbUserId: string }) => {
      console.log("[WebRTC] user-disconnected:", dbUserId);
      const pc = peersRef.current.get(dbUserId);
      if (pc) {
        pc.close();
        peersRef.current.delete(dbUserId);
      }
      peerSocketIdMap.current.delete(dbUserId);
      remoteVideoRefs.current.delete(dbUserId);
      iceCandidatesQueue.current.delete(dbUserId);
    };

    socket.on("user-connected", handleUserConnected);
    socket.on("existing-users", handleExistingUsers);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("user-disconnected", handleUserDisconnected);

    return () => {
      socket.off("user-connected", handleUserConnected);
      socket.off("existing-users", handleExistingUsers);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("user-disconnected", handleUserDisconnected);
    };
  }, [socket, createPeerConnection, processQueuedIceCandidates]);

  useEffect(() => {
    startLocalMedia();

    return () => {
      console.log("[WebRTC] Component unmounting, cleaning up...");
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      peerSocketIdMap.current.clear();
      remoteVideoRefs.current.clear();
      mediaReadyRef.current = false;
      pendingSignals.current = [];
      iceCandidatesQueue.current.clear();
    };
  }, [startLocalMedia]);

  return {
    localVideoRef,
    localStreamRef,
    toggleMicTrack,
    toggleCameraTrack,
    startScreenShare,
    stopScreenShare,
    startLocalMedia,
    registerRemoteVideoRef,
  };
};
