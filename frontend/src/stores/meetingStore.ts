import { create } from "zustand";
import type { MeetingState } from "@/types/meeting";

export const useMeetingStore = create<MeetingState>((set) => ({
  meetingId: null,
  roomId: null,
  isMuted: true,
  isCameraOff: true,
  isScreenSharing: false,
  isChatOpen: true,
  participants: [],
  messages: [],
  typingUsers: [],
  speakingUsers: {},
  localStream: null,
  onlineUsers: [],

  setMeeting: (id) => set({ meetingId: id, roomId: id }),

  setRoomId: (id) => set({ roomId: id }),

  setParticipants: (participants) => set({ participants }),

  addParticipant: (participant) =>
    set((s) => {
      const existingIdx = s.participants.findIndex(
        (p) => p.id === participant.id,
      );
      if (existingIdx !== -1) {
        const updated = [...s.participants];
        updated[existingIdx] = {
          ...updated[existingIdx],
          socketId: participant.socketId,
          name: participant.name,
          isMuted: participant.isMuted,
          isCameraOff: participant.isCameraOff,
          isScreenSharing: participant.isScreenSharing,
        };
        return { participants: updated };
      }
      return { participants: [...s.participants, participant] };
    }),

  removeParticipant: (id) =>
    set((s) => ({
      participants: s.participants.filter((p) => p.id !== id),
      speakingUsers: { ...s.speakingUsers, [id]: false },
    })),

  updateParticipantSocketId: (dbUserId, socketId) =>
    set((s) => ({
      participants: s.participants.map((p) =>
        p.id === dbUserId ? { ...p, socketId } : p,
      ),
    })),

  toggleMic: () => set((s) => ({ isMuted: !s.isMuted })),

  toggleCamera: () => set((s) => ({ isCameraOff: !s.isCameraOff })),

  toggleScreenShare: () =>
    set((s) => ({ isScreenSharing: !s.isScreenSharing })),

  toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),

  sendMessage: (text: string, senderName: string, senderId?: string) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: `m${Date.now()}`,
          senderId: senderId || "unknown",
          senderName,
          text,
          timestamp: new Date(),
        },
      ],
    })),

  setActiveSpeaker: (id) =>
    set((s) => ({
      participants: s.participants.map((p) => ({
        ...p,
        isActiveSpeaker: p.id === id,
      })),
    })),

  setSpeaking: (userId, isSpeaking) =>
    set((s) => {
      if (s.speakingUsers[userId] === isSpeaking) return s;
      return {
        speakingUsers: {
          ...s.speakingUsers,
          [userId]: isSpeaking,
        },
        participants: s.participants.map((p) =>
          p.id === userId ? { ...p, isActiveSpeaker: isSpeaking } : p,
        ),
      };
    }),

  updateParticipantStream: (id, stream) =>
    set((s) => ({
      participants: s.participants.map((p) =>
        p.id === id || p.socketId === id ? { ...p, stream } : p,
      ),
    })),

  updateParticipantMedia: (id, mediaState) =>
    set((s) => ({
      participants: s.participants.map((p) =>
        p.id === id || p.socketId === id ? { ...p, ...mediaState } : p,
      ),
    })),

  setLocalStream: (stream) => set({ localStream: stream }),

  setTypingUser: (user) =>
    set((s) => ({
      typingUsers: s.typingUsers.some((u) => u.id === user.id)
        ? s.typingUsers
        : [...s.typingUsers, user],
    })),

  removeTypingUser: (id) =>
    set((s) => ({
      typingUsers: s.typingUsers.filter((u) => u.id !== id),
    })),

  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),

  addOnlineUser: (userId) =>
    set((s) => ({
      onlineUsers: s.onlineUsers.includes(userId)
        ? s.onlineUsers
        : [...s.onlineUsers, userId],
    })),

  removeOnlineUser: (userId) =>
    set((s) => ({
      onlineUsers: s.onlineUsers.filter((id) => id !== userId),
    })),

  leaveMeeting: () =>
    set({
      meetingId: null,
      roomId: null,
      isMuted: true,
      isCameraOff: true,
      isScreenSharing: false,
      participants: [],
      messages: [],
      typingUsers: [],
      speakingUsers: {},
      localStream: null,
      onlineUsers: [],
    }),

  leaveRoom: () =>
    set({
      roomId: null,
      meetingId: null,
      isMuted: true,
      isCameraOff: true,
      isScreenSharing: false,
      participants: [],
      messages: [],
      typingUsers: [],
      speakingUsers: {},
      localStream: null,
      onlineUsers: [],
    }),
}));
