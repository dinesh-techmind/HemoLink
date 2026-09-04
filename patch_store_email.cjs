const fs = require('fs');
let code = fs.readFileSync('src/lib/store.ts', 'utf8');

const realEmailCode = `
  public async addNotification(noti: Omit<AppNotification, "id" | "timestamp" | "read">) {
    const newNoti: AppNotification = {
      ...noti,
      id: "noti_" + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      read: false
    };
    this.notifications.unshift(newNoti);
    this.saveToStorage();
    this.notify();
    this.syncToFirestore("notifications", newNoti.id, newNoti);

    // If it's an email type and we have an OAuth token, actually send a REAL email!
    if (newNoti.type === "Email" && newNoti.recipient) {
      const token = (typeof window !== 'undefined') ? (window as any)._googleOAuthToken : null;
      if (token) {
        try {
          const emailLines = [
            \`To: \${newNoti.recipient}\`,
            \`Subject: HEMOLINK ALERT: \${newNoti.title.replace(/[^a-zA-Z0-9 ]/g, '')}\`,
            'Content-Type: text/plain; charset=utf-8',
            '',
            newNoti.message
          ];
          
          const rawEmail = emailLines.join('\\r\\n');
          const base64EncodedEmail = btoa(unescape(encodeURIComponent(rawEmail))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
          
          await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
              'Authorization': \`Bearer \${token}\`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw: base64EncodedEmail })
          });
          
          console.log("Real Gmail successfully sent to:", newNoti.recipient);
        } catch (e) {
          console.error("Failed to send real Gmail:", e);
        }
      }
    }
  }
`;

code = code.replace(
  /public addNotification\(noti: Omit<AppNotification, "id" \| "timestamp" \| "read">\).*?this\.syncToFirestore\("notifications", newNoti\.id, newNoti\);\s*\}/s,
  realEmailCode
);

fs.writeFileSync('src/lib/store.ts', code);
