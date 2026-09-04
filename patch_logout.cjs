const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add state for logout
if (!code.includes('const [showLogoutConfirm, setShowLogoutConfirm]')) {
  code = code.replace(
    'const [showNotificationCenter, setShowNotificationCenter] = useState<boolean>(false);',
    'const [showNotificationCenter, setShowNotificationCenter] = useState<boolean>(false);\n  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);\n  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);'
  );
}

// 2. Add handleLogout function
const handleLogoutFunction = `
  const handleLogout = () => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(true);
    setTimeout(() => {
      store.logOut();
      setIsLoggingOut(false);
      setActiveTab("search");
    }, 2500); // 2.5s animation duration
  };
`;
if (!code.includes('const handleLogout = ()')) {
  code = code.replace(
    '// Sync active chat messages',
    handleLogoutFunction + '\n  // Sync active chat messages'
  );
}

// 3. Update the existing logout button in the profile tab to show confirmation
code = code.replace(
  'onClick={() => store.logOut()}',
  'onClick={() => setShowLogoutConfirm(true)}'
);

// 4. Add the Logout Icon to the Header
const logoutIconHeader = `
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="p-2.5 bg-surface-dark border border-border-dark rounded-xl hover:bg-brand-red/20 hover:text-brand-red text-text-subtle transition cursor-pointer flex items-center justify-center"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
`;
code = code.replace(
  /<\/div>\s*<\/div>\s*<\/>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/header>/,
  `</div>\n              </div>\n              <button\n                onClick={() => setShowLogoutConfirm(true)}\n                className="p-2.5 bg-surface-dark border border-border-dark rounded-xl hover:bg-brand-red/10 hover:border-brand-red/30 hover:text-brand-red text-text-muted transition cursor-pointer flex items-center justify-center"\n                title="Log Out"\n              >\n                <LogOut className="w-4 h-4" />\n              </button>\n            </>\n          )}\n        </div>\n        </div>\n      </header>`
);

// 5. Add the confirmation modal and logging out animation to the root layout
const animatedLogoutUI = `
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card-dark border border-border-dark rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl space-y-6 transform animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mx-auto shadow-inner">
               <LogOut className="w-7 h-7 text-brand-red" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-extrabold text-white font-display">Confirm Logout</h3>
              <p className="text-xs text-text-muted">Are you sure you want to log out of your HEMOLINK profile?</p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 bg-surface-dark hover:bg-zinc-800 text-text-bright text-xs font-bold uppercase tracking-wider rounded-xl border border-border-dark transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-brand-red/20 transition"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animated Logout Screen */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-base-dark p-4 animate-in fade-in duration-500">
           <div className="relative w-24 h-24 flex items-center justify-center mb-8">
             <div className="absolute inset-0 border-4 border-brand-red/20 rounded-full animate-ping duration-1000"></div>
             <div className="absolute inset-0 border-4 border-brand-red border-t-transparent rounded-full animate-spin duration-700"></div>
             <Droplet className="w-8 h-8 text-brand-red animate-pulse" />
           </div>
           <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-widest font-display animate-pulse uppercase">Logging Out</h2>
           <p className="text-text-muted text-sm mt-3 max-w-sm text-center">Securely disconnecting your profile and encrypting session data...</p>
        </div>
      )}
`;

code = code.replace(
  '{/* Human Footers info details */}',
  animatedLogoutUI + '\n      {/* Human Footers info details */}'
);

fs.writeFileSync('src/App.tsx', code);
