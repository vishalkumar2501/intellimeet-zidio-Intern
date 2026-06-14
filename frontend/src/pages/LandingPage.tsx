import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Phone,
  Users,
  MessageSquare,
  Folder,
  MapPin,
  Share2,
  Puzzle,
  ShieldCheck,
} from "lucide-react";

import heroBg from "../assets/landingImages/hero_abstract_bg.png";
import AppLogoImg from "../assets/AppLogo.png";
import mainAvatar from "../assets/landingImages/professional_avatar_main.png";
import avatar1 from "../assets/landingImages/diverse_avatar_1.png";
import avatar2 from "../assets/landingImages/diverse_avatar_2.png";
import avatar3 from "../assets/landingImages/diverse_avatar_3.png";
import avatar4 from "../assets/landingImages/diverse_avatar_4.png";
import avatar5 from "../assets/landingImages/diverse_avatar_5.jpg";

export const Navbar = () => {
  const navigate = useNavigate();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <img src={AppLogoImg} alt="IntellMeet" className="h-20 w-auto" />
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Contact
            </a>
            <Button
              size="sm"
              onClick={() => navigate("/auth/signup")}
              className="rounded-full px-6 bg-gray-900 hover:bg-gray-800 text-white"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export const Hero = () => {
  const navigate = useNavigate();
  return (
    <section className="relative pt-20 pb-16 overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden select-none">
        <img
          src={heroBg}
          alt="Background"
          className="w-full h-full object-cover opacity-60 scale-105"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-12 select-none">
        <div className="relative inline-block mb-12">
          <div className="relative z-10 w-44 h-44 md:w-52 md:h-52 rounded-full border-[2px] shadow-2xl overflow-hidden ring-4 ring-primary/10">
            <img
              src={mainAvatar}
              alt="Main Host"
              className="w-full h-full object-cover"
            />
          </div>

          <div
            className="absolute -top-6 -left-12 w-16 h-16 rounded-full border-1 shadow-xl overflow-hidden animate-bounce"
            style={{ animationDuration: "3s" }}
          >
            <img
              src={avatar1}
              alt="Participant"
              className="w-full h-full object-cover"
            />
          </div>
          <div
            className="absolute top-1/4 -right-14 w-20 h-20 rounded-full border-1 shadow-xl overflow-hidden animate-bounce"
            style={{ animationDuration: "4s" }}
          >
            <img
              src={avatar2}
              alt="Participant"
              className="w-full h-full object-cover"
            />
          </div>
          <div
            className="absolute -bottom-10 right-2 w-14 h-14 rounded-full border-1 shadow-xl overflow-hidden animate-bounce"
            style={{ animationDuration: "3.5s" }}
          >
            <img
              src={avatar5}
              alt="Participant"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="absolute top-1/2 -left-48 hidden xl:flex flex-col gap-3">
            <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-2xl border border-gray-200 flex flex-col items-start gap-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                Business strategy review
              </p>
              <p className="text-xs font-semibold text-gray-900">
                6:00 PM - 9:00 PM, Today
              </p>
            </div>
          </div>

          <div className="absolute top-1/4 -right-44 hidden xl:flex gap-2">
            <div className="bg-primary/90 text-primary-foreground p-2.5 rounded-xl shadow-lg flex items-center gap-2">
              <Users className="w-4 h-4" />
            </div>
            <div className="bg-destructive/90 text-destructive-foreground p-2.5 rounded-xl shadow-lg">
              <Phone className="w-4 h-4" />
            </div>
          </div>
        </div>

        <h1 className="text-6xl md:text-7xl font-bold text-gray-900 tracking-tight mb-8">
          Online meetings
        </h1>
        <p className="max-w-xl mx-auto text-sm md:text-base text-gray-600 mb-10 leading-relaxed font-medium">
          Work from anywhere with the conferencing and communications
          capabilities of online meeting software.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button
            size="lg"
            onClick={() => navigate("/auth/signup")}
            className="rounded-none bg-gray-900 hover:bg-gray-800 px-12 h-14 text-white text-base font-medium"
          >
            Sign up for free
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/auth/signin")}
            className="rounded-none border-gray-300 text-gray-900 hover:text-gray-900 hover:bg-gray-400 bg-gray-300 px-12 h-14 text-base font-medium"
          >
            Sign in
          </Button>
        </div>
      </div>
    </section>
  );
};

export const Features = () => {
  const navigate = useNavigate();
  return (
    <section className="bg-white overflow-hidden py-16 md:py-24">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1fr_auto_1fr] md:gap-6 lg:gap-12">
          <div className="relative flex h-[290px] items-center justify-center md:h-[330px]">
            <div className="absolute h-[260px] w-[260px] rounded-full border border-primary/20 md:h-[290px] md:w-[290px]" />
            <div className="absolute h-[200px] w-[200px] rounded-full border border-primary/20 md:h-[225px] md:w-[225px]" />
            <div className="absolute h-[145px] w-[145px] rounded-full border border-primary/20 md:h-[165px] md:w-[165px]" />

            <div className="relative z-10 h-20 w-20 overflow-hidden rounded-full border-6 border-white shadow-2xl md:h-24 md:w-24 select-none">
              <img
                src={avatar3}
                alt="User"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="absolute right-1/4 top-0 flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white p-2.5 shadow-lg md:h-12 md:w-12">
              <Folder className="h-full w-full text-gray-900" />
            </div>
            <div className="absolute -left-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white p-2.5 shadow-lg md:h-12 md:w-12">
              <MessageSquare className="h-full w-full text-gray-900" />
            </div>
            <div className="absolute -bottom-1 right-1/4 flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white p-2.5 shadow-lg md:h-12 md:w-12">
              <Puzzle className="h-full w-full text-gray-900" />
            </div>
          </div>

          <div className="mx-auto max-w-[560px] text-center">
            <h2 className="mb-6 text-5xl font-bold leading-[1.18] tracking-[-0.02em] text-gray-900 max-md:text-4xl max-sm:text-[2rem]">
              Use IntellMeet with no obligations and free of charge - for as
              long as you like.
            </h2>
            <p className="mx-auto mb-10 max-w-[530px] text-[19px] leading-relaxed text-gray-600 max-md:text-base">
              With the Upgrade function you can also opt for the additional
              benefits of the Teamspace Plus at any time.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth/signup")}
              className="h-14 rounded-full bg-gray-900 px-11 text-lg font-semibold text-white shadow-md shadow-gray-900/20 hover:bg-gray-800"
            >
              Get started
            </Button>
          </div>

          <div className="relative flex h-[290px] items-center justify-center md:h-[330px]">
            <div className="absolute h-[260px] w-[260px] rounded-full border border-primary/20 md:h-[290px] md:w-[290px]" />
            <div className="absolute h-[200px] w-[200px] rounded-full border border-primary/20 md:h-[225px] md:w-[225px]" />
            <div className="absolute h-[145px] w-[145px] rounded-full border border-primary/20 md:h-[165px] md:w-[165px]" />

            <div className="relative z-10 h-20 w-20 overflow-hidden rounded-full border-6 border-white shadow-2xl md:h-24 md:w-24 select-none">
              <img
                src={avatar4}
                alt="User"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="absolute left-1/4 top-0 flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white p-2.5 shadow-lg md:h-12 md:w-12">
              <MapPin className="h-full w-full text-gray-900" />
            </div>
            <div className="absolute -right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white p-2.5 shadow-lg md:h-12 md:w-12">
              <Share2 className="h-full w-full text-gray-900" />
            </div>
            <div className="absolute -bottom-1 left-1/4 flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white p-2.5 shadow-lg md:h-12 md:w-12">
              <ShieldCheck className="h-full w-full text-gray-900" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const LandingPage = () => {
  return (
    <main className="min-h-screen font-sans bg-white">
      <Navbar />
      <Hero />
      <Features />
      <footer className="py-8 bg-gray-50 text-center border-t border-gray-200">
        <p className="text-xs text-gray-500 font-medium tracking-wide">
          © 2026 IntellMeet. All rights reserved.
        </p>
      </footer>
    </main>
  );
};
