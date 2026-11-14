const { chromium } = require('/usr/lib/chatgpt/resources/cua_node/lib/node_modules/playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/google/chrome/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[BROWSER ${msg.type()}]`, msg.text()));
  page.on('requestfailed', req => console.log('[NET FAIL]', req.url(), req.failure()));

  console.log('Navigating to onboarding...');
  await page.goto('http://127.0.0.1:5173/onboarding');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('#full-name').fill('Alex Chen');
  await page.locator('input[aria-label="e.g. Distributed Systems Engineer, Platform Lead, Python Backend"]').fill('Full Stack Developer');

  console.log('Clicking Continue to Workspace...');
  const t0 = Date.now();
  await page.getByRole('button', { name: /Continue to Workspace/i }).click();

  try {
    await page.waitForURL('**/dashboard', { timeout: 60000 });
    console.log(`Navigation to /dashboard succeeded in ${(Date.now() - t0) / 1000}s!`);
    console.log('Current URL:', page.url());
    console.log('Heading:', await page.locator('h1').textContent());
  } catch (err) {
    console.log('Navigation failed:', err.message);
    const alertMsg = await page.locator('[role="alert"]').textContent().catch(() => 'no alert');
    console.log('Alert on page:', alertMsg);
  }

  await browser.close();
})();
