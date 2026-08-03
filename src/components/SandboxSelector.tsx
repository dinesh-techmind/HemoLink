import { AppUser } from "../types";
import { store } from "../lib/store";
import { Shield, User, Heart, HelpCircle } from "lucide-react";

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

  return (
    <div className="bg-[#141414] border-t border-[#222222] px-4 py-3 sticky bottom-0 z-50 text-xs shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Banner */}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <span className="font-semibold text-text-bright tracking-tight">AI Studio Simulator Sandbox Active</span>
            <p className="text-[10px] text-text-muted">Switch roles below to test live seeker/donor perspectives & secure chats.</p>
          </div>
        </div>

        {/* Picker Buttons */}
        <div className="flex flex-wrap items-center gap-2 justify-center">
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
                onClick={() => onSwitchUser(user.uid)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition duration-200 cursor-pointer ${
                  isActive
                    ? "bg-brand-red/10 border-brand-red text-brand-red font-medium shadow-sm"
                    : "bg-[#1C1C1C] border-[#2E2E2E] hover:border-zinc-600 text-text-muted"
                }`}
              >
                {icon}
                <div className="hidden sm:block text-[11px]">
                  <p className="font-semibold text-text-bright line-clamp-1 leading-tight">{user.fullName}</p>
                  <p className="text-[9px] text-text-subtle lowercase">{badgeText}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
