import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
};

export const useSocket = (meetingCode?: string) => {
  const { user, accessToken } = useAuthStore();
  const socketRef = useRef<Socket>(getSocket());
  const joinedRef = useRef<string | null>(null);

  useEffect(() => {
    const socket = socketRef.current;

    if (!socket.connected) {
      socket.auth = { token: accessToken };
      socket.connect();
    }

    const emitJoinRoom = () => {
      if (!meetingCode || !user) return;
      socket.emit("join-room", {
        meetingCode,
        userId: socket.id,
        userName: user.username,
        dbUserId: user._id,
      });
      joinedRef.current = meetingCode;
    };

    if (meetingCode && user && joinedRef.current !== meetingCode) {
      if (socket.connected) {
        emitJoinRoom();
      } else {
        socket.once("connect", emitJoinRoom);
      }
    }

    const handleConnect = () => {
      console.log("[Socket] Connected:", socket.id);

      if (meetingCode && user) {
        joinedRef.current = null;
        setTimeout(() => {
          emitJoinRoom();
        }, 100);
      } else if (user) {
        socket.emit("join-lobby", user._id);
      }
    };

    if (!meetingCode && user) {
      const emitLobby = () => socket.emit("join-lobby", user._id);
      if (socket.connected) emitLobby();
      else socket.once("connect", emitLobby);
    }

    const handleError = (error: unknown) => {
      console.error("[Socket] Connection error:", error);
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleError);
    };
  }, [meetingCode, user, accessToken]);

  return socketRef.current;
};
