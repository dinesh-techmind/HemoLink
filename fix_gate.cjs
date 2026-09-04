const fs = require('fs');
let code = fs.readFileSync('src/components/OnboardingGate.tsx', 'utf8');

// 1. Move RootBg outside
const rootBgRegex = /const RootBg = \(\{ children \}: \{ children: React\.ReactNode \}\) => \(\s*<div className="min-h-screen[\s\S]*?<\/div>\s*\);\s*/;
const match = code.match(rootBgRegex);

if (match) {
    code = code.replace(match[0], ''); // Remove from inside
    // Insert after imports
    const importEnd = code.indexOf('export default function OnboardingGate');
    code = code.slice(0, importEnd) + match[0] + '\n' + code.slice(importEnd);
}

// 2. Modify handleLogin to auto-register instead of blocking
const loginRegex = /const handleLogin = \(e: React\.FormEvent\) => \{[\s\S]*?\};/;
const newLogin = `const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) {
          setAuthError("Please enter your email.");
          return;
      }
      if (email.toLowerCase().includes("admin")) {
          store.registerUser(email, "System Admin", "admin");
      } else {
          let user = store.getAllUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
          if (user) {
              store.registerUser(user.email, user.fullName || "User", user.role);
          } else {
              // Auto-register for prototype smoothness
              store.registerUser(email, "Guest User", "user");
          }
      }
      finishWithLoading();
  };`;

code = code.replace(loginRegex, newLogin);

fs.writeFileSync('src/components/OnboardingGate.tsx', code);
