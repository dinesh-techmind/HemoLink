const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

// The main render block is near the end, we can find the LAST occurrence before the `if (!currentUser)`
// Or we can just look for the specific block:
const targetStart = "if (!currentUser) {\n    return (";

const startIndex = content.lastIndexOf(targetStart);
if (startIndex === -1) {
    console.error("Could not find start");
    process.exit(1);
}

// Just find the block starting exactly at `if (!currentUser) {\n    return (`
let braceCount = 0;
let endIndex = -1;
let started = false;

// We need to match the opening brace of `if (!currentUser) {`
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

if (endIndex === -1) {
    console.error("Could not find end");
    process.exit(1);
}

const newBlock = `if (!currentUser) {
    return <OnboardingGate onComplete={() => setCurrentUser(store.getCurrentUser())} />;
  }`;

let newContent = content.substring(0, startIndex) + newBlock + content.substring(endIndex + 1);
fs.writeFileSync('src/App.tsx', newContent);
console.log("Patched successfully");
