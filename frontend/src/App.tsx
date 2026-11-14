import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { LearnerProvider } from '@/context/LearnerContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { SkillDnaPage } from '@/pages/SkillDnaPage';
import { SkillArenaPage } from '@/pages/SkillArenaPage';
import { CareerNavigatorPage } from '@/pages/CareerNavigatorPage';
import { LearningHubPage } from '@/pages/LearningHubPage';
import { LiveJobExplorerPage } from '@/pages/LiveJobExplorerPage';
import { AiMentorPage } from '@/pages/AiMentorPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LearnerProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </LearnerProvider>
    </ThemeProvider>
  );
};

export default App;
