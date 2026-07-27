const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('dist/appointment.html', 'utf8');

class CustomResourceLoader extends jsdom.ResourceLoader {
  fetch(url, options) {
    if (url.endsWith('.css')) {
      return Promise.resolve(Buffer.from(''));
    }
    // Change localhost to file:// for local JS files
    if (url.startsWith('http://localhost/')) {
        const localPath = url.replace('http://localhost/', 'dist/');
        if (fs.existsSync(localPath)) {
            return Promise.resolve(fs.readFileSync(localPath));
        }
    }
    return super.fetch(url, options);
  }
}

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", (err) => {
  console.error("DOM Console Error:", err);
});
virtualConsole.on("log", (log) => {
  console.log("DOM Console Log:", log);
});
virtualConsole.on("jsdomError", (err) => {
  console.error("JSDOM Error:", err);
});

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: new CustomResourceLoader(),
  url: "http://localhost/",
  virtualConsole
});

setTimeout(() => {
    console.log("specialtyGrid html:", dom.window.document.getElementById('specialtyGrid')?.innerHTML);
}, 2000);
