import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createMeeting,
  getMyMeetings,
  joinMeeting,
  type MeetingData,
} from "../services/meetingService";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Video,
  Plus,
  Link2,
  Copy,
  ChevronDown,
  Clock,
  Users,
  Calendar,
  ArrowRight,
  Loader2,
  VideoOff,
  RefreshCw,
  Zap,
  LayoutGrid,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useSocket } from "@/hooks/useSocket";
import { AppNavbar } from "../layouts/AppNavbar";

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days === 0)
    return `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  if (days === 1)
    return `Yesterday, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const formatDuration = (start: string, end?: string) => {
  if (!end) return null;
  const mins = Math.floor(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000,
  );
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const statusConfig = {
  ongoing: {
    label: "Live",
    class:
      "border-primary/50 text-primary bg-primary/5 shadow-[0_0_15px_rgba(var(--primary),0.15)] font-bold animate-[pulse_3s_infinite]",
    dot: "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]",
  },
  scheduled: {
    label: "Scheduled",
    class:
      "border-primary/50 text-primary/50 bg-primary/5 shadow-[0_0_15px_rgba(var(--primary),0.15)] font-bold",
    dot: "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]",
  },
  ended: {
    label: "Ended",
    class: "border-muted text-muted-foreground bg-transparent font-bold",
    dot: "bg-muted",
  },
} as const;

const Homepage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [joinCode, setJoinCode] = useState("");
  const [joiningCode, setJoiningCode] = useState<string | null>(null);
  const [createdMeeting, setCreatedMeeting] = useState<MeetingData | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [roomsExpanded, setRoomsExpanded] = useState(true);
  const joinInputRef = useRef<HTMLInputElement>(null);

  const {
    data: meetings = [],
    isLoading: meetingsLoading,
    isFetching,
    refetch,
  } = useQuery<MeetingData[]>({
    queryKey: ["my-meetings"],
    queryFn: () => getMyMeetings(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      qc.invalidateQueries({ queryKey: ["my-meetings"] });
    };
    socket.on("meetings-updated", handleUpdate);
    return () => {
      socket.off("meetings-updated", handleUpdate);
    };
  }, [socket, qc]);

  const createMutation = useMutation({
    mutationFn: ({
      title,
    }: {
      title: string;
      instant: boolean;
    }) => createMeeting(title),
    onSuccess: (meeting, { instant }) => {
      qc.invalidateQueries({ queryKey: ["my-meetings"] });
      toast.success("Meeting created successfully");
      if (instant) {
        navigate(`/room/${meeting.meetingCode}`);
      } else {
        setCreatedMeeting(meeting);
        setDialogOpen(true);
      }
    },
    onError: (e: Error) => toast.error(e.message || "Could not create meeting"),
  });

  const handleCreateMeeting = (instant = false) => {
    const title =
      meetingTitle.trim() ||
      (user ? `${user.username}'s Meeting` : "Instant Meeting");
    createMutation.mutate({
      title,
      instant,
    });
  };

  const handleJoinMeeting = async (
    codeOverride?: string | React.MouseEvent,
  ) => {
    let code = (
      typeof codeOverride === "string" ? codeOverride : joinCode
    ).trim();

    if (!code) {
      toast.error("Enter a meeting code or link");
      joinInputRef.current?.focus();
      return;
    }

    if (code.includes("/room/")) {
      try {
        const url = new URL(code);
        const parts = url.pathname.split("/");
        code = parts[parts.length - 1] || code;
      } catch {
        code = code.split("/room/").pop()?.split(/[?#]/)[0] ?? code;
      }
    }

    setJoiningCode(code);
    try {
      await joinMeeting(code);
      navigate(`/room/${code}`);
    } catch (e: any) {
      setJoiningCode(null);
      if (e.activeCode) {
        toast.error(e.message, {
          action: {
            label: "Copy Own Code",
            onClick: () => {
              navigator.clipboard.writeText(e.activeCode);
              toast.success("Code copied!");
            },
          },
        });
      } else {
        toast.error(e.message || "Failed to join meeting");
      }
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const isCreating = createMutation.isPending;
  const activeRooms = meetings.filter((m) => m.status !== "ended");

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back,{" "}
            <span className="text-muted-foreground">{user.username}</span> 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Start or join a secure video meeting
          </p>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Quick Join */}
          <div className="rounded-3xl border border-border bg-card p-6 flex flex-col gap-5 hover:border-primary/30 transition-all shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">
                  Quick Join
                </p>
                <p className="text-xs text-muted-foreground">
                  Paste a code or link instantly
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter code or link..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinMeeting()}
                className="h-11 text-sm bg-background border-border rounded-xl"
              />
              <Button
                onClick={() => handleJoinMeeting()}
                disabled={!joinCode.trim() || !!joiningCode}
                className="h-11 px-5 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm font-bold rounded-xl"
              >
                {joiningCode ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Join <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Create Meeting */}
          <div className="rounded-3xl border border-border bg-card p-6 flex flex-col gap-5 hover:border-primary/30 transition-all shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">
                  Create Meeting
                </p>
                <p className="text-xs text-muted-foreground">
                  Start a new room instantly
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                placeholder={`Meeting Title (Optional)`}
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="h-10 text-xs bg-background border-border rounded-xl"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handleCreateMeeting(true)}
                  disabled={isCreating}
                  className="flex-1 h-11 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-2 rounded-xl"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Video className="w-4 h-4" /> Start Now
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleCreateMeeting(false)}
                  disabled={isCreating}
                  variant="outline"
                  className="flex-1 h-11 text-sm font-bold border-border gap-2 rounded-xl hover:bg-muted"
                >
                  <Link2 className="w-4 h-4" /> Get Link
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setRoomsExpanded((v) => !v)}
          >
            <h2 className="font-semibold text-foreground text-base flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-primary" />
              Meeting Rooms
              <Badge
                variant="outline"
                className="text-xs border-primary/20 text-primary bg-primary/5 font-mono ml-1"
              >
                {activeRooms.length} active
              </Badge>
            </h2>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                roomsExpanded ? "rotate-180" : ""
              }`}
            />
          </button>

          {roomsExpanded && (
            <>
              {meetingsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={i}
                      className="h-24 rounded-xl bg-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : activeRooms.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-border rounded-2xl bg-muted/20">
                  <VideoOff className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    No active rooms
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Create a meeting above to get started
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeRooms.slice(0, 6).map((m) => {
                    const isHost = m.createdBy?._id === user?._id;
                    const cfg =
                      statusConfig[m.status as keyof typeof statusConfig] ??
                      statusConfig.scheduled;
                    return (
                      <div
                        key={m._id}
                        className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 hover:border-primary/20 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {m.title}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              {m.meetingCode}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs py-0 h-5 shrink-0 flex items-center gap-1 ${cfg.class}`}
                          >
                            {m.status === "ongoing" && (
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse inline-block`}
                              />
                            )}
                            {cfg.label}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {m.participants.length}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-xs h-5 py-0 ${
                                isHost
                                  ? "text-primary bg-primary/10 border-primary/20"
                                  : "text-muted-foreground bg-muted border-border"
                              }`}
                            >
                              {isHost ? "Host" : "Member"}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleJoinMeeting(m.meetingCode)}
                            disabled={!!joiningCode}
                            className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            {joiningCode === m.meetingCode ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : m.status === "ongoing" ? (
                              "Join Live"
                            ) : (
                              "Join"
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>

        {/* Your Meetings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground text-base">
              Your Meetings
            </h2>
            <div className="flex items-center gap-3">
              {meetings.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {meetings.length} total
                </span>
              )}
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh meetings"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {meetingsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-14 border border-dashed border-border rounded-2xl bg-muted/20">
              <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
                <VideoOff className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No meetings yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Create one above to get started
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border">
              {[...meetings]
                .sort((a, b) => {
                  const order = { ongoing: 0, scheduled: 1, ended: 2 };
                  return (
                    (order[a.status as keyof typeof order] ?? 3) -
                    (order[b.status as keyof typeof order] ?? 3)
                  );
                })
                .slice(0, 8)
                .map((m) => {
                  const cfg =
                    statusConfig[m.status as keyof typeof statusConfig] ??
                    statusConfig.ended;
                  const isHost = m.createdBy?._id === user?._id;
                  const duration =
                    m.status === "ended"
                      ? formatDuration(m.createdAt, m.endTime)
                      : null;
                  return (
                    <div
                      key={m._id}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <Video className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {m.title}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {m.meetingCode}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 ml-4">
                        <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {m.participants.length}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(m.createdAt)}
                          </span>
                          {duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {duration}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-xs h-5 py-0 border-primary/20 ${
                              isHost
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground bg-muted border-border"
                            }`}
                          >
                            {isHost ? "Host" : "Member"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs py-0 h-5 flex items-center gap-1 ${cfg.class}`}
                          >
                            {m.status === "ongoing" && (
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse inline-block`}
                              />
                            )}
                            {cfg.label}
                          </Badge>
                        </div>

                        {m.recordingUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(m.recordingUrl, "_blank")}
                            className="h-7 px-3 text-xs border-primary/20 text-primary hover:bg-primary/10"
                          >
                            <Video className="w-3 h-3 mr-1" />
                            Recording
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleJoinMeeting(m.meetingCode)}
                          disabled={m.status === "ended" || !!joiningCode}
                          className={`h-7 px-3 text-xs ${
                            m.status === "ended"
                              ? "bg-muted text-muted-foreground cursor-not-allowed"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                          }`}
                        >
                          {joiningCode === m.meetingCode ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : m.status === "ended" ? (
                            "Ended"
                          ) : m.status === "ongoing" ? (
                            "Join Live"
                          ) : (
                            "Join"
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Meetings", value: meetings.length, icon: Video },
            {
              label: "Participants",
              value: meetings.reduce((s, m) => s + m.participants.length, 0),
              icon: Users,
            },
            {
              label: "This week",
              value: meetings.filter(
                (m) =>
                  Date.now() - new Date(m.createdAt).getTime() < 7 * 86400000,
              ).length,
              icon: Clock,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Link2 className="w-3.5 h-3.5 text-primary" />
              </div>
              Meeting link is ready
            </DialogTitle>
          </DialogHeader>
          {createdMeeting && (
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                Share this code with people you want to meet with.
              </p>
              <div className="flex items-center justify-between bg-muted/50 border border-border rounded-xl px-4 py-3">
                <span className="font-mono text-base font-semibold text-foreground tracking-widest">
                  {createdMeeting.meetingCode}
                </span>
                <button
                  onClick={() => copyCode(createdMeeting.meetingCode)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/90 font-medium transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 border-border text-foreground hover:bg-muted"
                  onClick={() => setDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                  onClick={() => {
                    setDialogOpen(false);
                    navigate(`/room/${createdMeeting.meetingCode}`);
                  }}
                >
                  <Video className="w-4 h-4" /> Start now
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Homepage;
