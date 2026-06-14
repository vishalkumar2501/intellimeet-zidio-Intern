import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AppLogoImg from "@/assets/AppLogo.png";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

export const AppNavbar = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <nav className="h-16 border-b border-border bg-background sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
          onClick={() => navigate("/dashboard")}
        >
          <img
            src={AppLogoImg}
            alt="IntellMeet"
            className="h-18 w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 rounded-full hover:bg-muted pl-1 pr-3 py-1 transition-colors outline-hidden border border-transparent hover:border-border/50"
          >
            <Avatar className="w-8 h-8 border border-border">
              {user.avatar && (
                <AvatarImage src={user.avatar} alt={user.username} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left mr-1">
              <p className="text-xs font-bold text-foreground leading-none">
                {user.username.split(" ")[0]}
              </p>
            </div>
          </button>
        </div>
      </div>
    </nav>
  );
};
