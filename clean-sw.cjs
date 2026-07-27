const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));

const swRegex = /<script>\s*if\s*\('serviceWorker'\s*in\s*navigator\)\s*\{\s*window\.addEventListener\('load',\s*\(\)\s*=>\s*\{\s*navigator\.serviceWorker\.register\('\/sw\.js'\)[^<]+<\/script>/g;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.match(swRegex)) {
        content = content.replace(swRegex, '');
        fs.writeFileSync(file, content);
        console.log(`Cleaned ${file}`);
    }
});

let scriptContent = fs.readFileSync('script.js', 'utf8');
const scriptRegex = /if\s*\('serviceWorker'\s*in\s*navigator\)\s*\{\s*window\.addEventListener\('load',\s*\(\)\s*=>\s*\{\s*navigator\.serviceWorker\.register\('\/sw\.js'\)[^\}]+(?:\}\);[^\}]*\})?/g;
if (scriptContent.match(scriptRegex)) {
    scriptContent = scriptContent.replace(scriptRegex, '');
    fs.writeFileSync('script.js', scriptContent);
    console.log(`Cleaned script.js`);
}
