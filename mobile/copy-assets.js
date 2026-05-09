const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WWW = path.join(__dirname, 'www');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest, exclude = []) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src)) {
    if (exclude.includes(entry)) continue;
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath, exclude);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Copying CSS assets...');
copyDir(path.join(ROOT, 'assets', 'css'), path.join(WWW, 'assets', 'css'));
console.log('Copying font assets...');
copyDir(path.join(ROOT, 'assets', 'font'), path.join(WWW, 'assets', 'font'));
console.log('Copying channel images...');
copyDir(path.join(ROOT, 'assets', 'img', 'channel'), path.join(WWW, 'assets', 'img', 'channel'));

console.log('Copying JS modules...');
const rendererJs = path.join(ROOT, 'renderer', 'js');
const wwwJs = path.join(WWW, 'js');
ensureDir(wwwJs);
for (const entry of fs.readdirSync(rendererJs)) {
  const src = path.join(rendererJs, entry);
  const dest = path.join(wwwJs, entry);
  if (fs.statSync(src).isDirectory()) {
    copyDir(src, dest);
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('Asset copy complete.');
