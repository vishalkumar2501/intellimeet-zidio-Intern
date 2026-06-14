import React from "react";
import { useMeetingStore } from "@/stores/meetingStore";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  LayoutGrid,
  PanelLeft,
  PanelRight,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Users,
  Circle,
  Square,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { CallLayoutType } from "./VideoGrid";
import { Separator } from "@/components/ui/separator";

interface ControlsBarProps {
  onLeave: () => void;
  onScreenShare: () => Promise<any>;
  onStopScreenShare?: () => void;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onStartRecording?: () => Promise<void> | void;
  onStopRecording?: () => Promise<void> | void;
  isRecording?: boolean;
  isUploading?: boolean;
  isHost?: boolean;
  className?: string;
  layout?: CallLayoutType;
  onLayoutChange?: (layout: CallLayoutType) => void;
  meetingTitle?: string;
  participantCount?: number;
  meetingCode?: string;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onCopyCode?: () => void;
  isCopied?: boolean;
}

const layoutMeta: Record<
  CallLayoutType,
  { icon: React.ReactNode; label: string; next: CallLayoutType }
> = {
  grid: {
    icon: <LayoutGrid className="w-5 h-5" />,
    label: "Grid layout",
    next: "speaker-left",
  },
  "speaker-left": {
    icon: <PanelLeft className="w-5 h-5" />,
    label: "Speaker left",
    next: "speaker-right",
  },
  "speaker-right": {
    icon: <PanelRight className="w-5 h-5" />,
    label: "Speaker right",
    next: "grid",
  },
};

const ControlsBar: React.FC<ControlsBarProps> = ({
  onLeave,
  onScreenShare,
  onStopScreenShare,
  onToggleMic,
  onToggleCamera,
  onStartRecording,
  onStopRecording,
  isRecording = false,
  isUploading = false,
  isHost = false,
  className,
  layout = "grid",
  onLayoutChange,
  meetingTitle,
  participantCount = 0,
  meetingCode,
  isSidebarOpen,
  onToggleSidebar,
  onCopyCode,
  isCopied,
}) => {
  const {
    isMuted,
    isCameraOff,
    isScreenSharing,
    participants,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
  } = useMeetingStore();

  const handleToggleMic = onToggleMic ?? toggleMic;
  const handleToggleCamera = onToggleCamera ?? toggleCamera;

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      await onStopScreenShare?.();
      toggleScreenShare();
    } else {
      const isSomeoneElseSharing = participants.some((p) => p.isScreenSharing);
      if (isSomeoneElseSharing) {
        toast.error("Someone else is already sharing their screen");
        return;
      }
      try {
        const stream = await onScreenShare();
        if (stream) {
          toggleScreenShare();
        }
      } catch (err) {
        console.warn("Screen share cancelled or failed");
      }
    }
  };

  const handleLayoutChange = () => {
    const next = layoutMeta[layout].next;
    onLayoutChange?.(next);
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      if (onStopRecording) await onStopRecording();
    } else {
      if (onStartRecording) await onStartRecording();
    }
  };

  const currentMeta = layoutMeta[layout];

  return (
    <div
      className={cn(
        "w-full px-2 sm:px-4 z-50 pointer-events-none",
        className,
      )}
    >
      <div className="w-full flex items-center pointer-events-auto relative">
        {/* Left: Meeting Details (Hidden on mobile) */}
        <div className="hidden md:flex flex-1 items-center justify-start">
          <div className="flex items-center gap-4 px-4 py-2 rounded-2xl bg-card/40 backdrop-blur-2xl border border-white/10 shadow-2xl min-w-fit">
            <div className="flex flex-col">
              <p className="text-white text-sm font-bold truncate max-w-[120px] lg:max-w-[200px]">
                {meetingTitle ?? "Meeting"}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                <Users className="w-3 h-3" />
                <span>
                  {participantCount} {participantCount === 1 ? "User" : "Users"}
                </span>
              </div>
            </div>

            <Separator orientation="vertical" className="h-8 bg-white/10" />

            {meetingCode && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onCopyCode}
                    className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground">
                      {meetingCode}
                    </span>
                    {isCopied ? (
                      <Check className="w-3 h-3 text-primary" />
                    ) : (
                      <Copy className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Copy code</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Mobile Placeholder for Left */}
        <div className="flex md:hidden flex-1" />

        {/* Center: Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-2xl bg-card/60 sm:bg-card/40 backdrop-blur-2xl border border-white/10 shadow-2xl shrink-0">
          {/* Mic */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleToggleMic}
                size="icon"
                className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-all border border-white/10",
                  isMuted
                    ? "bg-destructive/80 hover:bg-destructive text-destructive-foreground"
                    : "bg-muted/50 hover:bg-muted text-foreground",
                )}
              >
                {isMuted ? (
                  <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isMuted ? "Unmute" : "Mute"}
            </TooltipContent>
          </Tooltip>

          {/* Camera */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleToggleCamera}
                size="icon"
                className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-all border border-white/10",
                  isCameraOff
                    ? "bg-destructive/80 hover:bg-destructive text-destructive-foreground"
                    : "bg-muted/50 hover:bg-muted text-foreground",
                )}
              >
                {isCameraOff ? (
                  <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isCameraOff ? "Turn on camera" : "Turn off camera"}
            </TooltipContent>
          </Tooltip>

          {/* Screen share (Hidden on very small mobile) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleScreenShare}
                size="icon"
                className={cn(
                  "flex w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-all border border-white/10",
                  isScreenSharing
                    ? "bg-primary/80 hover:bg-primary text-primary-foreground"
                    : "bg-muted/50 hover:bg-muted text-foreground",
                )}
              >
                {isScreenSharing ? (
                  <MonitorOff className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isScreenSharing ? "Stop sharing" : "Share screen"}
            </TooltipContent>
          </Tooltip>

          {/* Recording (Host only) */}
          {isHost && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleRecordToggle}
                  disabled={isUploading}
                  size="icon"
                  className={cn(
                    "flex w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-all border border-white/10",
                    isRecording
                      ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      : "bg-muted/50 hover:bg-muted text-foreground",
                  )}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  ) : isRecording ? (
                    <Square className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
                  ) : (
                    <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" fill="currentColor" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isUploading
                  ? "Uploading recording..."
                  : isRecording
                    ? "Stop recording"
                    : "Start recording"}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Layout toggle (Hidden on mobile) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleLayoutChange}
                size="icon"
                className="hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-all border border-white/10 bg-muted/50 hover:bg-muted text-foreground"
                aria-label={`Switch layout — current: ${currentMeta.label}`}
              >
                {currentMeta.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{currentMeta.label}</TooltipContent>
          </Tooltip>

          <div className="hidden sm:block w-px h-6 bg-white/10 mx-1" />

          {/* Leave / End */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onLeave}
                className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 sm:px-4 h-10 sm:h-12 border border-white/10"
              >
                <PhoneOff className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline font-bold text-xs uppercase tracking-tight">
                  {isHost ? "End Meeting" : "Leave"}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-destructive text-destructive-foreground border-none"
            >
              {isHost ? "End meeting for everyone" : "Leave meeting"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Right: Sidebar Toggle */}
        <div className="flex flex-1 items-center justify-end">
          <div className="flex items-center px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-2xl bg-card/60 sm:bg-card/40 backdrop-blur-2xl border border-white/10 shadow-2xl">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onToggleSidebar}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-all",
                    isSidebarOpen
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                  )}
                >
                  {isSidebarOpen ? (
                    <ChevronRight className="w-5 h-5" />
                  ) : (
                    <ChevronLeft className="w-5 h-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isSidebarOpen ? "Hide panel" : "Show panel"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlsBar;
