/** Opt-in REAL browser/hosted-AI journey. Creates a disposable session and consumes provider quota. */
import { test, expect } from '@playwright/test';
test('live backend browser journey (no mocks)', async ({page}) => {
  test.skip(!process.env.LIVE_API_URL, 'Set LIVE_API_URL to explicitly opt into hosted calls.');
  test.setTimeout(240000);
  await page.goto('/onboarding');
  await page.getByLabel('Full Name',{exact:true}).fill('Readiness live verification');
  await page.getByPlaceholder(/Distributed Systems Engineer/).fill('Python Backend Engineer');
  await page.getByRole('button',{name:'Continue to Workspace'}).click();
  await expect(page).toHaveURL(/dashboard/, {timeout:120000});
  await expect(page.getByText('AI Career Blueprint',{exact:true})).toBeVisible();
  await page.goto('/arena');
  await page.getByRole('button',{name:/Generate.*Assessment/}).first().click();
  await expect(page.getByRole('radio').first()).toBeAttached({timeout:120000});
  for (let index=0;index<3;index++) {
    await page.getByRole('radio').first().focus();
    await page.keyboard.press('Space');
    if(index<2) await page.getByRole('button',{name:'Next Question'}).click();
  }
  await page.getByRole('button',{name:'Submit All Answers'}).click();
  await page.goto('/career');
  await page.getByRole('button',{name:'Generate Adaptive Roadmap',exact:true}).click();
  const complete = page.getByRole('button',{name:'Complete Milestone & Unlock Next'}).first();
  await expect(complete).toBeVisible({timeout:120000});
  await complete.click();
  await expect(page.getByText('Completed',{exact:true}).first()).toBeVisible();
  await page.goto('/mentor');
  await page.getByPlaceholder(/Ask Adaptive Mentor/).fill('Based on my quiz and completed milestone, what should I practice next?');
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await expect(page.getByText('Suggested Inquiries:',{exact:true})).toBeVisible({timeout:120000});
  await page.reload();
  await expect(page.getByText('Suggested Inquiries:',{exact:true})).toBeVisible({timeout:30000});
});
