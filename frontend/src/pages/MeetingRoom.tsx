import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMeetingStore } from "@/stores/meetingStore";
import {
  endMeeting,
  getMeetingDetails,
  joinMeeting,
  type MeetingDetails,
} from "@/services/meetingService";
import { useAuthStore } from "@/stores/authStore";
import { useSocket } from "@/hooks/useSocket";
import { useWebRTC } from "@/hooks/useWebRTC";
import VideoGrid, { type CallLayoutType } from "@/meeting/VideoGrid";
import ControlsBar from "@/meeting/ControlsBar";
import ChatPanel from "@/meeting/ChatPanel";
import ParticipantList from "@/meeting/ParticipantList";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2, VideoOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMeetingRecording } from "@/hooks/useMeetingRecording";

const MeetingRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    leaveMeeting,
    addParticipant,
    removeParticipant,
    isMuted,
    isCameraOff,
    participants,
    toggleMic,
    toggleCamera,
    updateParticipantStream,
    updateParticipantMedia,
    addOnlineUser,
    removeOnlineUser,
  } = useMeetingStore();

  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"chat" | "participants">("chat");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [layout, setLayout] = useState<CallLayoutType>("grid");
  const { isRecording, isUploading, startRecording, stopRecording } =
    useMeetingRecording(roomId!);
  const hasHandledMeetingEnd = useRef(false);
  const socket = useSocket(roomId);
  const {
    localVideoRef,
    toggleMicTrack,
    toggleCameraTrack,
    startScreenShare,
    stopScreenShare,
    startLocalMedia,
    registerRemoteVideoRef,
  } = useWebRTC({
    meetingCode: roomId!,
    socket,
    onRemoteStream: (peerId, stream) => {
      updateParticipantStream(peerId, stream);
    },
  });

  const handleToggleMic = async () => {
    if (!useMeetingStore.getState().localStream) {
      try {
        await startLocalMedia();
      } catch {
        toast.error("Could not access microphone.");
        return;
      }
    }
    const newMutedState = !isMuted;
    toggleMic();
    toggleMicTrack(!newMutedState);
    if (socket.connected) {
      socket.emit("toggle-audio", {
        meetingCode: roomId,
        isMuted: newMutedState,
      });
    }
  };

  const handleToggleCamera = async () => {
    if (!useMeetingStore.getState().localStream) {
      try {
        await startLocalMedia();
      } catch {
        toast.error("Could not access camera. Please check permissions.");
        return;
      }
    }
    const newCameraState = !isCameraOff;
    toggleCamera();
    toggleCameraTrack(!newCameraState);
    if (socket.connected) {
      socket.emit("toggle-video", {
        meetingCode: roomId,
        isCameraOff: newCameraState,
      });
    }
  };

  const { data: meetingDetails, isLoading: meetingLoading } =
    useQuery<MeetingDetails>({
      queryKey: ["meeting-details", roomId],
      queryFn: () => getMeetingDetails(roomId!),
      enabled: !!roomId && !!user,
      refetchInterval: 5000,
    });

  const isHost =
    meetingDetails?.createdBy?._id === user?._id ||
    meetingDetails?.participants?.some((p) => {
      if (p.role !== "host") return false;
      const participantUserId =
        typeof p.user === "string" ? p.user : p.user?._id;
      return participantUserId === user?._id;
    });

  useEffect(() => {
    if (!meetingDetails) return;
    if (meetingDetails.status === "ended" && !hasHandledMeetingEnd.current) {
      hasHandledMeetingEnd.current = true;
      toast.info("Meeting ended by host");
      leaveMeeting();
      navigate("/dashboard");
    }
  }, [meetingDetails, leaveMeeting, navigate]);

  useEffect(() => {
    if (!roomId) return;
    joinMeeting(roomId)
      .then(() => {
        queryClient.invalidateQueries({
          queryKey: ["meeting-details", roomId],
        });
      })
      .catch(() => {});
  }, [roomId, queryClient]);

  useEffect(() => {
    const handleExistingUsers = (
      users: {
        socketId: string;
        dbUserId: string;
        userName: string;
        isMuted: boolean;
        isCameraOff: boolean;
        isScreenSharing: boolean;
      }[],
    ) => {
      users.forEach((u) => {
        if (u.dbUserId === user?._id) return;

        addParticipant({
          id: u.dbUserId,
          socketId: u.socketId,
          name: u.userName,
          isMuted: u.isMuted,
          isCameraOff: u.isCameraOff,
          isScreenSharing: u.isScreenSharing,
          isActiveSpeaker: false,
        });

        // Mark as online
        addOnlineUser(u.dbUserId);
      });

      if (socket.connected && roomId) {
        const { isMuted: localMuted, isCameraOff: localCameraOff } =
          useMeetingStore.getState();
        socket.emit("sync-media-state", {
          meetingCode: roomId,
          isMuted: localMuted,
          isCameraOff: localCameraOff,
        });
      }
    };

    socket.on("existing-users", handleExistingUsers);
    return () => {
      socket.off("existing-users", handleExistingUsers);
    };
  }, [socket, addParticipant, addOnlineUser, user, roomId]);

  useEffect(() => {
    const handleUserConnected = ({
      socketId,
      dbUserId,
      userName,
      isMuted,
      isCameraOff,
      isScreenSharing,
    }: {
      socketId: string;
      dbUserId: string;
      userName: string;
      isMuted: boolean;
      isCameraOff: boolean;
      isScreenSharing: boolean;
    }) => {
      addParticipant({
        id: dbUserId,
        socketId,
        name: userName,
        isMuted,
        isCameraOff,
        isScreenSharing,
        isActiveSpeaker: false,
      });
      addOnlineUser(dbUserId);
    };

    const handleUserDisconnected = ({ dbUserId }: { dbUserId: string }) => {
      removeParticipant(dbUserId);
      removeOnlineUser(dbUserId);
    };

    const handleAudioToggled = ({
      dbUserId,
      isMuted,
    }: {
      dbUserId: string;
      isMuted: boolean;
    }) => {
      updateParticipantMedia(dbUserId, { isMuted });
    };

    const handleVideoToggled = ({
      dbUserId,
      isCameraOff,
    }: {
      dbUserId: string;
      isCameraOff: boolean;
    }) => {
      updateParticipantMedia(dbUserId, { isCameraOff });
    };

    const handleNotification = (msg: string) => {
      toast.info(msg, { duration: 2500 });
    };

    const handleErrorMessage = (msg: string) => {
      toast.error(msg);
      navigate("/dashboard");
    };

    socket.on("user-connected", handleUserConnected);
    socket.on("user-disconnected", handleUserDisconnected);
    socket.on("participant-audio-toggled", handleAudioToggled);
    socket.on("participant-video-toggled", handleVideoToggled);
    socket.on("notification", handleNotification);
    socket.on("error-message", handleErrorMessage);

    return () => {
      socket.off("user-connected", handleUserConnected);
      socket.off("user-disconnected", handleUserDisconnected);
      socket.off("participant-audio-toggled", handleAudioToggled);
      socket.off("participant-video-toggled", handleVideoToggled);
      socket.off("notification", handleNotification);
      socket.off("error-message", handleErrorMessage);
    };
  }, [
    socket,
    addParticipant,
    removeParticipant,
    updateParticipantMedia,
    addOnlineUser,
    removeOnlineUser,
  ]);

  useEffect(() => {
    const handleScreenShareToggled = ({
      dbUserId,
      isScreenSharing,
    }: {
      dbUserId: string;
      isScreenSharing: boolean;
    }) => {
      updateParticipantMedia(dbUserId, { isScreenSharing });
    };

    socket.on("participant-screen-share-toggled", handleScreenShareToggled);
    return () => {
      socket.off("participant-screen-share-toggled", handleScreenShareToggled);
    };
  }, [socket, updateParticipantMedia]);

  useEffect(() => {
    const handleMediaSync = ({
      dbUserId,
      isMuted,
      isCameraOff,
      isScreenSharing,
    }: {
      dbUserId: string;
      isMuted: boolean;
      isCameraOff: boolean;
      isScreenSharing: boolean;
    }) => {
      updateParticipantMedia(dbUserId, {
        isMuted,
        isCameraOff,
        isScreenSharing,
      });
    };

    socket.on("participant-media-sync", handleMediaSync);
    return () => {
      socket.off("participant-media-sync", handleMediaSync);
    };
  }, [socket, updateParticipantMedia]);

  useEffect(() => {
    const handleOnline = ({ dbUserId }: { dbUserId: string }) => {
      addOnlineUser(dbUserId);
    };
    const handleOffline = ({ dbUserId }: { dbUserId: string }) => {
      removeOnlineUser(dbUserId);
    };

    socket.on("user-online", handleOnline);
    socket.on("user-offline", handleOffline);
    return () => {
      socket.off("user-online", handleOnline);
      socket.off("user-offline", handleOffline);
    };
  }, [socket, addOnlineUser, removeOnlineUser]);

  const handleLeave = async () => {
    if (isLeaving) return;
    setIsLeaving(true);

    if (isHost && roomId) {
      try {
        await endMeeting(roomId);
        toast.success("Meeting ended for everyone");
      } catch {}
    }
    leaveMeeting();
    navigate("/dashboard");
  };

  const handleScreenShare = async () => {
    return await startScreenShare();
  };
  const handleStopScreenShare = () => {
    stopScreenShare();
  };

  const copyCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      toast.success("Meeting code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (meetingLoading) {
    return (
      <div className="h-screen dark bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm">Joining meeting...</p>
        </div>
      </div>
    );
  }

  if (meetingDetails?.status === "ended") {
    return (
      <div className="h-screen dark bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <VideoOff className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-white font-semibold text-lg">Meeting has ended</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-xl text-primary-foreground text-sm transition-colors"
          >
            Go back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const participantCount = participants.length + 1;

  return (
    <TooltipProvider>
      <div className="dark h-screen flex flex-col bg-background/95 text-foreground overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
              <VideoGrid
                localVideoRef={localVideoRef}
                registerRemoteVideoRef={registerRemoteVideoRef}
                layout={layout}
              />
            </div>
            <div className="shrink-0 pb-4 pt-1 flex items-center bg-background/50">
              <ControlsBar
                onLeave={handleLeave}
                onScreenShare={handleScreenShare}
                onStopScreenShare={handleStopScreenShare}
                onToggleMic={handleToggleMic}
                onToggleCamera={handleToggleCamera}
                isHost={Boolean(isHost)}
                layout={layout}
                onLayoutChange={setLayout}
                meetingTitle={meetingDetails?.title}
                participantCount={participantCount}
                meetingCode={roomId ?? ""}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
                onCopyCode={copyCode}
                isCopied={copied}
                isRecording={isRecording}
                isUploading={isUploading}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
              />
            </div>
          </div>

          <div
            className={cn(
              "fixed inset-y-0 right-0 z-[60] lg:relative lg:inset-auto flex flex-col border-white/5 bg-background lg:bg-card/10 shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
              isSidebarOpen
                ? "w-full lg:w-80 translate-x-0 opacity-100 border-l"
                : "w-full lg:w-0 translate-x-full lg:translate-x-0 opacity-0 lg:border-l-0 pointer-events-none",
            )}
          >
            <div className="w-full lg:w-80 h-full flex flex-col shrink-0 min-w-[100vw] lg:min-w-[20rem]">
              <div className="flex items-center border-b border-white/5 shrink-0">
                <div className="flex-1 flex overflow-x-auto">
                  {[
                    { id: "chat", label: "chat" },
                    {
                      id: "participants",
                      label: `participants (${participants.length + 1})`,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSidebarTab(tab.id as any)}
                      className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                        sidebarTab === tab.id
                          ? "text-primary border-b-2 border-primary bg-primary/5"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                {/* Mobile Close Button */}
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden p-3 border-l border-white/5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                {sidebarTab === "chat" ? (
                  <ChatPanel socket={socket} meetingCode={roomId!} />
                ) : (
                  <ParticipantList hostId={meetingDetails?.createdBy?._id} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default MeetingRoom;
