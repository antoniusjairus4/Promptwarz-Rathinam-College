/** Synthetic provider fixtures for UI regression; live integration is separately opt-in. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const examples = JSON.parse(readFileSync(new URL('../../contracts/api_examples.json', import.meta.url), 'utf8'));
const example = (path: string) => structuredClone(examples.operations.find((op: {route:string}) => op.route === path).response_json);

test('five-question interview, editable transcript, permission fallback and restoration', async ({page}) => {
  const created = example('/api/sessions');
  const initial = example('/api/interviews/start').interview;
  const answerTemplate = example('/api/interviews/answer').interview.answers[0];
  const summary = example('/api/interviews/summary').interview.summary;
  let interview: typeof initial | null = null;
  let denied = false;
  await page.addInitScript(() => {
    let attempts = 0;
    class DeniedRecognition {
      onerror: ((event:{error:string})=>void) | null = null;
      onend: (()=>void) | null = null;
      onresult: ((event: {results: {length: number; [index:number]: {isFinal:boolean; 0:{transcript:string}}}})=>void) | null = null;
      start() {
        if (attempts++ === 0) { this.onerror?.({error:'not-allowed'}); this.onend?.(); }
        else this.onresult?.({results:{length:1,0:{isFinal:true,0:{transcript:'Recognized speech fixture'}}}});
      }
      stop() { this.onend?.(); }
      abort() {}
    }
    Object.defineProperty(window,'SpeechRecognition',{value:DeniedRecognition});
  });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let response: unknown;
    if(path==='/api/health')response={status:'ok'};
    else if(path==='/api/v1/status')response=created.storage;
    else if(path.startsWith('/api/sessions/'))response=created.session;
    else if(path==='/api/interviews/current')response={interview,storage:created.storage};
    else if(path==='/api/interviews/start') {
      interview=structuredClone(initial); response={interview,storage:created.storage};
    } else if(path==='/api/interviews/answer') {
      const payload=route.request().postDataJSON();
      if(!denied) {denied=true;await route.fulfill({status:503,contentType:'application/json',body:'{"detail":"AI temporarily unavailable"}'});return;}
      interview.answers.push({...answerTemplate,question_id:payload.question_id,transcript:payload.transcript});response={interview,storage:created.storage};
    } else if(path==='/api/interviews/next') {
      const number=interview.questions.length+1;
      interview.questions.push({...initial.questions[0],id:'synthetic-question-'+number,number,question:'Synthetic practice question '+number});response={interview,storage:created.storage};
    } else if(path==='/api/interviews/summary') {interview.summary=summary;response={interview,storage:created.storage};}
    else {await route.fulfill({status:404,body:'{}'});return;}
    await route.fulfill({contentType:'application/json',body:JSON.stringify(response)});
  });
  await page.goto('/onboarding');
  await page.evaluate(({id,token})=>{localStorage.setItem('maximus_learner_id',id);localStorage.setItem('maximus_session_token',token);},{id:created.session_id,token:created.session_token});
  await page.goto('/interview');
  await page.getByLabel('Interview type').selectOption('mixed');
  await page.getByLabel('Difficulty',{exact:true}).selectOption('advanced');
  await page.getByRole('button',{name:'Start interview',exact:true}).click();
  await expect(page.getByText(/Question 1 of 5/)).toBeVisible();
  await page.getByRole('button',{name:'Start Recording',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Microphone access was denied');
  await page.getByRole('button',{name:'Start Recording',exact:true}).click();
  await expect(page.getByLabel('Your answer — review and edit before submitting')).toHaveValue('Recognized speech fixture');
  await expect(page.getByRole('button',{name:'Submit approved answer'})).toBeDisabled();
  await page.getByRole('button',{name:'Stop Recording',exact:true}).click();
  await expect(page.getByLabel('Your answer — review and edit before submitting')).toBeEnabled();
  for(let index=0;index<5;index++) {
    const textarea=page.getByLabel('Your answer — review and edit before submitting');
    await textarea.fill('My approved synthetic practice answer '+index);
    await page.getByRole('button',{name:'Submit approved answer'}).click();
    if(index===0) {
      await expect(page.getByRole('alert').first()).toContainText('AI temporarily unavailable');
      await expect(textarea).toHaveValue('My approved synthetic practice answer 0');
      await page.getByRole('button',{name:'Submit approved answer'}).click();
    }
    await expect(page.getByRole('heading',{name:'Answer feedback',exact:true})).toBeVisible();
    if(index<4)await page.getByRole('button',{name:'Next Question',exact:true}).click();
  }
  await page.getByRole('button',{name:'Generate interview summary'}).click();
  await expect(page.getByRole('heading',{name:'Interview summary',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading',{name:'Interview summary',exact:true})).toBeVisible();
  await page.setViewportSize({width:375,height:812});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
});

test('live AI interview through the browser', async ({page,request}) => {
  test.skip(!process.env.LIVE_API_URL, 'Opt-in: real hosted inference and a running backend required');
  test.setTimeout(240000);
  const created=await request.post(`${process.env.LIVE_API_URL}/api/sessions`,{data:{full_name:'Browser interview integration check',target_role:'Python Backend Developer',skills:['Python','HTTP']}});
  expect(created.status()).toBe(201);
  const session=await created.json();
  await page.goto('/onboarding');
  await page.evaluate(({id,token})=>{localStorage.setItem('maximus_learner_id',id);localStorage.setItem('maximus_session_token',token);},{id:session.session_id,token:session.session_token});
  await page.goto('/interview');
  const perform = async (name: string, operation: string) => {
    const [response] = await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === '/api/interviews/'+operation && response.request().method()==='POST', {timeout:65000}),
      page.getByRole('button',{name,exact:true}).click(),
    ]);
    expect(response.status(), `Interview ${operation} must return genuine saved output`).toBe(200);
    const result=await response.json();
    console.log(`Real interview ${operation}: ${result.interview.questions.length} questions, ${result.interview.answers.length} answers, durable=${result.storage.durable}`);
    return result.interview;
  };
  await perform('Start interview', 'start');
  for(let index=0;index<5;index++) {
    await expect(page.getByText(new RegExp(`Question ${index+1} of 5`))).toBeVisible();
    await page.getByLabel('Your answer — review and edit before submitting').fill('In a hypothetical project I would clarify requirements, discuss tradeoffs, validate inputs, write focused tests and measure the outcome. I would explain uncertainty and ask for feedback. I have not done this in a real job.');
    const result=await perform('Submit approved answer', 'answer');
    expect(result.answers).toHaveLength(index+1);
    await expect(page.getByRole('heading',{name:'Answer feedback',exact:true})).toBeVisible();
    if(index<4) await perform('Next Question', 'next');
  }
  await perform('Generate interview summary', 'summary');
  await expect(page.getByRole('heading',{name:'Interview summary',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading',{name:'Interview summary',exact:true})).toBeVisible();
});
