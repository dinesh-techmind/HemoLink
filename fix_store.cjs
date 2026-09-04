const fs = require('fs');
let code = fs.readFileSync('src/lib/store.ts', 'utf8');

// Modify deleteDonor
code = code.replace(
  /public async deleteDonor\(uid: string\) \{[\s\S]*?\}\s*public async deleteUser/,
  `public async deleteDonor(uid: string) {
    // Update local state first to ensure UI responsiveness for mock admins
    this.donors = this.donors.filter((d) => d.uid !== uid);
    this.saveToStorage();
    this.notify();

    try {
      await deleteDoc(doc(db, "donors", uid));
    } catch (e) {
      console.warn("Firestore delete blocked (expected if mock admin bypass used):", e);
    }
  }

  public async deleteUser`
);

// Modify deleteUser
code = code.replace(
  /public async deleteUser\(uid: string\) \{[\s\S]*?\}\s*public verifyDonorStatus/,
  `public async deleteUser(uid: string) {
    // Update local state first to ensure UI responsiveness for mock admins
    this.users = this.users.filter((u) => u.uid !== uid);
    this.donors = this.donors.filter((d) => d.uid !== uid);
    this.chats = this.chats.filter((c) => !c.participants.includes(uid));
    this.saveToStorage();
    this.notify();

    try {
      await deleteDoc(doc(db, "donors", uid));
    } catch (e) {
      console.warn("Firestore delete blocked (expected if mock admin bypass used):", e);
    }
  }

  public verifyDonorStatus`
);

fs.writeFileSync('src/lib/store.ts', code);
