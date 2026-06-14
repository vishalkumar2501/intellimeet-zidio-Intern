import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMeetingStore } from "@/stores/meetingStore";
import { useAuthStore } from "@/stores/authStore";
import {
  getChatHistory,
  type ChatMessage as ApiChatMessage,
} from "@/services/chatService";
import type { Socket } from "socket.io-client";
import { Send, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface ChatPanelProps {
  socket: Socket;
  meetingCode: string;
}

const formatTime = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const ChatPanel: React.FC<ChatPanelProps> = ({ socket, meetingCode }) => {
  const { user } = useAuthStore();
  const {
    messages,
    sendMessage,
    isChatOpen,
    typingUsers,
    setTypingUser,
    removeTypingUser,
  } = useMeetingStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: history, isLoading } = useQuery<ApiChatMessage[]>({
    queryKey: ["chat-history", meetingCode],
    queryFn: () => getChatHistory(meetingCode),
    enabled: !!user && !!meetingCode,
    staleTime: 60_000,
  });

  const allMessages = useMemo(() => {
    const historical = (history || []).map((h) => ({
      id: h._id,
      senderId: h.sender._id,
      senderName: h.sender.name,
      text: h.content,
      timestamp: new Date(h.timestamp),
    }));

    const realtime = messages.filter((m) => {
      return !historical.some(
        (h) =>
          h.text === m.text &&
          h.senderId === m.senderId &&
          Math.abs(h.timestamp.getTime() - new Date(m.timestamp).getTime()) <
            5000,
      );
    });

    return [...historical, ...realtime].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }, [history, messages]);

  useEffect(() => {
    const handleNewMessage = (msg: {
      content: string;
      sender: { _id: string; name: string };
      timestamp: string;
    }) => {
      sendMessage(msg.content, msg.sender.name, msg.sender._id);
      removeTypingUser(msg.sender._id); // Stop typing when message received
    };

    const handleUserTyping = ({
      userId,
      userName,
    }: {
      userId: string;
      userName: string;
    }) => {
      setTypingUser({ id: userId, name: userName });
    };

    const handleUserStopTyping = ({ userId }: { userId: string }) => {
      removeTypingUser(userId);
    };

    const handleUserDisconnected = (userId: string) => {
      removeTypingUser(userId);
    };

    socket.on("new-message", handleNewMessage);
    socket.on("user-typing", handleUserTyping);
    socket.on("user-stop-typing", handleUserStopTyping);
    socket.on("user-disconnected", handleUserDisconnected);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stop-typing", handleUserStopTyping);
      socket.off("user-disconnected", handleUserDisconnected);
    };
  }, [socket, user, sendMessage, setTypingUser, removeTypingUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, history]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !user) return;

    socket.emit("send-message", {
      meetingCode,
      message: text,
      senderId: user._id,
      senderName: user.username,
      senderAvatar: "",
    });

    socket.emit("stop-typing", { meetingCode, userId: user._id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    setInput("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    if (!user) return;

    if (value.trim()) {
      socket.emit("typing", {
        meetingCode,
        userId: user._id,
        userName: user.username,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop-typing", { meetingCode, userId: user._id });
      }, 1000);
    } else {
      socket.emit("stop-typing", { meetingCode, userId: user._id });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isChatOpen) return null;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-primary/10 backdrop-blur-3xl">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 bg-card/20 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            In-call messages
          </h3>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="size-6 text-primary" />
          </div>
        ) : (
          <>
            {allMessages.map((msg) => {
              const isMe = msg.senderId === user?._id;
              return (
                <MessageBubble
                  key={msg.id}
                  name={msg.senderName}
                  text={msg.text}
                  time={msg.timestamp}
                  isMe={isMe}
                />
              );
            })}

            {allMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm font-medium">
                  No messages yet
                </p>
                <p className="text-muted-foreground/60 text-xs">
                  Start the conversation below
                </p>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 py-3 border-t border-white/5 bg-card/30">
        <div className="h-4 mb-1">
          {typingUsers.length > 0 && (
            <p className="text-[10px] text-primary font-medium animate-pulse italic">
              {typingUsers.length === 1
                ? `${typingUsers[0].name} is typing...`
                : `${typingUsers.map((u) => u.name).join(", ")} are typing...`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            className="flex-1 bg-muted/20 border-border text-sm h-9 rounded-xl"
          />
          <Button
            size="icon-sm"
            onClick={handleSend}
            disabled={!input.trim()}
            className={cn(
              "rounded-xl transition-all duration-200",
              input.trim()
                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                : "bg-muted text-muted-foreground cursor-not-allowed border border-border",
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Messages are only visible during this meeting
        </p>
      </div>
    </div>
  );
};

interface MessageBubbleProps {
  name: string;
  text: string;
  time: Date | string;
  isMe: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  name,
  text,
  time,
  isMe,
}) => (
  <div
    className={cn("flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}
  >
    {!isMe && (
      <span className="text-[10px] text-muted-foreground font-medium px-1">
        {name}
      </span>
    )}
    <div
      className={cn(
        "max-w-[85%] rounded-2xl px-3 py-2 text-sm wrap-break-words break-all whitespace-pre-wrap",
        isMe
          ? "bg-primary text-primary-foreground rounded-br-sm shadow-sm"
          : "bg-muted/40 text-foreground rounded-bl-sm border border-border",
      )}
    >
      {text}
    </div>
    <span className="text-[10px] text-muted-foreground/60 px-1">
      {formatTime(time)}
    </span>
  </div>
);

export default ChatPanel;
