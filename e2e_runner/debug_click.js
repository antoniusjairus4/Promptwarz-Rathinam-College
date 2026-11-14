const { chromium } = require('/usr/lib/chatgpt/resources/cua_node/lib/node_modules/playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/google/chrome/chrome',
    args: ['--no-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));
  page.on('requestfailed', req => console.log(`[REQ FAILED] ${req.url()} ${req.failure()?.errorText}`));
  page.on('response', resp => {
    if (resp.url().includes('/api/')) {
      console.log(`[API RESP] ${resp.status()} ${resp.url()}`);
    }
  });

  console.log('Navigating to http://localhost:5173/onboarding ...');
  await page.goto('http://localhost:5173/onboarding');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('#full-name').fill('Alex Chen');
  const careerInp = page.locator('input[aria-label="e.g. Distributed Systems Engineer, Platform Lead, Python Backend"]');
  await careerInp.fill('Full Stack Developer');

  const btn = page.getByRole('button', { name: /Continue to Workspace/i });
  console.log('Button disabled?', await btn.isDisabled());

  console.log('Clicking Continue to Workspace...');
  await btn.click();

  // Wait 10 seconds and see what happened
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(1000);
    const url = page.url();
    const btnText = await btn.textContent().catch(() => 'no btn');
    console.log(`Second ${i + 1}: URL=${url}, ButtonText="${btnText}"`);
    if (url.includes('/dashboard')) {
      console.log('SUCCESS! Navigated to dashboard.');
      break;
    }
  }

  await browser.close();
})();
