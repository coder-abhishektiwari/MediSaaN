const fs = require('fs');
const path = require('path');
const https = require('https');

const localesDir = path.join(__dirname, '../src/locales');
const enFile = path.join(localesDir, 'en.json');
let enDict = JSON.parse(fs.readFileSync(enFile, 'utf8'));

const langs = ['bn', 'gu', 'kn', 'ml', 'mr', 'or', 'pa', 'ta', 'te', 'ur'];

async function translateText(text, targetLang) {
  return new Promise((resolve, reject) => {
    // some placeholders like {{name}} should ideally be protected, but for a simple script we might just hope they survive or replace them.
    // To protect {{var}}, we can temporarily replace it with something translation engines don't touch, like a number, but Google Translate often handles them.
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          let result = '';
          if (json && json[0]) {
            json[0].forEach(item => {
              if (item[0]) result += item[0];
            });
          }
          resolve(result || text);
        } catch (e) {
          resolve(text);
        }
      });
    }).on('error', (e) => resolve(text));
  });
}

async function run() {
  for (const lang of langs) {
    const file = path.join(localesDir, `${lang}.json`);
    let dict = {};
    if (fs.existsSync(file)) {
      dict = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    
    let added = 0;
    for (const key of Object.keys(enDict)) {
      if (!dict[key]) {
        console.log(`Translating ${key} to ${lang}...`);
        const translated = await translateText(enDict[key], lang);
        // Basic fix for double braces that might have been messed up by translation
        const fixed = translated.replace(/\{\s*\{\s*([a-zA-Z0-9_]+)\s*\}\s*\}/g, '{{$1}}');
        dict[key] = fixed;
        added++;
        // Add a small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      }
    }
    
    if (added > 0) {
      fs.writeFileSync(file, JSON.stringify(dict, null, 2), 'utf8');
      console.log(`Updated ${lang}.json with ${added} new keys.`);
    } else {
      console.log(`${lang}.json is already up to date.`);
    }
  }
}

run();
