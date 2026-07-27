const puppeteer = require('puppeteer');
const handler = require('serve-handler');
const http = require('http');

const server = http.createServer((request, response) => {
  return handler(request, response, { public: 'dist' });
});

server.listen(3000, async () => {
  console.log('Running at http://localhost:3000');
  
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.error('BROWSER ERROR:', error.message));
  
  await page.goto('http://localhost:3000/appointment.html');
  await page.waitForTimeout(2000);
  
  const html = await page.$eval('#specialtyGrid', el => el.innerHTML);
  console.log('Specialty HTML:', html);
  
  await page.goto('http://localhost:3000/admin.html');
  await page.waitForTimeout(2000);
  
  const adminHtml = await page.$eval('#admin-root', el => el.innerHTML);
  console.log('Admin HTML length:', adminHtml.length);
  
  await browser.close();
  server.close();
});
