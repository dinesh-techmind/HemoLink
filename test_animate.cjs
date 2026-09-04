const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace allDonors.map with AnimatePresence wrapped map
code = code.replace(
  /<tbody>\s*\{allDonors\.map\(\(d\) => \(/,
  '<tbody>\\n                    <AnimatePresence>\\n                      {allDonors.map((d) => ('
);
code = code.replace(
  /<tr key=\{d\.uid\} id=\{`admin-donor-row-\$\{d\.uid\}`\}/,
  '<motion.tr layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100, scaleY: 0.5, transition: { duration: 0.3 } }} key={d.uid} id={`admin-donor-row-\${d.uid}`}'
);
code = code.replace(
  /<\/button>\s*<\/td>\s*<\/tr>\s*\)\)\}\s*<\/tbody>/,
  '</button>\\n                        </td>\\n                      </motion.tr>\\n                    ))}\\n                    </AnimatePresence>\\n                  </tbody>'
);

// Users table
code = code.replace(
  /<tbody>\s*\{allUsers\.map\(\(u\) => \{/,
  '<tbody>\\n                    <AnimatePresence>\\n                      {allUsers.map((u) => {'
);
code = code.replace(
  /<tr key=\{u\.uid\} id=\{`admin-user-row-\$\{u\.uid\}`\}/,
  '<motion.tr layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100, scaleY: 0.5, transition: { duration: 0.3 } }} key={u.uid} id={`admin-user-row-\${u.uid}`}'
);
code = code.replace(
  /<\/td>\s*<\/tr>\s*\);\s*\}\)\}\s*<\/tbody>/,
  '</td>\\n                          </motion.tr>\\n                        );\\n                      })}\\n                    </AnimatePresence>\\n                  </tbody>'
);

fs.writeFileSync('src/App.tsx', code);
