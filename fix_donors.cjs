const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /<tbody>\s*\{donors\.map\(\(d\) => \(/,
  '<tbody>\n                    <AnimatePresence>\n                      {donors.map((d) => ('
);

code = code.replace(
  /<tr key=\{d\.uid\} id=\{`admin-donor-row-\$\{d\.uid\}`\} className="border-b border-border-dark\/40 text-text-bright hover:bg-surface-dark\/30">/,
  '<motion.tr layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100, scaleY: 0.5, transition: { duration: 0.3 } }} key={d.uid} id={`admin-donor-row-\${d.uid}`} className="border-b border-border-dark/40 text-text-bright hover:bg-surface-dark/30">'
);

code = code.replace(
  /<\/button>\s*<\/td>\s*<\/tr>\s*\)\)\}\s*<\/tbody>/,
  '</button>\n                        </td>\n                      </motion.tr>\n                    ))}\n                    </AnimatePresence>\n                  </tbody>'
);

// We need to also wrap emergencies just in case they remove emergencies
code = code.replace(
  /<tbody>\s*\{emergencies\.map\(\(e\) => \(/,
  '<tbody>\n                    <AnimatePresence>\n                      {emergencies.map((e) => ('
);

code = code.replace(
  /<tr key=\{e\.requestId\} id=\{`admin-req-row-\$\{e\.requestId\}`\} className="border-b border-border-dark text-text-bright hover:bg-surface-dark\/20">/,
  '<motion.tr layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100, scaleY: 0.5, transition: { duration: 0.3 } }} key={e.requestId} id={`admin-req-row-\${e.requestId}`} className="border-b border-border-dark text-text-bright hover:bg-surface-dark/20">'
);

code = code.replace(
  /<\/td>\s*<\/tr>\s*\)\)\}\s*<\/tbody>/,
  '</td>\n                        </motion.tr>\n                      ))}\n                    </AnimatePresence>\n                  </tbody>'
);

fs.writeFileSync('src/App.tsx', code);
