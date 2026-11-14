/** Synthetic API fixtures only: these tests are not evidence of live AI/provider availability. */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const examples = JSON.parse(readFileSync(new URL('../../contracts/api_examples.json', import.meta.url), 'utf8'));
const responseFor = (route: string) => structuredClone(examples.operations.find((operation: {route: string}) => operation.route === route).response_json);

async function mockBackend(page: Page) {
  const created = responseFor('/api/sessions');
  const state = created.session;
  const requests: string[] = [];
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method();
    requests.push(method + ' ' + path);
    let body: unknown = {}, status = 200;
    if (path === '/api/health') body = {status: 'ok'};
    else if (path === '/api/v1/status') body = state.storage;
    else if (path === '/api/sessions' && method === 'POST') {
      const payload = request.postDataJSON();
      Object.assign(state.learner, payload);
      state.learner.skills = (payload.skills || []).map((skill: string) => ({skill, provenance:'self_reported', verified:false, note:'Synthetic test declaration'}));
      body = {...created, session: state}; status = 201;
    } else if (path.startsWith('/api/sessions/')) body = state;
    else if (path === '/api/career/blueprint') {
      body = responseFor(path); state.blueprint = (body as {blueprint: unknown}).blueprint;
    } else if (path.endsWith('/assessments') && method === 'POST') {
      body = responseFor('/api/assessment/generate'); state.assessment = (body as {assessment: unknown}).assessment; state.result = null; state.roadmap = null;
    } else if (path.endsWith('/submit')) {
      body = responseFor('/api/assessment/evaluate'); state.result = (body as {result: unknown}).result; state.assessment.submitted = true;
    } else if (path.endsWith('/result')) { body = {result: state.result}; if (!state.result) status = 404; }
    else if (path.endsWith('/assessment')) { body = {assessment: state.assessment}; if (!state.assessment) status = 404; }
    else if ((path.endsWith('/roadmap') || path === '/api/roadmap/generate')) {
      if (method === 'POST') state.roadmap = responseFor('/api/roadmap/generate').roadmap;
      body = {roadmap: state.roadmap, storage: state.storage}; if (!state.roadmap) status = 404;
    } else if (path.includes('/roadmap/steps/')) { state.roadmap.steps[0].status='completed'; body={roadmap:state.roadmap, storage:state.storage}; }
    else if (path === '/api/mentor/chat') {
      body = responseFor(path); (body as {message:{user_message:string}}).message.user_message = request.postDataJSON().message;
      state.messages.push((body as {message:unknown}).message);
    } else if (path === '/api/resources/search') body=responseFor(path);
    else if (path === '/api/jobs/search') body={jobs:[{id:'synthetic-job', title:'Synthetic Python job', company:'Test fixture company', summary:'Synthetic fixture only', tags:['Python'], application_url:'https://example.com/original-application', sources:[{source:'test fixture',source_url:'https://example.com/source',application_url:'https://example.com/original-application'}]}],returned_count:1,providers:[{provider:'adzuna',status:'ok',cached:false}],matches:[]};
    else if (path.includes('/events')) body={events:state.events,storage:state.storage};
    else { status=404; body={detail:'No fixture for '+path}; }
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  return {state, requests};
}

async function onboard(page: Page, skills = false) {
  await page.goto('/onboarding');
  await page.getByLabel('Full Name', {exact:true}).fill('Browser test learner');
  if (skills) {
    await page.getByRole('button', {name:'Skills-First Trajectory',exact:true}).click();
    await page.getByPlaceholder(/Machine Learning/).fill('Wildlife conservation');
  } else await page.getByPlaceholder(/Distributed Systems Engineer/).fill('Wildlife Conservation Planner');
  await page.getByRole('button',{name:'Continue to Workspace'}).click();
  await expect(page).toHaveURL(/dashboard/);
}

test('career onboarding restores the actual session response and blueprint', async ({page}) => {
  const {state}=await mockBackend(page);
  await onboard(page);
  await page.getByRole('button',{name:/Generate.*Blueprint/}).first().click();
  await expect(page.getByText('AI Career Blueprint',{exact:true})).toBeVisible();
  expect(state.learner.target_role).toBe('Wildlife Conservation Planner');
  expect(await page.evaluate(()=>localStorage.getItem('maximus_learner_id'))).toBe(state.learner.id);
  await page.reload();
  await expect(page.getByText('AI Career Blueprint',{exact:true})).toBeVisible();
});

test('interests-only onboarding never inserts an invented skill', async ({page}) => {
  const {state}=await mockBackend(page);
  await onboard(page,true);
  expect(state.learner.skills).toEqual([]);
  expect(state.learner.interests).toEqual(['Wildlife conservation']);
});

test('quiz keyboard grading, contextual mentor and job filtering', async ({page}) => {
  const {requests}=await mockBackend(page);
  await onboard(page);
  await page.goto('/arena');
  await page.getByRole('button',{name:/Generate.*Assessment/}).first().click();
  for (let index=0; index<3; index++) {
    await page.getByRole('radio').first().focus();
    await page.keyboard.press('Space');
    if(index<2) await page.getByRole('button',{name:'Next Question'}).click();
  }
  await page.getByRole('button',{name:'Submit All Answers'}).click();
  await expect(page.getByText('10000%',{exact:true})).toHaveCount(0);
  await expect(page.getByText('100%',{exact:true}).first()).toBeVisible();
  const count=requests.length;
  await page.waitForTimeout(400);
  expect(requests.length-count).toBeLessThan(5); // Regresses the former render-triggered request loop.
  await page.goto('/career');
  await page.getByRole('button',{name:'Generate Adaptive Roadmap',exact:true}).click();
  await page.getByRole('button',{name:'Complete Milestone & Unlock Next'}).first().click();
  await expect(page.getByText('Completed',{exact:true}).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('Completed',{exact:true}).first()).toBeVisible();
  await page.goto('/learning');
  await expect.poll(()=>requests.includes('GET /api/resources/search')).toBeTruthy();
  await page.goto('/skills');
  await page.getByRole('button',{name:'Analyze Skill Profile',exact:true}).click();
  await expect.poll(()=>requests.includes('POST /api/profile/analyze')).toBeTruthy();
  await page.goto('/mentor');
  await page.getByPlaceholder(/Ask Adaptive Mentor/).fill('What should I practice?');
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await expect(page.getByText(/Practice HTTP based/)).toBeVisible();
  await page.goto('/jobs');
  await page.getByLabel('Job provider').selectOption('adzuna');
  await page.getByRole('button',{name:'Search Jobs'}).click();
  await expect(page.getByText('Synthetic Python job',{exact:true})).toBeVisible();
  await expect(page.locator('a[href="https://example.com/original-application"]')).toBeVisible();
  expect(requests).toContain('GET /api/jobs/search');
});

test('onboarding announces API failure and allows recovery', async ({page}) => {
  await mockBackend(page);
  await page.route('**/api/sessions',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Synthetic storage unavailable'})}));
  await page.goto('/onboarding');
  await page.getByPlaceholder(/Distributed Systems Engineer/).fill('Backend Engineer');
  await page.getByRole('button',{name:'Continue to Workspace'}).click();
  await expect(page.getByRole('alert')).toContainText('Synthetic storage unavailable');
  await expect(page.getByRole('button',{name:'Continue to Workspace'})).toBeEnabled();
});

test('WCAG automated onboarding scan and mobile keyboard dialog', async ({page}) => {
  await mockBackend(page);
  await page.setViewportSize({width:390,height:844});
  await page.goto('/onboarding');
  const results = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(results.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  await page.getByRole('button',{name:'Toggle navigation menu'}).click();
  await expect(page.getByRole('dialog',{name:'Navigation menu'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Close menu'})).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(()=>document.querySelector('[role=dialog]')?.contains(document.activeElement))).toBeTruthy();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Toggle navigation menu'})).toBeFocused();
});

test('untrusted link schemes are rejected without rewriting genuine source URLs', async ({page}) => {
  await mockBackend(page);
  await page.goto('/jobs');
  const results = await page.evaluate(async () => {
    // Exercise the actual production helper through Vite, not a mirrored implementation.
    const modulePath = '/src/lib/urls.ts';
    const {safeExternalUrl} = await import(/* @vite-ignore */ modulePath);
    return [safeExternalUrl('javascript:alert(1)'), safeExternalUrl('data:text/html,bad'), safeExternalUrl('https://example.com/original?job=1')];
  });
  expect(results).toEqual([undefined, undefined, 'https://example.com/original?job=1']);
});

for (const pathname of ['/dashboard','/skills','/arena','/career','/learning','/jobs','/mentor']) {
  test(`automated accessibility ${pathname}`, async ({page}) => {
    await mockBackend(page);
    await page.goto(pathname);
    await expect(page.locator('main')).toBeVisible();
    const results = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    expect(results.violations.map(v=>({id:v.id, nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  });
}

test('populated learning state remains accessible in both themes', async ({page}) => {
  await mockBackend(page);
  await onboard(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of ['Light','Dark']) {
    await page.getByRole('button',{name:theme,exact:true}).click();
    const results = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    expect(results.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);
  }
  await page.setViewportSize({width:320,height:800});
  await page.goto('/onboarding');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('health failure clears stale online status and retry recovers', async ({page}) => {
  await mockBackend(page);
  await page.goto('/onboarding');
  await expect(page.getByText('API Online', {exact:true})).toBeVisible();
  await page.route('**/api/health', route => route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Service temporarily unavailable'})}));
  await page.getByRole('button',{name:'Refresh connection status'}).click();
  await expect(page.getByText('API unavailable — retry', {exact:true})).toBeVisible();
  await expect(page.getByText('API Online', {exact:true})).toHaveCount(0);
  await page.route('**/api/health', route => route.fulfill({contentType:'application/json',body:'{"status":"ok"}'}));
  await page.getByRole('button',{name:'Refresh connection status'}).click();
  await expect(page.getByText('API Online', {exact:true})).toBeVisible();
});

test('onboarding does not wait for hidden AI generation', async ({page}) => {
  const {requests}=await mockBackend(page);
  await onboard(page,true);
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
  expect(requests.filter(request=>request==='POST /api/career/blueprint')).toEqual([]);
});

test('failed restoration retains credentials and a coalesced retry restores the learner', async ({page}) => {
  await mockBackend(page);
  const created=responseFor('/api/sessions');
  await page.goto('/onboarding');
  await page.evaluate(({id,token})=>{localStorage.setItem('maximus_learner_id',id);localStorage.setItem('maximus_session_token',token);},{id:created.session_id,token:created.session_token});
  let calls=0;
  await page.route('**/api/sessions/*', async route=>{
    calls++;
    await route.fulfill({status:503,contentType:'application/json',body:'{"detail":"Temporary tunnel outage"}'});
  });
  await page.goto('/skills');
  await expect(page.getByRole('alert').first()).toContainText('Session restoration failed');
  expect(await page.evaluate(()=>Boolean(localStorage.getItem('maximus_session_token')))).toBe(true);
  expect(calls).toBe(1);
  await page.route('**/api/sessions/*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(created.session)}));
  await page.getByRole('button',{name:'Retry session restoration',exact:true}).click();
  await expect(page.getByRole('button',{name:'Analyze Skill Profile',exact:true})).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.route('**/api/sessions/*',route=>route.fulfill({status:404,contentType:'application/json',body:'{"detail":"Session missing"}'}));
  await page.reload();
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('maximus_session_token'))).toBe(null);
  await expect(page.getByText('Restoring your saved learner session…',{exact:true})).toHaveCount(0);
});

test('GitHub import uses one session-linked request and restores real-shaped findings', async ({page})=>{
  const {requests}=await mockBackend(page);
  const imported=responseFor('/api/github/analyze');
  imported.providers=[{provider:'github',status:'ok',cached:false}];
  imported.repositories=[{repository:{full_name:'synthetic/portfolio',url:'https://github.com/synthetic/portfolio',description:'Synthetic UI fixture',language:'Python',stars:0,forks:0,default_branch:'main',pushed_at:null,license:null},tree_sha:'synthetic-tree',inspected_paths:['app.py'],architecture_paths:['app.py'],files:[],limitations:['Synthetic test fixture'],findings:[{label:'Python',statement:'Synthetic source observation; not verified competence',file_path:'app.py',source_url:'https://github.com/synthetic/portfolio/blob/main/app.py',sha:'synthetic-sha',excerpt:'Synthetic test fixture',verified:false}]}];
  const created=responseFor('/api/sessions');
  let count=0;
  await page.route('**/api/github/analyze', async route=>{
    count++;
    expect(route.request().postDataJSON().session_id).toBe(created.session_id);
    await route.fulfill({contentType:'application/json',body:JSON.stringify(imported)});
  });
  await onboard(page,true);
  await page.goto('/skills');
  await page.getByPlaceholder(/psf\/requests/).fill('https://github.com/antoniusjairus4/portfolio');
  await page.getByRole('button',{name:'Analyze',exact:true}).click();
  await expect(page.getByRole('region',{name:'Saved GitHub observations'})).toBeVisible();
  expect(count).toBe(1);
  expect(requests.filter(request=>request.includes('/integrations/github/'))).toEqual([]);
  const saved={...created.session,github_repositories:imported.repositories};
  await page.route('**/api/sessions/*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(saved)}));
  await page.reload();
  await expect(page.getByRole('region',{name:'Saved GitHub observations'})).toBeVisible();
});
