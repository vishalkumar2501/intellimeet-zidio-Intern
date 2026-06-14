import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { uploadAvatar, updateUsername } from "@/services/profileService";
import { getMyMeetings } from "@/services/meetingService";
import { AppNavbar } from "@/layouts/AppNavbar";
import { ProfilePageSkeleton } from "@/components/skeleton/ProfilePageSkeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Camera,
  Video,
  Users,
  Clock,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Mail,
  ShieldCheck,
  Pencil,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/theme-provider";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme } = useTheme();

  const [usernameInput, setUsernameInput] = useState(user?.username ?? "");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar ?? null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ["my-meetings"],
    queryFn: getMyMeetings,
    enabled: !!user,
    staleTime: 60_000,
  });

  const handleLogout = async () => {
    if (!user || isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const meetingsData = await getMyMeetings();
      const hostActiveMeeting = meetingsData.find((meeting) => {
        const isActive = meeting.status !== "ended";
        const createdByMatches =
          meeting.createdBy?._id === user._id ||
          (!!user.email && meeting.createdBy?.email === user.email);
        return isActive && createdByMatches;
      });

      if (hostActiveMeeting) {
        toast.error("End your active hosted meeting before logging out.", {
          action: {
            label: "Go to meeting",
            onClick: () => navigate(`/room/${hostActiveMeeting.meetingCode}`),
          },
        });
        return;
      }

      await logout();
      navigate("/auth/signin", { replace: true });
    } catch {
      toast.error("Logout failed. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) return null;
  if (meetingsLoading) return <ProfilePageSkeleton />;

  const totalMeetings = meetings.length;
  const totalParticipants = meetings.reduce(
    (s, m) => s + m.participants.length,
    0,
  );
  const thisWeek = meetings.filter(
    (m) => Date.now() - new Date(m.createdAt).getTime() < 7 * 86400000,
  ).length;

  const stats = [
    { label: "Meetings", value: totalMeetings, icon: Video },
    { label: "Participants", value: totalParticipants, icon: Users },
    { label: "This week", value: thisWeek, icon: Clock },
  ];

  const handleSaveUsername = async () => {
    const trimmed = usernameInput.trim();
    if (!trimmed || trimmed === user.username) return;
    setIsSavingUsername(true);
    try {
      await updateUsername(trimmed);
      toast.success("Username updated successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to update username");
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type & size
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    setIsUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file);
      setAvatarPreview(url);
      toast.success("Profile picture updated!");
    } catch (e: any) {
      setAvatarPreview(user.avatar ?? null);
      toast.error(e.message || "Failed to upload picture");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isUsernameChanged =
    usernameInput.trim() !== user.username && usernameInput.trim() !== "";

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">My Profile</h1>
            <p className="text-xs text-muted-foreground">
              Manage your account settings
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Gradient banner */}
          <div className="h-24 sm:h-28 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent relative">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.4) 0%, transparent 60%)",
              }}
            />
          </div>

          <div className="px-5 sm:px-8 pb-6 sm:pb-8">
            {/* Avatar + name row */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-14">
              <div className="relative group w-fit">
                <Avatar className="w-24 h-24 sm:w-28 sm:h-28 border-4 border-card shadow-lg">
                  <AvatarImage
                    src={avatarPreview ?? undefined}
                    alt={user.username}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-2xl sm:text-3xl font-bold bg-primary/10 text-primary">
                    {getInitials(user.username)}
                  </AvatarFallback>
                </Avatar>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label="Change profile picture"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="flex-1 min-w-0 sm:pb-2">
                <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">
                  {user.username}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-primary mt-1">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  <span className="font-medium">Account verified</span>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                disabled={isUploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                className="sm:hidden self-start border-border text-xs gap-1.5 h-8"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                Change Photo
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7 space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Pencil className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Edit Profile
              </h3>
              <p className="text-xs text-muted-foreground">
                Update your display name
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="username-input"
              className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5"
            >
              Username
            </label>
            <div className="flex gap-2">
              <Input
                id="username-input"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveUsername()}
                placeholder="Enter your username"
                className="h-11 bg-background border-border text-sm rounded-xl"
                maxLength={40}
              />
              <Button
                onClick={handleSaveUsername}
                disabled={!isUsernameChanged || isSavingUsername}
                className="h-11 px-4 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 text-xs font-semibold rounded-xl"
              >
                {isSavingUsername ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Save
              </Button>
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">
              Email Address
            </label>
            <div className="h-11 flex items-center px-3 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground gap-2">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{user.email}</span>
              <span className="ml-auto text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                Verified
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground ml-0.5">
              Email cannot be changed
            </p>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            Your Activity
          </h3>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {stats.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2.5">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground leading-none">
                  {value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7 space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                App Settings
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage your preferences
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-foreground">Appearance</p>
                <p className="text-[11px] text-muted-foreground capitalize">
                  Current theme: {theme}
                </p>
              </div>
              <ThemeToggle />
            </div>

            {/* Logout Button */}
            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              variant="outline"
              className="w-full h-12 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive gap-2 font-bold rounded-xl"
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              Sign Out from Account
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProfilePage;
