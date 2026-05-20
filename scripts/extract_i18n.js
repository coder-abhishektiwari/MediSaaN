const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const enFile = path.join(__dirname, '../src/locales/en.json');
const hiFile = path.join(__dirname, '../src/locales/hi.json');

let enDict = {};
let hiDict = {};
try { enDict = JSON.parse(fs.readFileSync(enFile, 'utf8')); } catch (e) {}
try { hiDict = JSON.parse(fs.readFileSync(hiFile, 'utf8')); } catch (e) {}

const regex = /t\(['"]([^'"]+)['"]\s*,\s*\{\s*defaultValue\s*:\s*['"`](.*?)['"`]\s*\}\)/g;

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      let match;
      while ((match = regex.exec(content)) !== null) {
        const key = match[1];
        const val = match[2];
        if (!enDict[key]) enDict[key] = val;
        if (!hiDict[key]) hiDict[key] = `[HI] ${val}`; // placeholder for manual/auto translation
      }
    }
  }
}

scanDir(srcDir);

fs.writeFileSync(enFile, JSON.stringify(enDict, null, 2), 'utf8');
fs.writeFileSync(hiFile, JSON.stringify(hiDict, null, 2), 'utf8');
console.log('Successfully updated locales!');
