const fs = require('fs');

// 1. Update index.css
const css = `@import "tailwindcss";

:root {
  --bg-base: #3E0202;
  --bg-card: #5C0505;
  --bg-surface: #7A0909;
  --border-color: #9C1313;

  --text-bright: #FFFFFF;
  --text-muted: #FFD4D4;
  --text-subtle: #FF9E9E;

  --map-bg: #3E0202;
  --map-popup-bg: #5C0505;
  --map-text: #FFFFFF;
}

@theme {
  --font-sans: "DM Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-display: "Syne", sans-serif;

  --color-brand-red: #FF3B3B;
  --color-brand-red-dark: #D31212;
  --color-base-dark: var(--bg-base);
  --color-card-dark: var(--bg-card);
  --color-surface-dark: var(--bg-surface);
  --color-border-dark: var(--border-color);

  --color-text-bright: var(--text-bright);
  --color-text-muted: var(--text-muted);
  --color-text-subtle: var(--text-subtle);

  /* Blood Group badging */
  --color-ap: #FF6B6B;
  --color-an: #FF8E8E;
  --color-bp: #4ECDC4;
  --color-bn: #6EE7E0;
  --color-abp: #A855F7;
  --color-abn: #C084FC;
  --color-op: #F59E0B;
  --color-on: #FCD34D;
}

@keyframes pulse-critical {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(230, 57, 70, 0.5);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(230, 57, 70, 0);
  }
}

.animate-pulse-critical {
  animation: pulse-critical 2s infinite;
}

/* Custom Scrollbars */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: var(--bg-base);
}
::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--bg-surface);
}

/* Leaflet dark/light styling */
.leaflet-container {
  background: var(--map-bg) !important;
  font-family: inherit;
}
.leaflet-bar {
  border: 1px solid var(--border-color) !important;
  box-shadow: none !important;
}
.leaflet-bar a {
  background-color: var(--bg-card) !important;
  color: var(--text-bright) !important;
  border-bottom: 1px solid var(--border-color) !important;
}
.leaflet-bar a:hover {
  background-color: var(--bg-surface) !important;
  color: var(--text-bright) !important;
}
.leaflet-popup-content-wrapper {
  background: var(--map-popup-bg) !important;
  color: var(--map-text) !important;
  border: 1px solid var(--border-color);
  border-radius: 12px !important;
}
.leaflet-popup-tip {
  background: var(--map-popup-bg) !important;
  border: 1px solid var(--border-color);
}
`;

fs.writeFileSync('src/index.css', css);

// 2. Remove theme toggle button and state from App.tsx
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The toggle button was already removed via sed, let's just make sure.
// Remove isDarkMode state
code = code.replace(/const \[isDarkMode, setIsDarkMode\] = useState<boolean>\(\(\) => localStorage\.getItem\("hemolink_theme"\) !== "light"\);\n/, '');
code = code.replace(/useEffect\(\(\) => \{\n\s*if \(isDarkMode\) \{\n\s*document\.documentElement\.classList\.remove\("light-mode"\);\n\s*localStorage\.setItem\("hemolink_theme", "dark"\);\n\s*\} else \{\n\s*document\.documentElement\.classList\.add\("light-mode"\);\n\s*localStorage\.setItem\("hemolink_theme", "light"\);\n\s*\}\n\s*\}, \[isDarkMode\]\);\n/, '');

// Make sure the button is really gone
code = code.replace(/\{\/\* Theme Toggle Button \*\/\}\s*<button[\s\S]*?<\/button>\s*\{\/\* Notification Center Trigger Bell button \*\/\}/, '{/* Notification Center Trigger Bell button */}');
// Also remove it if it was slightly different
code = code.replace(/\{\/\* Theme Toggle Button \*\/\}\s*<button[^>]*id="theme-toggle-btn"[\s\S]*?<\/button>/, '');


fs.writeFileSync('src/App.tsx', code);
