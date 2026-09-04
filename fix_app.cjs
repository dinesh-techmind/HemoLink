const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Undo the bad patch
const badCode = `    if (!currentUser) {
    return <OnboardingGate onComplete={() => setCurrentUser(store.getCurrentUser())} />;
  }`;
const goodCode = `    if (!currentUser) {
      alert("You need to sign-in or use a Sandbox user below to initiate contact channels.");
      setActiveTab("profile");
      return;
    }`;

content = content.replace(badCode, goodCode);

// Apply correct patch
const targetStart = "if (!currentUser) {\n    return (";
const startIndex = content.lastIndexOf(targetStart);
if (startIndex !== -1) {
    let braceCount = 0;
    let endIndex = -1;
    let started = false;
    const blockStartIndex = content.indexOf('{', startIndex);

    for (let i = blockStartIndex; i < content.length; i++) {
        if (content[i] === '{') {
            braceCount++;
            started = true;
        } else if (content[i] === '}') {
            braceCount--;
        }
        
        if (started && braceCount === 0) {
            endIndex = i;
            break;
        }
    }

    if (endIndex !== -1) {
        const newBlock = `if (!currentUser) {
    return <OnboardingGate onComplete={() => setCurrentUser(store.getCurrentUser())} />;
  }`;
        content = content.substring(0, startIndex) + newBlock + content.substring(endIndex + 1);
    }
}

fs.writeFileSync('src/App.tsx', content);
console.log("Fixed successfully");
