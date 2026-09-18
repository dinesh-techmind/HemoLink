import { useState } from "react";
import { AppUser } from "../types";
import { Shield, User, Heart, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

interface SandboxSelectorProps {
  currentUser: AppUser | null;
  allUsers: AppUser[];
  onSwitchUser: (uid: string) => void;
}

export default function SandboxSelector({
  currentUser,
  allUsers,
  onSwitchUser,
}: SandboxSelectorProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="bg-[#141414] border-t border-[#222222] px-3 sm:px-4 py-2 sm:py-3 z-30 text-xs shadow-2xl relative">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Header Toggle */}
        <div className="md:hidden flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[11px] font-semibold text-text-bright">
              Persona: <strong className="text-brand-red">{currentUser?.fullName}</strong>
            </span>
            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-surface-dark text-text-muted border border-border-dark font-mono">
              {currentUser?.role === "admin" ? "Admin" : currentUser?.uid.startsWith("donor_") ? "Donor" : "Seeker"}
            </span>
          </div>

          <button
            type="button"
            id="mobile-sandbox-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-white px-2 py-1 rounded-lg bg-surface-dark border border-border-dark cursor-pointer"
          >
            <span>Switch</span>
            {mobileOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>

        {/* Container for selector items */}
        <div className={`mt-2 md:mt-0 flex-col md:flex-row items-center justify-between gap-3 ${mobileOpen ? "flex" : "hidden md:flex"}`}>
          {/* Banner */}
          <div className="hidden md:flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <span className="font-semibold text-text-bright tracking-tight">AI Studio Simulator Sandbox Active</span>
              <p className="text-[10px] text-text-muted">Switch roles below to test live seeker/donor perspectives & secure chats.</p>
            </div>
          </div>

          {/* Picker Buttons */}
          <div className="flex flex-wrap items-center gap-2 justify-center w-full md:w-auto">
            {allUsers.map((user) => {
              const isActive = currentUser?.uid === user.uid;
              
              // Icon mapping
              let icon = <User className="w-3.5 h-3.5" />;
              let badgeText = "Guest User";
              if (user.role === "admin") {
                icon = <Shield className="w-3.5 h-3.5 text-amber-500" />;
                badgeText = "Super Admin";
              } else if (user.uid.startsWith("donor_")) {
                icon = <Heart className="w-3.5 h-3.5 text-rose-500" />;
                badgeText = "Registered Donor";
              } else if (user.uid.startsWith("user_seeker_")) {
                icon = <HelpCircle className="w-3.5 h-3.5 text-blue-500" />;
                badgeText = "Emergency Seeker";
              }

              return (
                <button
                  key={user.uid}
                  id={`sandbox-user-btn-${user.uid}`}
                  onClick={() => {
                    onSwitchUser(user.uid);
                    setMobileOpen(false);
                  }}
                  className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border text-left transition duration-200 cursor-pointer ${
                    isActive
                      ? "bg-brand-red/10 border-brand-red text-brand-red font-medium shadow-sm"
                      : "bg-[#1C1C1C] border-[#2E2E2E] hover:border-zinc-600 text-text-muted"
                  }`}
                >
                  {icon}
                  <div className="text-[11px]">
                    <p className="font-semibold text-text-bright line-clamp-1 leading-tight">{user.fullName}</p>
                    <p className="text-[9px] text-text-subtle lowercase">{badgeText}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
