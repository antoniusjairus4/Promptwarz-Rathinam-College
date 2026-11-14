import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { LearnerProvider } from '@/context/LearnerContext';
import { AppLayout } from '@/components/layout/AppLayout';
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage').then(module => ({ default: module.OnboardingPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const SkillDnaPage = lazy(() => import('@/pages/SkillDnaPage').then(module => ({ default: module.SkillDnaPage })));
const SkillArenaPage = lazy(() => import('@/pages/SkillArenaPage').then(module => ({ default: module.SkillArenaPage })));
const CareerNavigatorPage = lazy(() => import('@/pages/CareerNavigatorPage').then(module => ({ default: module.CareerNavigatorPage })));
const LearningHubPage = lazy(() => import('@/pages/LearningHubPage').then(module => ({ default: module.LearningHubPage })));
const LiveJobExplorerPage = lazy(() => import('@/pages/LiveJobExplorerPage').then(module => ({ default: module.LiveJobExplorerPage })));
const AiMentorPage = lazy(() => import('@/pages/AiMentorPage').then(module => ({ default: module.AiMentorPage })));

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LearnerProvider>
        <BrowserRouter>
          <Suspense fallback={<p role="status" className="p-8">Loading page…</p>}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/skills" element={<SkillDnaPage />} />
              <Route path="/arena" element={<SkillArenaPage />} />
              <Route path="/career" element={<CareerNavigatorPage />} />
              <Route path="/learning" element={<LearningHubPage />} />
              <Route path="/jobs" element={<LiveJobExplorerPage />} />
              <Route path="/mentor" element={<AiMentorPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
          </Suspense>
        </BrowserRouter>
      </LearnerProvider>
    </ThemeProvider>
  );
};

export default App;
