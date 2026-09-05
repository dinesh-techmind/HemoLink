import React, { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check, Sparkles } from "lucide-react";
import { useLanguage, LanguageCode } from "../lib/i18n";

export const LanguageSwitcher: React.FC = () => {
  const { currentLanguage, languageInfo, setLanguage, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectLanguage = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left shrink-0" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        id="header-language-switcher-btn"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Change application language"
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer shadow-sm ${
          isOpen
            ? "bg-brand-red/15 border-brand-red text-white shadow-brand-red/20 ring-1 ring-brand-red/50"
            : "bg-surface-dark border-border-dark text-text-bright hover:bg-[#1c1c22] hover:border-brand-red/40"
        }`}
      >
        <div className="w-5 h-5 rounded-lg bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red shrink-0">
          <Globe className="w-3.5 h-3.5 animate-spin-slow" />
        </div>
        <span className="text-base leading-none">{languageInfo.flag}</span>
        <div className="flex flex-col items-start leading-none text-left">
          <span className="font-bold text-[12px] tracking-tight text-text-bright">
            {languageInfo.nativeName}
          </span>
          <span className="text-[9px] text-text-muted font-mono uppercase mt-0.5">
            {languageInfo.code.toUpperCase()}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180 text-brand-red" : ""
          }`}
        />
      </button>

      {/* Language Selection Dropdown Menu */}
      {isOpen && (
        <div
          id="header-language-dropdown-menu"
          className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#121216] border border-border-dark shadow-2xl rounded-2xl p-2.5 z-50 text-xs text-text-bright animate-in fade-in-0 zoom-in-95 duration-150 space-y-1.5 ring-1 ring-white/5"
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-border-dark flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-brand-red" />
              <span className="font-bold text-text-bright font-display text-[12px]">
                Regional & Emergency Languages
              </span>
            </div>
            <span className="text-[9px] font-mono uppercase bg-brand-red/20 text-brand-red px-1.5 py-0.5 rounded font-bold">
              8 Available
            </span>
          </div>

          <div className="px-2 py-1 text-[10px] text-text-muted flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Instant translation for emergency responders & donors</span>
          </div>

          {/* Language Options List */}
          <div className="max-h-72 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {languages.map((lang) => {
              const isSelected = currentLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  id={`lang-option-${lang.code}`}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition text-left cursor-pointer group ${
                    isSelected
                      ? "bg-brand-red/20 border border-brand-red/50 text-white font-bold shadow-sm"
                      : "hover:bg-[#1a1a22] border border-transparent text-text-subtle hover:text-text-bright"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl leading-none shrink-0">{lang.flag}</span>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[13px] font-bold ${isSelected ? "text-rose-200" : "text-text-bright"}`}>
                          {lang.nativeName}
                        </span>
                        <span className="text-[11px] text-text-muted font-normal">
                          ({lang.englishName})
                        </span>
                      </div>
                      <p className="text-[9px] text-text-muted truncate mt-0.5 font-mono">
                        {lang.region}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5 ml-2">
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-extrabold ${
                        isSelected
                          ? "bg-brand-red text-white"
                          : "bg-surface-dark text-text-muted group-hover:text-text-bright"
                      }`}
                    >
                      {lang.code}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-brand-red shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Helpline Note */}
          <div className="border-t border-border-dark pt-2 px-2 pb-1 text-center">
            <span className="text-[10px] text-text-muted font-medium">
              National Emergency Blood Helpline:{" "}
              <span className="text-rose-400 font-bold font-mono">1800-123-4567</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
