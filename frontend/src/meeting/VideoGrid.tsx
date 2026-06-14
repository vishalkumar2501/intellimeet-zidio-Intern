import React, { useState, useEffect } from "react";
import { useMeetingStore } from "@/stores/meetingStore";
import VideoTile from "./VideoTile";
import { useAuthStore } from "@/stores/authStore";
import { useAudioDetection } from "@/hooks/useAudioDetection";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CallLayoutType = "grid" | "speaker-left" | "speaker-right";

interface VideoGridProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  registerRemoteVideoRef: (peerId: string, el: HTMLVideoElement | null) => void;
  layout?: CallLayoutType;
}

interface LocalTileProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  username: string;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  className?: string;
}

const LocalTile: React.FC<LocalTileProps> = ({
  videoRef,
  username,
  isCameraOff,
  isScreenSharing,
  isSpeaking,
  className,
}) => (
  <div
    className={cn(
      "relative rounded-2xl overflow-hidden bg-card border-2 transition-all duration-300",
      className || "w-full h-full",
      isSpeaking
        ? "border-primary shadow-[0_0_20px_rgba(var(--primary),0.4)]"
        : "border-border",
    )}
  >
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className={`w-full h-full object-cover ${!isCameraOff || isScreenSharing ? "" : "hidden"}`}
    />
    {isCameraOff && !isScreenSharing && (
      <div className="absolute inset-0 bg-background flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-secondary border border-border flex items-center justify-center text-secondary-foreground text-2xl font-bold select-none shadow-2xl">
          {username?.[0]?.toUpperCase() ?? "U"}
        </div>
      </div>
    )}
    {isSpeaking && (
      <div className="absolute inset-0 rounded-2xl ring-2 ring-primary animate-pulse pointer-events-none" />
    )}
    <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
      <span className="text-white text-sm font-medium">{username} (You)</span>
    </div>
  </div>
);

interface PaginatedGridLayoutProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  registerRemoteVideoRef: (peerId: string, el: HTMLVideoElement | null) => void;
}

function pageSize(total: number): number {
  if (total <= 2) return 2;
  if (total <= 4) return 4;
  if (total <= 6) return 6;
  return 9;
}

const PaginatedGridLayout: React.FC<PaginatedGridLayoutProps> = ({
  localVideoRef,
  registerRemoteVideoRef,
}) => {
  const { participants, isCameraOff, isScreenSharing, speakingUsers } =
    useMeetingStore();
  const { user } = useAuthStore();
  const isLocalSpeaking = speakingUsers[user?._id || "local"];

  type TileItem = { kind: "local" } | { kind: "remote"; participantId: string };

  const allTiles: TileItem[] = [
    { kind: "local" },
    ...participants.map((p) => ({
      kind: "remote" as const,
      participantId: p.id,
    })),
  ];

  const total = allTiles.length;
  const perPage = pageSize(total);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const start = page * perPage;
  const pageTiles = allTiles.slice(start, start + perPage);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Grid area */}
      <div
        className={cn(
          "flex-1 grid gap-2 sm:gap-3 p-2 sm:p-4 auto-rows-fr",
          pageTiles.length === 1
            ? "grid-cols-1"
            : pageTiles.length === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : pageTiles.length <= 4
                ? "grid-cols-2"
                : "grid-cols-2 md:grid-cols-3",
        )}
      >
        {pageTiles.map((tile) => {
          if (tile.kind === "local") {
            return (
              <LocalTile
                key="local"
                videoRef={localVideoRef}
                username={user?.username ?? "You"}
                isCameraOff={isCameraOff}
                isScreenSharing={isScreenSharing}
                isSpeaking={isLocalSpeaking}
                className="w-full h-full"
              />
            );
          }
          const participant = participants.find(
            (p) => p.id === tile.participantId,
          );
          if (!participant) return null;
          return (
            <VideoTile
              key={participant.id}
              participant={participant}
              registerVideoRef={(el) =>
                registerRemoteVideoRef(participant.id, el)
              }
              className="w-full h-full"
            />
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pb-20 shrink-0">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full transition-all border border-border",
              page === 0
                ? "opacity-30 cursor-not-allowed bg-muted/20"
                : "bg-muted/50 hover:bg-muted text-foreground",
            )}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                aria-label={`Page ${i + 1}`}
                className={cn(
                  "rounded-full transition-all",
                  i === page
                    ? "w-5 h-2 bg-primary"
                    : "w-2 h-2 bg-muted-foreground/40 hover:bg-muted-foreground/70",
                )}
              />
            ))}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full transition-all border border-border",
              page === totalPages - 1
                ? "opacity-30 cursor-not-allowed bg-muted/20"
                : "bg-muted/50 hover:bg-muted text-foreground",
            )}
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

const VideoGrid: React.FC<VideoGridProps> = ({
  localVideoRef,
  registerRemoteVideoRef,
  layout = "grid",
}) => {
  const {
    participants,
    isCameraOff,
    isScreenSharing,
    localStream,
    speakingUsers,
  } = useMeetingStore();
  const { user } = useAuthStore();

  const localUserId = user?._id || "local";
  useAudioDetection(localUserId, localStream || undefined);

  const isLocalSpeaking = speakingUsers[localUserId];

  if (participants.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
        <div
          className={cn(
            "relative w-full max-w-3xl aspect-video rounded-2xl overflow-hidden border-2 transition-all duration-300",
            isLocalSpeaking
              ? "border-primary shadow-[0_0_20px_rgba(var(--primary),0.4)]"
              : "border-border",
          )}
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover bg-card ${!isCameraOff || isScreenSharing ? "" : "hidden"}`}
          />
          {isCameraOff && !isScreenSharing && (
            <div className="absolute inset-0 w-full h-full bg-background flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground text-4xl font-bold shadow-xl select-none">
                {user?.username?.[0]?.toUpperCase() ?? "U"}
              </div>
            </div>
          )}
          {isLocalSpeaking && (
            <div className="absolute inset-0 rounded-2xl ring-2 ring-primary animate-pulse pointer-events-none" />
          )}
          <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-card/60 backdrop-blur-md border border-border">
            <span className="text-foreground text-sm font-medium">
              {user?.username} (You)
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-foreground font-medium">
            Waiting for others to join
          </p>
          <p className="text-muted-foreground text-sm">
            Share the meeting code to invite participants
          </p>
          <div className="flex gap-1.5 mt-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (layout === "grid") {
    return (
      <PaginatedGridLayout
        localVideoRef={localVideoRef}
        registerRemoteVideoRef={registerRemoteVideoRef}
      />
    );
  }

  const screenSharingParticipant = participants.find((p) => p.isScreenSharing);

  let spotlightParticipant = screenSharingParticipant;

  if (!spotlightParticipant && !isScreenSharing) {
    const activeSpeakerId =
      Object.entries(speakingUsers).find(
        ([id, speaking]) => speaking && id !== localUserId,
      )?.[0] ?? participants[0]?.id;

    spotlightParticipant = participants.find((p) => p.id === activeSpeakerId);
  }

  const stripParticipants = participants.filter(
    (p) => p.id !== spotlightParticipant?.id,
  );

  const Strip = (
    <div
      className={cn(
        "flex lg:flex-col gap-2 p-2 overflow-x-auto lg:overflow-y-auto shrink-0 no-scrollbar bg-black/20 backdrop-blur-sm",
        "w-full lg:w-52 h-32 lg:h-full",
      )}
    >
      <LocalTile
        videoRef={localVideoRef}
        username={user?.username ?? "You"}
        isCameraOff={isCameraOff}
        isScreenSharing={isScreenSharing}
        isSpeaking={isLocalSpeaking}
        className="shrink-0 w-48 lg:w-full aspect-[7/5]"
      />
      {stripParticipants.map((p) => (
        <VideoTile
          key={p.id}
          participant={p}
          registerVideoRef={(el) => registerRemoteVideoRef(p.id, el)}
          className="shrink-0 w-48 lg:w-full aspect-[7/4.5]"
        />
      ))}
    </div>
  );

  const Spotlight = (
    <div className="flex-1 p-2 sm:p-3 overflow-hidden">
      {spotlightParticipant ? (
        <VideoTile
          participant={spotlightParticipant}
          registerVideoRef={(el) =>
            registerRemoteVideoRef(spotlightParticipant.id, el)
          }
          className="w-full h-full"
        />
      ) : (
        <div className="relative w-full h-full rounded-2xl overflow-hidden bg-card border-2 border-border">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${!isCameraOff || isScreenSharing ? "" : "hidden"}`}
          />
          {isCameraOff && !isScreenSharing && (
            <div className="absolute inset-0 bg-background flex items-center justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-secondary flex items-center justify-center text-2xl sm:text-3xl font-bold select-none">
                {user?.username?.[0]?.toUpperCase() ?? "U"}
              </div>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2 sm:px-4 sm:py-3 bg-gradient-to-t from-black/80 to-transparent">
            <span className="text-white text-xs sm:text-sm font-medium">
              {user?.username} (You)
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {layout === "speaker-left" ? (
        <>
          {Strip}
          {Spotlight}
        </>
      ) : (
        <>
          {Spotlight}
          {Strip}
        </>
      )}
    </div>
  );
};

export default VideoGrid;
