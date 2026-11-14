/** Opt-in deployed-site check. No mocks; creates a real learner and uses hosted providers. */
import {test, expect} from '@playwright/test';

test('production Skills-First recovery journey with durable learner memory', async ({page})=>{
  const site=process.env.PRODUCTION_SITE_URL;
  test.skip(!site,'Set PRODUCTION_SITE_URL to explicitly contact the deployed frontend.');
  test.setTimeout(600000);
  const go=async(path:string)=>{await page.goto(site+path);};
  const action=async(name:RegExp|string,path:string,method='POST')=>{
    const [response]=await Promise.all([
      page.waitForResponse(r=>new URL(r.url()).pathname===path&&r.request().method()===method,{timeout:125000}),
      page.getByRole('button',{name,exact:typeof name==='string'}).first().click(),
    ]);
    console.log(`Production ${method} ${path}: ${response.status()}`);
    expect(response.status()).toBeGreaterThanOrEqual(200);expect(response.status()).toBeLessThan(300);
    return response.json();
  };
  await go('/onboarding');
  await page.getByLabel('Full Name',{exact:true}).fill('Antonius Jairus — recovery verification');
  await page.getByRole('button',{name:'Skills-First Trajectory',exact:true}).click();
  await page.getByPlaceholder('e.g. Python, TypeScript, Docker, PostgreSQL').fill('React, Node.js, Express.js, MongoDB, JavaScript, C++');
  await page.getByPlaceholder(/Distributed Systems, Machine Learning/).fill('Cybersecurity, Full-stack development');
  const session=await action('Continue to Workspace','/api/sessions');
  expect(session.storage.durable).toBe(true);
  await expect(page).toHaveURL(/dashboard/);
  await go('/skills');
  await expect(page.getByRole('button',{name:'Analyze Skill Profile',exact:true})).toBeEnabled({timeout:30000});
  await page.getByPlaceholder(/psf\/requests/).fill('https://github.com/antoniusjairus4/portfolio');
  await page.getByPlaceholder('e.g. README.md, package.json').fill('README.md, package.json');
  const github=await action('Analyze','/api/github/analyze');
  expect(github.repositories.length).toBeGreaterThan(0);
  expect(github.repositories.some((repo:{findings:unknown[]})=>repo.findings.length>0)).toBe(true);
  await page.reload();
  await expect(page.getByRole('region',{name:'Saved GitHub observations'})).toBeVisible({timeout:30000});
  const profile=await action('Analyze Skill Profile','/api/profile/analyze');
  expect(profile.profile.provider).toBeTruthy();
  await page.reload();
  await expect(page.getByText(profile.profile.summary,{exact:true})).toBeVisible({timeout:30000});
  await page.setViewportSize({width:375,height:812});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.setViewportSize({width:1440,height:900});
  await go('/dashboard');
  await expect(page.getByRole('button',{name:/Generate.*Blueprint/}).first()).toBeVisible({timeout:30000});
  await action(/Generate.*Blueprint/,'/api/career/blueprint');
  await go('/arena');
  const generated=await action(/Generate.*Assessment/,`/api/v1/learners/${session.session_id}/assessments`);
  const questions=generated.assessment.questions;
  for(let index=0;index<questions.length;index++){
    await page.getByRole('radio').first().focus();await page.keyboard.press('Space');
    if(index<questions.length-1)await page.getByRole('button',{name:'Next Question',exact:true}).click();
  }
  await action('Submit All Answers',`/api/v1/learners/${session.session_id}/assessments/${generated.assessment.id}/submit`);
  await go('/career');
  await action('Generate Adaptive Roadmap','/api/roadmap/generate');
  await expect(page.getByRole('button',{name:'Complete Milestone & Unlock Next'}).first()).toBeVisible();
  await page.getByRole('button',{name:'Complete Milestone & Unlock Next'}).first().click();
  await expect(page.getByText('Learner-verified completed',{exact:true}).first()).toBeVisible();
  for(const [path,endpoint] of [['/learning','/api/resources/search'],['/jobs','/api/jobs/search']]){
    const [response]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname===endpoint&&r.request().method()==='GET',{timeout:30000}),go(path)]);
    expect(response.status()).toBe(200);
    await expect(page.getByRole('heading',{level:1})).toBeVisible();
  }
  await go('/mentor');
  await expect(page.getByPlaceholder(/Ask Adaptive Mentor/)).toBeEnabled({timeout:30000});
  await page.getByPlaceholder(/Ask Adaptive Mentor/).fill('Using my actual quiz gaps and progress, what should I practice next?');
  await action('Send','/api/mentor/chat');
  await expect(page.getByText('Suggested Inquiries:',{exact:true}).last()).toBeVisible();
  await page.reload();await expect(page.getByText('Suggested Inquiries:',{exact:true}).last()).toBeVisible({timeout:30000});
  await go('/interview');
  await expect(page.getByRole('button',{name:'Start interview',exact:true})).toBeEnabled({timeout:30000});
  await action('Start interview','/api/interviews/start');
  for(let index=0;index<5;index++){
    await expect(page.getByText(new RegExp(`Question ${index+1} of 5`))).toBeVisible();
    await page.getByLabel('Your answer — review and edit before submitting').fill('In a hypothetical project I would clarify requirements, explain tradeoffs, validate inputs, test the outcome and ask for feedback. I have not completed this scenario in a real job.');
    const result=await action('Submit approved answer','/api/interviews/answer');
    expect(result.storage.durable).toBe(true);
    if(index<4)await action('Next Question','/api/interviews/next');
  }
  await action('Generate interview summary','/api/interviews/summary');
  await page.reload();
  await expect(page.getByRole('heading',{name:'Interview summary',exact:true})).toBeVisible({timeout:30000});

});
