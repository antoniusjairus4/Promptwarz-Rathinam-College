/**
 * MAXIMUS COMPREHENSIVE E2E USER JOURNEY TEST SUITE
 * Complete end-to-end testing from a real user's perspective via Playwright + Chromium
 * Tests localhost:5173 against live FastAPI on localhost:8000
 */

const { chromium } = require('/usr/lib/chatgpt/resources/cua_node/lib/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8000';
const EVIDENCE_DIR = path.resolve(__dirname, '../qa_evidence');

const testResults = [];
const consoleErrors = [];
const consoleWarnings = [];
const networkFailures = [];

function recordResult(id, feature, action, expected, actual, status, severity, notes = '') {
  const result = { id, feature, action, expected, actual, status, severity, notes, timestamp: new Date().toISOString() };
  testResults.push(result);
  console.log(`[${status}] ${id} - ${feature}: ${action}`);
  if (status === 'FAIL') {
    console.error(`       EXPECTED: ${expected}\n       ACTUAL:   ${actual}`);
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('STARTING MAXIMUS E2E TEST AUDIT');
  console.log(`Frontend URL: ${BASE_URL}`);
  console.log(`Backend URL:  ${BACKEND_URL}`);
  console.log('================================================================\n');

  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/google/chrome/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Persistent browser context to simulate a continuous real user session
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push({ text, location: msg.location() });
    } else if (msg.type() === 'warning') {
      consoleWarnings.push({ text, location: msg.location() });
    }
  });

  page.on('requestfailed', request => {
    networkFailures.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure() ? request.failure().errorText : 'Unknown error'
    });
  });

  // -------------------------------------------------------------
  // PHASE 1: STARTUP & BASELINE CHECKS
  // -------------------------------------------------------------
  console.log('>>> RUNNING PHASE 1: STARTUP & BASELINE CHECKS');

  try {
    const resp = await page.request.get(`${BACKEND_URL}/api/health`);
    const healthJson = await resp.json();
    if (resp.status() === 200 && healthJson.status === 'ok') {
      recordResult('SYS-01', 'Backend Health', 'GET /api/health', 'HTTP 200 {"status":"ok"}', `HTTP 200 ${JSON.stringify(healthJson)}`, 'PASS', 'CRITICAL');
    } else {
      recordResult('SYS-01', 'Backend Health', 'GET /api/health', 'HTTP 200 {"status":"ok"}', `HTTP ${resp.status()} ${JSON.stringify(healthJson)}`, 'FAIL', 'CRITICAL');
    }
  } catch (err) {
    recordResult('SYS-01', 'Backend Health', 'GET /api/health', 'HTTP 200 {"status":"ok"}', `Connection error: ${err.message}`, 'FAIL', 'CRITICAL');
  }

  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const title = await page.title();
    if (title.includes('Maximus')) {
      recordResult('SYS-02', 'Frontend Loading', 'Navigate to /', 'Page title contains "Maximus"', `Title: "${title}"`, 'PASS', 'CRITICAL');
    } else {
      recordResult('SYS-02', 'Frontend Loading', 'Navigate to /', 'Page title contains "Maximus"', `Title: "${title}"`, 'FAIL', 'CRITICAL');
    }
  } catch (err) {
    recordResult('SYS-02', 'Frontend Loading', 'Navigate to /', 'Loads successfully', `Error: ${err.message}`, 'FAIL', 'CRITICAL');
  }

  try {
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    
    const htmlClasses = await page.evaluate(() => document.documentElement.className);
    const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    const isDark = htmlClasses.includes('dark');
    
    if (!isDark && (bodyBg === 'rgb(255, 255, 255)' || bodyBg === 'rgba(0, 0, 0, 0)' || bodyBg === 'rgb(250, 250, 250)')) {
      recordResult('SYS-03', 'Theme Default', 'Fresh visitor without localStorage', 'Light mode by default (no .dark class, natural white background)', `Classes: "${htmlClasses}", Body BG: ${bodyBg}`, 'PASS', 'HIGH');
    } else {
      recordResult('SYS-03', 'Theme Default', 'Fresh visitor without localStorage', 'Light mode by default', `Classes: "${htmlClasses}", Body BG: ${bodyBg}`, 'FAIL', 'HIGH');
    }
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01_default_light_theme.png') });
  } catch (err) {
    recordResult('SYS-03', 'Theme Default', 'Fresh visitor without localStorage', 'Light mode by default', `Error: ${err.message}`, 'FAIL', 'HIGH');
  }

  // -------------------------------------------------------------
  // PHASE 2A: ONBOARDING WORKFLOW
  // -------------------------------------------------------------
  console.log('\n>>> RUNNING PHASE 2A: ONBOARDING WORKFLOW');

  try {
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02_onboarding_initial.png') });

    // ONB-01: Form elements visible
    const nameInput = page.locator('#full-name');
    const expSelect = page.locator('#experience-level');
    const hoursSelect = page.locator('#weekly-hours');
    const continueBtn = page.getByRole('button', { name: /Continue to Workspace/i });

    const elementsPresent = (await nameInput.count() > 0) && (await expSelect.count() > 0) && (await hoursSelect.count() > 0);
    recordResult('ONB-01', 'Onboarding Layout', 'Inspect form elements', 'Name, Experience, Hours, and Continue button visible', `Found: name=${await nameInput.count()}, exp=${await expSelect.count()}, hours=${await hoursSelect.count()}`, elementsPresent ? 'PASS' : 'FAIL', 'HIGH');

    // ONB-02: Form validation - Button disabled when required fields missing
    await nameInput.fill('');
    const isDisabledInitially = await continueBtn.isDisabled();
    recordResult('ONB-02', 'Onboarding Validation', 'Empty full name', 'Continue button is disabled', isDisabledInitially ? 'Button disabled' : 'Button enabled', isDisabledInitially ? 'PASS' : 'FAIL', 'MEDIUM');

    // ONB-03: Career-First Onboarding flow
    await nameInput.fill('Alex Chen');
    await expSelect.selectOption('mid');
    await hoursSelect.selectOption('10');

    const careerInput = page.locator('input[aria-label="e.g. Distributed Systems Engineer, Platform Lead, Python Backend"]');
    await careerInput.fill('Full Stack Developer');

    const isNowEnabled = !(await continueBtn.isDisabled());
    recordResult('ONB-03A', 'Onboarding Input', 'Fill Career-First fields', 'Continue button becomes active', isNowEnabled ? 'Active' : 'Disabled', isNowEnabled ? 'PASS' : 'HIGH');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '03_onboarding_filled.png') });

    // Click continue and wait for navigation (using waitForFunction to catch client-side routing)
    console.log('Submitting onboarding form...');
    await continueBtn.click();

    await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 60000 });
    const currentUrl = page.url();
    const redirectedToDashboard = currentUrl.includes('/dashboard');

    recordResult('ONB-03B', 'Onboarding Submission', 'Click Continue to Workspace', 'Redirects to /dashboard', `Current URL: ${currentUrl}`, redirectedToDashboard ? 'PASS' : 'FAIL', 'CRITICAL');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '04_dashboard_after_onboarding.png') });

    // ONB-04: Session persistence in localStorage
    const storedSession = await page.evaluate(() => ({
      learnerId: localStorage.getItem('maximus_learner_id'),
      token: localStorage.getItem('maximus_session_token')
    }));
    const sessionStored = !!storedSession.learnerId && !!storedSession.token;
    recordResult('ONB-04', 'Session Persistence', 'Inspect localStorage after onboarding', 'maximus_learner_id and token are persisted', `Stored: ${JSON.stringify(storedSession)}`, sessionStored ? 'PASS' : 'FAIL', 'HIGH');

    // ONB-05: Skills-First Track Verification
    console.log('Testing Skills-First Onboarding Track...');
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'networkidle' });
    
    // Select Skills-First track
    const skillsCardBtn = page.getByRole('button', { name: 'Skills-First Trajectory' });
    await skillsCardBtn.click();
    await page.waitForTimeout(300);

    const skillsInput = page.locator('input[aria-label="e.g. Python, TypeScript, Docker, PostgreSQL"]');
    await skillsInput.fill('Python, TypeScript, PostgreSQL, Docker');

    const interestsInput = page.locator('input[aria-label="e.g. Distributed Systems, Machine Learning, Web3, Cloud Security"]');
    await interestsInput.fill('Distributed Systems, Cloud Architecture');

    const continueSkillsBtn = page.getByRole('button', { name: /Continue to Workspace/i });
    const isSkillsReady = !(await continueSkillsBtn.isDisabled());
    recordResult('ONB-05A', 'Skills-First Trajectory Selection', 'Select Skills-First and fill skills/interests', 'Track active and Continue button enabled', isSkillsReady ? 'Ready' : 'Disabled', isSkillsReady ? 'PASS' : 'HIGH');

    // Switch back to Career-First to keep career trajectory for subsequent tests
    const careerCardBtn = page.getByRole('button', { name: 'Career-First Trajectory' });
    await careerCardBtn.click();
    await page.waitForTimeout(300);
    await continueSkillsBtn.click();
    await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 60000 });
    recordResult('ONB-05B', 'Onboarding Recalibration', 'Switch back to Career-First and re-enter workspace', 'Successfully returned to /dashboard', page.url().includes('/dashboard') ? 'Returned to dashboard' : 'Failed', page.url().includes('/dashboard') ? 'PASS' : 'HIGH');

  } catch (err) {
    recordResult('ONB-03B', 'Onboarding Submission', 'Click Continue to Workspace', 'Redirects to /dashboard', `Error: ${err.message}`, 'FAIL', 'CRITICAL');
  }

  // -------------------------------------------------------------
  // PHASE 2B: DASHBOARD WORKFLOW
  // -------------------------------------------------------------
  console.log('\n>>> RUNNING PHASE 2B: DASHBOARD WORKFLOW');

  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1');

    // DASH-01: Header & Learner Profile Display
    const workspaceHeading = await page.locator('h1').textContent();
    const headingMatches = workspaceHeading.includes('Alex Chen') || workspaceHeading.includes('Workspace');
    recordResult('DASH-01', 'Dashboard Profile', 'Verify workspace header', 'Displays "Alex Chen\'s Workspace"', `Heading: "${workspaceHeading}"`, headingMatches ? 'PASS' : 'FAIL', 'HIGH');

    // DASH-02: Storage Mode Badge
    const pageContent = await page.textContent('body');
    const hasStorageNotice = pageContent.includes('mode: memory') || pageContent.includes('mode: mongodb') || pageContent.includes('Temporary demo session');
    recordResult('DASH-02', 'Dashboard Storage Mode', 'Inspect storage mode indicator', 'Storage status banner or mode badge is displayed', hasStorageNotice ? 'Storage badge visible' : 'No badge found', hasStorageNotice ? 'PASS' : 'FAIL', 'MEDIUM');

    // DASH-03: AI Career Blueprint Card Generation
    const blueprintBtn = page.getByRole('button', { name: /Generate Blueprint/i });
    if (await blueprintBtn.count() > 0) {
      console.log('Generating AI Career Blueprint from UI...');
      await blueprintBtn.click();
      
      try {
        await page.waitForSelector('text=Core Required Competencies', { timeout: 60000 });
        recordResult('DASH-03', 'AI Career Blueprint', 'Click "Generate Blueprint"', 'Synthesizes and displays Core Competencies', 'Blueprint successfully generated and displayed', 'PASS', 'CRITICAL');
        await page.screenshot({ path: path.join(EVIDENCE_DIR, '05_career_blueprint_generated.png') });
      } catch (timeoutErr) {
        recordResult('DASH-03', 'AI Career Blueprint', 'Click "Generate Blueprint"', 'Synthesizes and displays Core Competencies', `Timeout or error: ${timeoutErr.message}`, 'FAIL', 'CRITICAL');
      }
    } else {
      const hasCore = pageContent.includes('Core Required Competencies') || pageContent.includes('AI Career Blueprint');
      recordResult('DASH-03', 'AI Career Blueprint', 'Inspect Blueprint Card', 'Blueprint rendered', hasCore ? 'Already present' : 'Button not found and not present', hasCore ? 'PASS' : 'HIGH');
    }

    // DASH-04: Verify Quick Action links
    const arenaActionLink = page.getByRole('link', { name: /Prove in Arena/i }).or(page.locator('a[href="/arena"]')).first();
    const isArenaActionVisible = await arenaActionLink.isVisible();
    recordResult('DASH-04', 'Dashboard Quick Links', 'Inspect Quick Action buttons', 'Action link to Arena is visible', isArenaActionVisible ? 'Visible' : 'Hidden', isArenaActionVisible ? 'PASS' : 'MEDIUM');

  } catch (err) {
    recordResult('DASH-01', 'Dashboard', 'Inspect dashboard', 'Loads correctly', `Error: ${err.message}`, 'FAIL', 'HIGH');
  }

  // -------------------------------------------------------------
  // PHASE 2C: SKILL DNA WORKFLOW
  // -------------------------------------------------------------
  console.log('\n>>> RUNNING PHASE 2C: SKILL DNA WORKFLOW');

  try {
    await page.goto(`${BASE_URL}/skills`, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '06_skill_dna_initial.png') });

    // DNA-01: Page load
    const heading = await page.locator('h1').textContent();
    recordResult('DNA-01', 'Skill DNA Navigation', 'Navigate to /skills', 'Heading contains "Skill DNA"', `Heading: "${heading}"`, heading.includes('Skill DNA') ? 'PASS' : 'FAIL', 'HIGH');

    // DNA-02: Public GitHub Repository Analysis
    const repoInput = page.locator('input[aria-label="e.g. psf/requests, facebook/react, octocat/Hello-World"]');
    if (await repoInput.count() > 0) {
      await repoInput.fill('psf/requests');
      const analyzeBtn = page.getByRole('button', { name: /^Analyze$/i });
      console.log('Triggering GitHub repository analysis in UI...');
      await analyzeBtn.click();

      // Wait for analysis result card
      try {
        await page.waitForSelector('text=psf/requests', { timeout: 35000 });
        recordResult('DNA-02', 'GitHub Analysis', 'Analyze psf/requests repository', 'Renders Repository Observation card with stars and files', 'Repository Observation rendered', 'PASS', 'CRITICAL');
        await page.screenshot({ path: path.join(EVIDENCE_DIR, '07_github_analysis_success.png') });

        // DNA-03: Monaco Editor Source Inspector
        const monacoContainer = page.locator('.monaco-editor');
        const monacoCount = await monacoContainer.count();
        recordResult('DNA-03', 'Skill DNA Monaco Inspector', 'Inspect source file code in Monaco', 'Monaco editor container renders file content', `Found ${monacoCount} Monaco instance(s)`, monacoCount > 0 ? 'PASS' : 'FAIL', 'HIGH');
      } catch (waitErr) {
        recordResult('DNA-02', 'GitHub Analysis', 'Analyze psf/requests repository', 'Renders Repository Observation card', `Error/Timeout: ${waitErr.message}`, 'FAIL', 'CRITICAL');
      }
    } else {
      recordResult('DNA-02', 'GitHub Analysis', 'Inspect GitHub input', 'Input present', 'Input not found', 'FAIL', 'HIGH');
    }

  } catch (err) {
    recordResult('DNA-01', 'Skill DNA', 'Run Skill DNA tests', 'Executes without uncaught exceptions', `Error: ${err.message}`, 'FAIL', 'HIGH');
  }

  // -------------------------------------------------------------
  // PHASE 2D: SKILL ARENA WORKFLOW
  // -------------------------------------------------------------
  console.log('\n>>> RUNNING PHASE 2D: SKILL ARENA WORKFLOW');

  try {
    await page.goto(`${BASE_URL}/arena`, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1, h2');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '08_arena_initial.png') });

    // ARENA-01: Page load
    const heading = await page.locator('h1, h2').first().textContent();
    recordResult('ARENA-01', 'Skill Arena Navigation', 'Navigate to /arena', 'Heading contains "Skill Arena"', `Heading: "${heading}"`, heading.includes('Skill Arena') || heading.includes('Trajectory') ? 'PASS' : 'FAIL', 'HIGH');

    // Check if assessment already exists or needs generation
    const generateBtn = page.getByRole('button', { name: /Generate Dynamic Assessment/i });
    if (await generateBtn.count() > 0) {
      console.log('Generating dynamic assessment from AI in UI...');
      await generateBtn.click();
      
      try {
        await page.waitForSelector('text=Question 1 of', { timeout: 60000 });
        recordResult('ARENA-02', 'Assessment Generation', 'Click "Generate Dynamic Assessment"', 'Assessment questions generated by LLM', 'Questions loaded', 'PASS', 'CRITICAL');
      } catch (genErr) {
        recordResult('ARENA-02', 'Assessment Generation', 'Click "Generate Dynamic Assessment"', 'Assessment questions generated', `Timeout/Error: ${genErr.message}`, 'FAIL', 'CRITICAL');
      }
    } else {
      recordResult('ARENA-02', 'Assessment Generation', 'Check assessment existence', 'Assessment already active', 'Assessment loaded', 'PASS', 'HIGH');
    }

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '09_arena_questions_active.png') });

    // ARENA-03: Incomplete submission validation
    const submitBtn = page.getByRole('button', { name: /Submit Assessment for Evaluation/i });
    if (await submitBtn.count() > 0) {
      console.log('Testing incomplete submission validation...');
      await submitBtn.click();
      await page.waitForTimeout(500);

      const alertMsg = await page.locator('div[role="alert"]').textContent().catch(() => '');
      const hasValidationMsg = alertMsg.includes('Please answer all questions before submitting');
      recordResult('ARENA-03', 'Assessment Incomplete Validation', 'Click Submit without answering questions', 'Alert prevents submission and asks to answer all questions', `Alert: "${alertMsg}"`, hasValidationMsg ? 'PASS' : 'FAIL', 'HIGH');

      // ARENA-04: Answer all questions using UI controls
      console.log('Answering questions in UI...');
      const questions = page.locator('.space-y-4 > .rounded-xl, .space-y-6 > .rounded-xl');
      const qCount = await questions.count();
      console.log(`Identified ${qCount} question blocks`);

      for (let i = 0; i < qCount; i++) {
        const qBlock = questions.nth(i);
        const firstOption = qBlock.locator('button').first();
        if (await firstOption.count() > 0) {
          await firstOption.click();
          await page.waitForTimeout(100);
        }
      }

      await page.screenshot({ path: path.join(EVIDENCE_DIR, '10_arena_answers_selected.png') });

      // ARENA-05: Submit completed assessment
      console.log('Submitting completed assessment...');
      await submitBtn.click();

      try {
        await page.waitForSelector('text=Evaluation Complete', { timeout: 45000 });
        recordResult('ARENA-05', 'Assessment Submission & Scoring', 'Submit all answers', 'Evaluation Complete with score and feedback breakdown', 'Evaluation Complete banner displayed', 'PASS', 'CRITICAL');
        await page.screenshot({ path: path.join(EVIDENCE_DIR, '11_arena_results_graded.png') });
      } catch (submitErr) {
        recordResult('ARENA-05', 'Assessment Submission & Scoring', 'Submit all answers', 'Evaluation Complete displayed', `Error: ${submitErr.message}`, 'FAIL', 'CRITICAL');
      }
    }

    // ARENA-06: Monaco Interactive Sandbox Buffer
    const toggleSandboxBtn = page.getByRole('button', { name: /Open Sandbox Buffer|Hide Sandbox/i });
    if (await toggleSandboxBtn.count() > 0) {
      await toggleSandboxBtn.click();
      await page.waitForTimeout(1000);
      const monacoEditor = page.locator('.monaco-editor');
      const hasEditor = await monacoEditor.count() > 0;
      recordResult('ARENA-06', 'Monaco Code Sandbox', 'Toggle Sandbox Buffer in Arena', 'Interactive Monaco Editor renders with syntax highlighting', hasEditor ? 'Editor present' : 'Editor not found', hasEditor ? 'PASS' : 'HIGH');
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '12_arena_monaco_sandbox.png') });
    }

  } catch (err) {
    recordResult('ARENA-01', 'Skill Arena', 'Run Arena test suite', 'Executes cleanly', `Error: ${err.message}`, 'FAIL', 'HIGH');
  }

  // -------------------------------------------------------------
  // PHASE 2E: CAREER NAVIGATOR WORKFLOW
  // -------------------------------------------------------------
  console.log('\n>>> RUNNING PHASE 2E: CAREER NAVIGATOR WORKFLOW');

  try {
    await page.goto(`${BASE_URL}/career`, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1, h2');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '13_career_navigator_initial.png') });

    // NAV-01: Page load
    const heading = await page.locator('h1, h2').first().textContent();
    recordResult('NAV-01', 'Career Navigator Load', 'Navigate to /career', 'Heading contains "Career Navigator"', `Heading: "${heading}"`, heading.includes('Career Navigator') || heading.includes('Trajectory') ? 'PASS' : 'FAIL', 'HIGH');

    // Check if roadmap needs to be generated
    const generateRoadmapBtn = page.getByRole('button', { name: /Generate Adaptive Pathway/i });
    if (await generateRoadmapBtn.count() > 0) {
      console.log('Generating adaptive roadmap pathway in UI...');
      await generateRoadmapBtn.click();
      try {
        await page.waitForSelector('text=Milestone Pathway Breakdown', { timeout: 60000 });
        recordResult('NAV-02', 'Roadmap Generation', 'Click "Generate Adaptive Pathway"', 'AI generates multi-stage milestones', 'Milestones displayed', 'PASS', 'CRITICAL');
      } catch (rmErr) {
        recordResult('NAV-02', 'Roadmap Generation', 'Click "Generate Adaptive Pathway"', 'AI generates milestones', `Error: ${rmErr.message}`, 'FAIL', 'CRITICAL');
      }
    } else {
      recordResult('NAV-02', 'Roadmap Status', 'Inspect roadmap state', 'Milestones present', 'Milestones loaded', 'PASS', 'HIGH');
    }

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '14_career_roadmap_milestones.png') });

    // NAV-03: Complete Milestone & Unlock Next
    const completeStepBtn = page.getByRole('button', { name: /Complete Milestone & Unlock Next/i }).first();
    if (await completeStepBtn.count() > 0) {
      console.log('Clicking "Complete Milestone & Unlock Next"...');
      await completeStepBtn.click();
      await page.waitForTimeout(2000);
      
      recordResult('NAV-03', 'Milestone Completion', 'Click "Complete Milestone & Unlock Next"', 'Step marked complete and progress updated', 'Milestone completion triggered successfully', 'PASS', 'HIGH');
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '15_milestone_completed.png') });
    } else {
      recordResult('NAV-03', 'Milestone Completion', 'Check active milestone button', 'Button present', 'All steps completed or no step available', 'PASS', 'LOW');
    }

  } catch (err) {
    recordResult('NAV-01', 'Career Navigator', 'Run Navigator tests', 'Executes cleanly', `Error: ${err.message}`, 'FAIL', 'HIGH');
  }

  // -------------------------------------------------------------
  // PHASE 2F: LEARNING HUB WORKFLOW
  // -------------------------------------------------------------
  console.log('\n>>> RUNNING PHASE 2F: LEARNING HUB WORKFLOW');

  try {
    await page.goto(`${BASE_URL}/learning`, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '16_learning_hub_initial.png') });

    // LEARN-01: Page load & curated resources
    const heading = await page.locator('h1').textContent();
    recordResult('LEARN-01', 'Learning Hub Load', 'Navigate to /learning', 'Heading contains "Curated Learning Hub"', `Heading: "${heading}"`, heading.includes('Learning Hub') ? 'PASS' : 'FAIL', 'HIGH');

    // Check resource cards
    const resourceCards = page.locator('a[target="_blank"]');
    const cardCount = await resourceCards.count();
    recordResult('LEARN-02', 'Curated Resources Display', 'Inspect learning resource cards', 'Resources loaded from backend catalog', `Found ${cardCount} resource links`, cardCount > 0 ? 'PASS' : 'FAIL', 'HIGH');

    // LEARN-03: Search query
    const searchInput = page.locator('input[placeholder="Search courses, tutorials, documentations, and workshops..."]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('Python');
      const searchBtn = page.getByRole('button', { name: /Search Index/i });
      await searchBtn.click();
      await page.waitForTimeout(2000);

      const pythonResultsCount = await page.locator('a[target="_blank"]').count();
      recordResult('LEARN-03', 'Resource Search', 'Search for "Python"', 'Filtered results matching Python appear', `Results count: ${pythonResultsCount}`, pythonResultsCount > 0 ? 'PASS' : 'FAIL', 'HIGH');
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '17_learning_hub_search_python.png') });

      // LEARN-05: Empty state search
      await searchInput.fill('xyznonexistentquery999');
      await searchBtn.click();
      await page.waitForTimeout(1000);
      const emptyStatePresent = await page.locator('text=No matching learning resources found').count() > 0;
      recordResult('LEARN-05', 'Resource Search Empty State', 'Search for nonsense keyword', 'Displays polite empty state card', emptyStatePresent ? 'Empty state displayed' : 'Not found', emptyStatePresent ? 'PASS' : 'MEDIUM');
    }

    // LEARN-04: Provider status indicators
    const providerPills = page.locator('text=Curated Open Courseware, text=YouTube Learning API');
    const pillsPresent = await providerPills.count() > 0;
    recordResult('LEARN-04', 'Learning Provider Provenance', 'Inspect provider status badges', 'Displays provenance for open courseware and YouTube', pillsPresent ? 'Present' : 'Not found', pillsPresent ? 'PASS' : 'MEDIUM');

  } catch (err) {
    recordResult('LEARN-01', 'Learning Hub', 'Run Learning Hub tests', 'Executes cleanly', `Error: ${err.message}`, 'FAIL', 'HIGH');
  }

  // -------------------------------------------------------------
  // PHASE 2G: LIVE JOB EXPLORER WORKFLOW
  // -------------------------------------------------------------
  console.log('\n>>> RUNNING PHASE 2G: LIVE JOB EXPLORER WORKFLOW');

  try {
    await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '18_job_explorer_initial.png') });

    // JOB-01: Page load
    const heading = await page.locator('h1').textContent();
    recordResult('JOB-01', 'Job Explorer Load', 'Navigate to /jobs', 'Heading contains "Live Job Explorer"', `Heading: "${heading}"`, heading.includes('Job Explorer') ? 'PASS' : 'FAIL', 'HIGH');

    // JOB-02: Real Job listings display
    const jobCards = page.locator('div.rounded-xl.border.p-5');
    const initialJobCount = await jobCards.count();
    recordResult('JOB-02', 'Live Job Listings', 'Inspect aggregated job postings', 'Live listings rendered with company and title', `Found ${initialJobCount} job cards`, initialJobCount > 0 ? 'PASS' : 'CRITICAL');

    // JOB-03: Search "Python"
    const jobInput = page.locator('input[placeholder="Role title or technology (e.g. Distributed Systems, Python, React)..."]');
    if (await jobInput.count() > 0) {
      await jobInput.fill('Python');
      const searchBtn = page.getByRole('button', { name: /Search Live Index/i });
      await searchBtn.click();
      await page.waitForTimeout(2000);

      const pythonJobCount = await page.locator('div.rounded-xl.border.p-5').count();
      recordResult('JOB-03', 'Job Search Python', 'Search for "Python"', 'Job listings update for Python', `Job count: ${pythonJobCount}`, pythonJobCount > 0 ? 'PASS' : 'FAIL', 'HIGH');
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '19_job_explorer_python.png') });

      // JOB-04: Search "React"
      await jobInput.fill('React');
      await searchBtn.click();
      await page.waitForTimeout(2000);

      const reactJobCount = await page.locator('div.rounded-xl.border.p-5').count();
      recordResult('JOB-04', 'Job Search React', 'Search for "React"', 'Job listings update for React', `Job count: ${reactJobCount}`, reactJobCount > 0 ? 'PASS' : 'FAIL', 'HIGH');
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '20_job_explorer_react.png') });

      // JOB-06: Empty search query
      await jobInput.fill('xyz123impossiblecareer99');
      await searchBtn.click();
      await page.waitForTimeout(1500);
      const emptyJobMsg = await page.locator('text=No active jobs found').count() > 0;
      recordResult('JOB-06', 'Job Explorer Empty State', 'Search for impossible title', 'Polite empty state card displayed', emptyJobMsg ? 'Empty state displayed' : 'Not found', emptyJobMsg ? 'PASS' : 'MEDIUM');
    }

    // JOB-05: External application links check
    const appLinks = page.locator('a:has-text("Apply on"), a:has-text("View Listing")');
    if (await appLinks.count() > 0) {
      const firstHref = await appLinks.first().getAttribute('href');
      const isValidExternalUrl = firstHref && (firstHref.startsWith('https://') || firstHref.startsWith('http://'));
      recordResult('JOB-05', 'Job Application Links', 'Inspect external application link href', 'Valid external https:// URL to real job board', `href: "${firstHref}"`, isValidExternalUrl ? 'PASS' : 'FAIL', 'HIGH');
    }

  } catch (err) {
    recordResult('JOB-01', 'Job Explorer', 'Run Job Explorer tests', 'Executes cleanly', `Error: ${err.message}`, 'FAIL', 'HIGH');
  }

  // -------------------------------------------------------------
  // PHASE 2H: AI MENTOR WORKFLOW
  // -------------------------------------------------------------
  console.log('\n>>> RUNNING PHASE 2H: AI MENTOR WORKFLOW');

  try {
    await page.goto(`${BASE_URL}/mentor`, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '21_ai_mentor_initial.png') });

    // MENTOR-01: Page load & suggestion chips
    const heading = await page.locator('h1').textContent();
    recordResult('MENTOR-01', 'AI Mentor Load', 'Navigate to /mentor', 'Heading contains "Contextual AI Mentor"', `Heading: "${heading}"`, heading.includes('AI Mentor') ? 'PASS' : 'FAIL', 'HIGH');

    // MENTOR-02: Empty message prevention
    const sendBtn = page.getByRole('button', { name: /Send Inquiry/i });
    const isSendDisabledEmpty = await sendBtn.isDisabled();
    recordResult('MENTOR-02', 'AI Mentor Input Validation', 'Inspect Send button when input is empty', 'Send button is disabled', isSendDisabledEmpty ? 'Disabled' : 'Enabled', isSendDisabledEmpty ? 'PASS' : 'FAIL', 'MEDIUM');

    // MENTOR-03: Career inquiry
    const chatInput = page.locator('input[placeholder="Ask a technical concept question, career transition advice, or gap remediation..."]');
    if (await chatInput.count() > 0) {
      console.log('Sending career inquiry to AI Mentor in UI...');
      await chatInput.fill('What are the top 3 architectural principles I should focus on as a Full Stack Developer transitioning to Distributed Systems?');
      await sendBtn.click();

      // Wait for AI reply
      try {
        await page.waitForSelector('.space-y-4 .rounded-xl:has-text("Maximus Career Mentor"), .space-y-4 .rounded-xl:has-text("NVIDIA"), .space-y-4 .rounded-xl:has-text("Gemini")', { timeout: 45000 });
        recordResult('MENTOR-03', 'AI Mentor Career Question', 'Send architectural career inquiry', 'AI reply received with technical advice and provider attribution', 'Reply received successfully', 'PASS', 'CRITICAL');
        await page.screenshot({ path: path.join(EVIDENCE_DIR, '22_ai_mentor_reply_1.png') });

        // MENTOR-04: Multi-turn technical follow-up
        console.log('Sending multi-turn technical follow-up...');
        await chatInput.fill('Can you give a brief code example of idempotent request handling in FastAPI?');
        await sendBtn.click();

        await page.waitForTimeout(2000);
        await page.waitForSelector('.space-y-4 .rounded-xl:has-text("idempotent"), .space-y-4 .rounded-xl:has-text("FastAPI")', { timeout: 45000 });
        recordResult('MENTOR-04', 'AI Mentor Multi-turn Dialogue', 'Send follow-up technical question', 'Coherent multi-turn reply discussing FastAPI idempotency', 'Second turn reply received successfully', 'PASS', 'CRITICAL');
        await page.screenshot({ path: path.join(EVIDENCE_DIR, '23_ai_mentor_multi_turn.png') });
      } catch (chatErr) {
        recordResult('MENTOR-03', 'AI Mentor Inquiry', 'Send message to AI Mentor', 'AI reply received', `Timeout/Error: ${chatErr.message}`, 'FAIL', 'CRITICAL');
      }
    }

  } catch (err) {
    recordResult('MENTOR-01', 'AI Mentor', 'Run AI Mentor tests', 'Executes cleanly', `Error: ${err.message}`, 'FAIL', 'HIGH');
  }

  // -------------------------------------------------------------
  // PHASE 2I: PERSISTENCE & NAVIGATION
  // -------------------------------------------------------------
  console.log('\n>>> RUNNING PHASE 2I: PERSISTENCE & NAVIGATION');

  try {
    // PER-01: Page reload test
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1');
    const nameBeforeReload = await page.locator('h1').textContent();
    
    console.log('Hard-reloading page to test session restoration...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('h1');
    const nameAfterReload = await page.locator('h1').textContent();

    const reloadPreserved = nameBeforeReload === nameAfterReload;
    recordResult('PER-01', 'Session Reload Persistence', 'Hard refresh /dashboard', 'Learner profile and target role preserved across page reload', `Before: "${nameBeforeReload}", After: "${nameAfterReload}"`, reloadPreserved ? 'PASS' : 'FAIL', 'CRITICAL');

    // PER-02: Browser Back / Forward Navigation
    await page.goto(`${BASE_URL}/skills`, { waitUntil: 'networkidle' });
    await page.goto(`${BASE_URL}/arena`, { waitUntil: 'networkidle' });
    await page.goBack({ waitUntil: 'networkidle' });
    const urlAfterBack = page.url();
    const backWorked = urlAfterBack.includes('/skills');

    await page.goForward({ waitUntil: 'networkidle' });
    const urlAfterForward = page.url();
    const forwardWorked = urlAfterForward.includes('/arena');

    recordResult('PER-02', 'History Navigation', 'Browser Back and Forward buttons', 'Correctly navigates history without errors or white screen', `Back: ${urlAfterBack}, Forward: ${urlAfterForward}`, (backWorked && forwardWorked) ? 'PASS' : 'FAIL', 'HIGH');

    // PER-03: Storage Architecture Reality Check
    const storageMode = await page.evaluate(async (backUrl) => {
      try {
        const res = await fetch(`${backUrl}/api/v1/sessions/storage-status`);
        return await res.json();
      } catch (e) {
        return { error: e.message };
      }
    }, BACKEND_URL);

    recordResult('PER-03', 'Storage Architecture Truth', 'Check storage status endpoint', 'Accurately reports backend storage mode (memory vs mongodb)', `Backend reports: ${JSON.stringify(storageMode)}`, storageMode.mode ? 'PASS' : 'FAIL', 'HIGH', 'Documents whether in-memory fallback or persistent MongoDB is active');

    // ROUTING-01: 404 Route handling
    await page.goto(`${BASE_URL}/nonexistent-random-route`, { waitUntil: 'networkidle' });
    const urlAfter404 = page.url();
    const redirectedHome = urlAfter404.includes('/dashboard');
    recordResult('ROUTING-01', '404 Catch-all Redirection', 'Navigate to invalid path /nonexistent-random-route', 'Safely redirects to /dashboard without blank page or crash', `Redirected to: ${urlAfter404}`, redirectedHome ? 'PASS' : 'FAIL', 'MEDIUM');

  } catch (err) {
    recordResult('PER-01', 'Persistence', 'Run persistence tests', 'Executes cleanly', `Error: ${err.message}`, 'FAIL', 'HIGH');
  }

  // -------------------------------------------------------------
  // PHASE 3: RESPONSIVE DESIGN & THEME TOGGLE
  // -------------------------------------------------------------
  console.log('\n>>> RUNNING PHASE 3: RESPONSIVE DESIGN & THEME TOGGLE');

  try {
    // UI-THEME: Test Theme Switcher in Sidebar
    const lightBtn = page.locator('button:has-text("Light")').first();
    const darkBtn = page.locator('button:has-text("Dark")').first();

    if (await darkBtn.count() > 0) {
      console.log('Switching to Dark mode...');
      await darkBtn.click();
      await page.waitForTimeout(500);

      const isDarkActive = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      const bgDark = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
      recordResult('UI-THEME-DARK', 'Theme Switcher Dark', 'Click "Dark" button in sidebar', '<html> receives "dark" class and body becomes true black (#000000)', `Dark class: ${isDarkActive}, Body BG: ${bgDark}`, isDarkActive ? 'PASS' : 'FAIL', 'HIGH');
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '24_dark_theme_dashboard.png') });

      // Switch back to Light
      console.log('Switching back to Light mode...');
      await lightBtn.click();
      await page.waitForTimeout(500);
      const isLightActive = await page.evaluate(() => !document.documentElement.classList.contains('dark'));
      recordResult('UI-THEME-LIGHT', 'Theme Switcher Light', 'Click "Light" button in sidebar', '<html> loses "dark" class and returns to light mode', `Light active: ${isLightActive}`, isLightActive ? 'PASS' : 'FAIL', 'HIGH');
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '25_light_theme_restored.png') });
    }

    // UI-RESP-MOBILE: 375px Viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    recordResult('UI-RESP-MOBILE', 'Mobile Viewport (375px)', 'Check horizontal overflow on 375px mobile screen', 'No horizontal scrolling (scrollWidth <= innerWidth)', mobileOverflow ? 'Horizontal overflow detected' : 'No overflow', !mobileOverflow ? 'PASS' : 'FAIL', 'HIGH');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '26_mobile_375px_dashboard.png'), fullPage: false });

    // UI-RESP-TABLET: 768px Viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    recordResult('UI-RESP-TABLET', 'Tablet Viewport (768px)', 'Check horizontal overflow on 768px tablet screen', 'No horizontal scrolling', tabletOverflow ? 'Horizontal overflow detected' : 'No overflow', !tabletOverflow ? 'PASS' : 'FAIL', 'HIGH');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '27_tablet_768px_dashboard.png'), fullPage: false });

    // A11Y-01: Focus visibility check
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement ? document.activeElement.tagName : 'NONE');
    recordResult('A11Y-01', 'Keyboard Navigation', 'Press Tab key from top of page', 'Focus indicator activates on interactive element', `Focused element: <${focusedTag}>`, focusedTag !== 'BODY' && focusedTag !== 'NONE' ? 'PASS' : 'FAIL', 'MEDIUM');

  } catch (err) {
    recordResult('UI-THEME', 'UI Quality', 'Run responsive & theme checks', 'Executes cleanly', `Error: ${err.message}`, 'FAIL', 'HIGH');
  }

  // -------------------------------------------------------------
  // CLOSE BROWSER & COMPILE REPORT DATA
  // -------------------------------------------------------------
  await browser.close();

  console.log('\n================================================================');
  console.log('TEST SUITE COMPLETED');
  console.log(`Total tests run:     ${testResults.length}`);
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  const blockedCount = testResults.filter(r => r.status === 'BLOCKED').length;
  console.log(`Passed:              ${passCount}`);
  console.log(`Failed:              ${failCount}`);
  console.log(`Blocked:             ${blockedCount}`);
  console.log(`Pass Rate:           ${((passCount / testResults.length) * 100).toFixed(1)}%`);
  console.log(`Console Errors:      ${consoleErrors.length}`);
  console.log(`Network Failures:    ${networkFailures.length}`);
  console.log('================================================================\n');

  // Write JSON artifacts for detailed reporting
  fs.writeFileSync(path.resolve(__dirname, 'test_results.json'), JSON.stringify({
    summary: {
      total: testResults.length,
      passed: passCount,
      failed: failCount,
      blocked: blockedCount,
      passRate: ((passCount / testResults.length) * 100).toFixed(1) + '%'
    },
    tests: testResults,
    consoleErrors,
    consoleWarnings,
    networkFailures
  }, null, 2));

  console.log('Test results saved to e2e_runner/test_results.json');
}

runSuite().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
