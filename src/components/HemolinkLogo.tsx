import React from "react";

interface HemolinkLogoProps {
  /**
   * Layout variant:
   * - 'full': Icon on left, HEMOLINK wordmark on right
   * - 'icon': Just the heart-droplet symbol
   * - 'vertical': Icon stacked above the wordmark
   */
  variant?: "full" | "icon" | "vertical";
  /**
   * Pre-configured sizing or custom scaling
   */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /**
   * Color theme:
   * - 'brand': Deep crimson icon and text (matches official branding)
   * - 'dark-nav': Crimson icon with white/bright text (ideal for dark headers)
   * - 'white': Clean monochrome white (ideal for red/dark backgrounds)
   * - 'custom': Controlled via className / currentColor
   */
  colorScheme?: "brand" | "dark-nav" | "white" | "custom";
  /**
   * Optional secondary tagline
   */
  tagline?: string;
  /**
   * Custom wrapper class
   */
  className?: string;
  /**
   * Custom icon classes
   */
  iconClassName?: string;
  /**
   * Custom text classes
   */
  textClassName?: string;
}

/**
 * Hemolink Official Mark Icon:
 * The signature interlocking ribbon heart forming a central blood droplet
 * with an interior fluid highlight reflection.
 */
export const HemolinkIcon: React.FC<{
  className?: string;
  color?: string;
  highlightColor?: string;
  size?: number | string;
}> = ({ className = "w-9 h-9", color = "currentColor", highlightColor, size }) => {
  const effectiveHighlight = highlightColor || color;

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-label="HEMOLINK Logo Mark"
    >
      {/* Central Blood Droplet Loop */}
      <path
        d="M 50,22 C 50,22 28,52 28,68 C 28,80 38,90 50,90 C 62,90 72,80 72,68 C 72,52 50,22 50,22 Z"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left Heart Lobe */}
      <path
        d="M 50,22 C 41,12 30,8 19,12 C 7,16 2,30 4,43 C 6,56 16,66 28,68"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right Heart Lobe */}
      <path
        d="M 50,22 C 59,12 70,8 81,12 C 93,16 98,30 96,43 C 94,56 84,66 72,68"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner Droplet Highlight Reflection */}
      <path
        d="M 34,64 C 34,74 40,82 47,84"
        stroke={effectiveHighlight}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const HemolinkLogo: React.FC<HemolinkLogoProps> = ({
  variant = "full",
  size = "md",
  colorScheme = "brand",
  tagline,
  className = "",
  iconClassName = "",
  textClassName = "",
}) => {
  // Sizing definitions
  const sizeMap = {
    xs: { icon: "w-5 h-5", text: "text-base tracking-wider", tag: "text-[8px]" },
    sm: { icon: "w-7 h-7", text: "text-lg tracking-wider", tag: "text-[9px]" },
    md: { icon: "w-9 h-9", text: "text-xl tracking-wider", tag: "text-[10px]" },
    lg: { icon: "w-12 h-12", text: "text-2xl tracking-widest", tag: "text-xs" },
    xl: { icon: "w-16 h-16", text: "text-3xl tracking-widest", tag: "text-sm" },
  };

  const currentSize = sizeMap[size];

  // Colors
  const BRAND_COLOR = "#9B1B28"; // Official deep crimson from brand logo
  let iconColor = BRAND_COLOR;
  let textColor = "text-[#9B1B28]";
  let taglineColor = "text-[#9B1B28]/80";

  if (colorScheme === "dark-nav") {
    iconColor = "#DC2626"; // Vibrant brand red on dark canvas
    textColor = "text-text-bright";
    taglineColor = "text-text-muted";
  } else if (colorScheme === "white") {
    iconColor = "#FFFFFF";
    textColor = "text-white";
    taglineColor = "text-white/80";
  } else if (colorScheme === "custom") {
    iconColor = "currentColor";
    textColor = "text-current";
    taglineColor = "text-current opacity-80";
  }

  if (variant === "icon") {
    return (
      <HemolinkIcon
        className={`${currentSize.icon} ${iconClassName}`}
        color={iconColor}
      />
    );
  }

  if (variant === "vertical") {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <div className="relative mb-2">
          <HemolinkIcon
            className={`${currentSize.icon} ${iconClassName}`}
            color={iconColor}
          />
        </div>
        <span
          className={`font-extrabold uppercase font-display leading-none ${currentSize.text} ${textColor} ${textClassName}`}
          style={{ letterSpacing: "0.12em" }}
        >
          HEMOLINK
        </span>
        {tagline && (
          <p className={`mt-1 font-medium ${currentSize.tag} ${taglineColor}`}>
            {tagline}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="shrink-0 flex items-center justify-center">
        <HemolinkIcon
          className={`${currentSize.icon} ${iconClassName}`}
          color={iconColor}
        />
      </div>
      <div className="flex flex-col justify-center leading-none">
        <span
          className={`font-extrabold uppercase font-display leading-none ${currentSize.text} ${textColor} ${textClassName}`}
          style={{ letterSpacing: "0.1em" }}
        >
          HEMOLINK
        </span>
        {tagline && (
          <p className={`mt-1 font-medium ${currentSize.tag} ${taglineColor}`}>
            {tagline}
          </p>
        )}
      </div>
    </div>
  );
};

export default HemolinkLogo;
