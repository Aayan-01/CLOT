const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIRS = [
  path.join(ROOT, 'client', 'dist'),
];

const OLD_EMAIL = 'abc@gmail.com';
const NEW_EMAIL = 'help.retrorate@gmail.com';

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results.push(...walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

let changed = [];
for (const d of TARGET_DIRS) {
  if (!fs.existsSync(d)) continue;
  const files = walk(d);
  for (const f of files) {
    try {
      const ext = path.extname(f).toLowerCase();
      if (!['.html', '.js', '.css', '.txt'].includes(ext)) continue;
      let content = fs.readFileSync(f, 'utf8');
      if (content.includes(OLD_EMAIL)) {
        const updated = content.split(OLD_EMAIL).join(NEW_EMAIL);
        fs.writeFileSync(f, updated, 'utf8');
        changed.push(f);
      }
    } catch (err) {
      console.error('failed', f, err.message);
    }
  }
}

if (changed.length === 0) {
  console.log('No files changed');
} else {
  console.log('Updated files:');
  changed.forEach((c) => console.log(' -', c));
}
