import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Button } from "../components/ui/button";
import { ArrowRight, Mail } from "lucide-react";
import "./AuthPage.css";
import { toast } from "sonner";
import { useAuthStore } from "../stores/authStore";
import AppLogoImg from "../assets/AppLogo.png";

type AuthMode = "signin" | "signup";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const AuthPage = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const [searchParams, setSearchParams] = useSearchParams();
  const { mode: modeParam } = useParams<{ mode: AuthMode }>();
  const navigate = useNavigate();
  const mode: AuthMode = modeParam === "signup" ? "signup" : "signin";
  const oauthToken = searchParams.get("token");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLabel = useMemo(
    () => (mode === "signin" ? "Sign In" : "Create Account"),
    [mode],
  );

  useEffect(() => {
    if (modeParam !== "signin" && modeParam !== "signup") {
      navigate("/auth/signin", { replace: true });
    }
  }, [modeParam, navigate]);

  const googleAuthProcessed = useRef(false);
  useEffect(() => {
    const completeGoogleAuth = async () => {
      if (!oauthToken || googleAuthProcessed.current) return;
      googleAuthProcessed.current = true;

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${oauthToken}` },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Google login failed");
        }

        const user = await response.json();
        setAuth(
          {
            _id: user._id,
            username: user.name || user.username || "User",
            email: user.email || "",
          },
          oauthToken,
        );
        toast.success("Signed in with Google");

        const params = new URLSearchParams(searchParams);
        params.delete("token");
        setSearchParams(params, { replace: true });

        navigate("/dashboard", { replace: true });
      } catch {
        toast.error("Could not complete Google sign in");
        navigate("/auth/signin", { replace: true });
      }
    };

    completeGoogleAuth();
  }, [oauthToken, navigate, searchParams, setSearchParams, setAuth]);

  const toggleMode = (newMode: "signin" | "signup") => {
    navigate(`/auth/${newMode}`);
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === "signup" && !fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!email.trim() || !password.trim()) {
      toast.error("Email and password are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = mode === "signup" ? "signup" : "login";
      const payload =
        mode === "signup"
          ? { name: fullName.trim(), email: email.trim(), password }
          : { email: email.trim(), password };

      const response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      setAuth(
        {
          _id: data._id,
          username: data.name || fullName || "User",
          email: data.email || email,
        },
        data.accessToken,
      );
      toast.success(
        mode === "signin" ? "Welcome back!" : "Account created successfully",
      );
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      <div className="flex flex-col justify-center px-12 lg:px-24 auth-left-column text-white relative overflow-hidden">
        <div className="auth-orbits-container">
          <div className="orbit-ring orbit-ring-1">
            <div className="orbit-dot orbit-dot-1" />
          </div>
          <div className="orbit-ring orbit-ring-2">
            <div className="orbit-dot orbit-dot-2-top" />
            <div className="orbit-dot orbit-dot-2-bottom" />
          </div>
          <div className="orbit-ring orbit-ring-3">
            <div className="orbit-dot orbit-dot-3-top" />
            <div className="absolute top-[25%] right-[-4px] w-[6px] h-[6px] rounded-full bg-[#10b981]/40" />
          </div>
          <div className="center-glow-dot" />
        </div>

        <svg
          className="auth-wave auth-wave-3"
          viewBox="0 0 800 80"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,40 C100,10 200,70 300,40 C400,10 500,70 600,40 C700,10 750,60 800,40 L800,80 L0,80 Z"
            fill="#10b981"
          />
        </svg>
        <svg
          className="auth-wave auth-wave-2"
          viewBox="0 0 800 80"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,50 C120,20 240,70 360,45 C480,20 600,65 800,35 L800,80 L0,80 Z"
            fill="#10b981"
          />
        </svg>

        <svg
          className="auth-wave auth-wave-1"
          viewBox="0 0 800 80"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,30 C80,60 200,10 320,40 C440,70 560,15 700,45 C740,55 770,50 800,40 L800,80 L0,80 Z"
            fill="#10b981"
          />
        </svg>

        <Link
          to="/"
          className="flex items-center select-none gap-3 mb-4 hover:opacity-80 transition-opacity auth-content-zIndex"
        >
          <img src={AppLogoImg} alt="IntellMeet" className="h-24 w-auto" />
        </Link>

        <div className="max-w-md auth-content-zIndex">
          <div className="space-y-1 mb-8 slogan-font">
            <h1 className="text-7xl font-extrabold leading-[1.1] tracking-tighter">
              Meet
            </h1>
            <h1 className="text-7xl font-extrabold leading-[1.1] tracking-tighter">
              smarter.
            </h1>
            <h1 className="text-7xl font-extrabold leading-[1.1] tracking-tighter text-[#10b981]">
              Think
            </h1>
            <h1 className="text-7xl font-extrabold leading-[1.1] tracking-tighter text-[#10b981]">
              together.
            </h1>
          </div>
          <p className="text-lg text-muted-foreground font-medium leading-relaxed max-w-sm">
            AI-powered collaboration that transcribes, summarizes, and turns
            your meetings into action automatically.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center items-center px-6 py-12 bg-muted">
        <div className="w-full max-w-md bg-card p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-border">
          <div className="flex bg-muted p-1.5 rounded-2xl mb-10">
            <button
              onClick={() => toggleMode("signin")}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${mode === "signin" ? "bg-background text-foreground shadow-lg" : "text-muted-foreground hover:text-foreground font-semibold"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => toggleMode("signup")}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${mode === "signup" ? "bg-background text-foreground shadow-lg" : "text-muted-foreground hover:text-foreground font-semibold"}`}
            >
              Sign Up
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground block px-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full px-4 py-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-sm font-medium"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground block px-1">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full px-4 py-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-sm font-medium pr-12"
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground block px-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder={
                    mode === "signin"
                      ? "Enter your password"
                      : "Create a password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full px-4 py-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-sm font-medium"
                />
              </div>
            </div>

            <Button
              size="lg"
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base flex items-center justify-center gap-2 group shadow-xl shadow-primary/10 transition-all active:scale-[0.98]"
            >
              {isSubmitting ? "Please wait..." : submitLabel}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-4 text-muted-foreground font-bold tracking-widest text-[10px]">
                or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="lg"
            onClick={handleGoogleLogin}
            className="w-full h-14 rounded-2xl border-border bg-background hover:bg-muted/50 flex items-center justify-center gap-3 font-bold text-foreground transition-all shadow-sm active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
};
