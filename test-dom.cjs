const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('dist/appointment.html', 'utf8');

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", (err) => {
  console.error("DOM Error:", err);
});
virtualConsole.on("log", (log) => {
  console.log("DOM Log:", log);
});
virtualConsole.on("jsdomError", (err) => {
  console.error("JSDOM Error:", err);
});

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  url: "http://localhost/",
  virtualConsole
});

setTimeout(() => {
    console.log("specialtyGrid html:", dom.window.document.getElementById('specialtyGrid')?.innerHTML);
}, 2000);
