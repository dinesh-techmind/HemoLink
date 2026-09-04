const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(/--font-sans: "DM Sans".*?;/, '--font-sans: "Inter", "DM Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;');

if (!css.includes('body {') && !css.includes('font-weight: 600')) {
  css += `\n\nbody {\n  font-weight: 600;\n  -webkit-font-smoothing: antialiased;\n}\n`;
}

fs.writeFileSync('src/index.css', css);
