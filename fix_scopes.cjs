const fs = require('fs');

const scopes = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
  'https://www.googleapis.com/auth/gmail.addons.current.message.action',
  'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
  'https://www.googleapis.com/auth/gmail.addons.current.message.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
  'https://www.googleapis.com/auth/drive.file'
];

const scopeAdditions = scopes.map(scope => `provider.addScope('${scope}');`).join('\n      ');
const scopeAdditionsModal = scopes.map(scope => `provider.addScope('${scope}');`).join('\n            ');

let onboarding = fs.readFileSync('src/components/OnboardingGate.tsx', 'utf8');
onboarding = onboarding.replace(
  /provider\.addScope\('https:\/\/www\.googleapis\.com\/auth\/drive\.file'\);\s*provider\.addScope\('https:\/\/www\.googleapis\.com\/auth\/gmail\.send'\);/,
  scopeAdditions
);
fs.writeFileSync('src/components/OnboardingGate.tsx', onboarding);

let modal = fs.readFileSync('src/components/DonorIdentityPassModal.tsx', 'utf8');
modal = modal.replace(
  /provider\.addScope\('https:\/\/www\.googleapis\.com\/auth\/drive\.file'\);/,
  scopeAdditionsModal
);
fs.writeFileSync('src/components/DonorIdentityPassModal.tsx', modal);
