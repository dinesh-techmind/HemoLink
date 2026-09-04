const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/<div className=\{\`flex flex-col min-h-screen \$\{isDarkMode \? "bg-base-dark text-text-bright" : "bg-base-dark text-text-bright light-mode"\} font-sans selection:bg-brand-red selection:text-white transition-colors duration-200\`\}>/, '<div className="flex flex-col min-h-screen bg-base-dark text-text-bright font-sans selection:bg-brand-red selection:text-white transition-colors duration-200">');

fs.writeFileSync('src/App.tsx', code);
