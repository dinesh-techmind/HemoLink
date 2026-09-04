const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The store now absorbs the error so we can just leave the try-catch, but maybe we should ensure it checks role locally as well.
// Wait, if a normal user clicked it, they shouldn't even see the button, or if they did, the store would remove it. 
// But the Admin console is ONLY visible to the admin!
code = code.replace(
    /try \{\s*await store\.deleteDonor\(d\.uid\);\s*\} catch \(error\) \{\s*alert\("Permission Denied: Only super admins can remove profiles\."\);\s*\}/g,
    'await store.deleteDonor(d.uid);'
);

code = code.replace(
    /try \{\s*await store\.deleteUser\(u\.uid\);\s*\} catch \(error\) \{\s*alert\("Permission Denied: Only super admins can remove profiles\."\);\s*\}/g,
    'await store.deleteUser(u.uid);'
);

fs.writeFileSync('src/App.tsx', code);
