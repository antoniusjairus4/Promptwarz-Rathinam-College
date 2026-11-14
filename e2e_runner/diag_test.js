/**
 * Diagnostic runner test
 */
const { chromium } = require('/usr/lib/chatgpt/resources/cua_node/lib/node_modules/playwright-core');

(async () => {
  console.log('Testing Playwright initialization...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/google/chrome/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  
  await page.goto('http://127.0.0.1:5173/onboarding');
  await page.waitForLoadState('networkidle');
  
  console.log('Title:', await page.title());
  console.log('Console logs count:', consoleLogs.length);
  await page.screenshot({ path: 'qa_evidence/diag_onboarding.png' });
  console.log('Screenshot saved to qa_evidence/diag_onboarding.png');
  
  await browser.close();
  console.log('Test completed successfully.');
})();
