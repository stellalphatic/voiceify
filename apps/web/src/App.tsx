import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import RequireAuth from './components/RequireAuth';
import PageLoader from './components/PageLoader';
import { ThemeProvider } from './context/ThemeContext';
import { AgentStoreProvider } from './lib/agents/AgentStoreContext';
import { usePixelUi } from './hooks/usePixelUi';

// ── Lazy-loaded routes ─────────────────────────────────────────────
const LandingPage   = lazy(() => import('./pages/LandingPage'));
const AuthPage      = lazy(() => import('./pages/AuthPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const AdminPortal   = lazy(() => import('./pages/AdminPortal'));
const DashboardLayout = lazy(() => import('./pages/DashboardLayout'));
const PricingPage   = lazy(() => import('./pages/PricingPage'));
const DemoPage      = lazy(() => import('./pages/DemoPage'));
const FeaturesPage  = lazy(() => import('./pages/FeaturesPage'));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'));
const DocsPage      = lazy(() => import('./pages/DocsPage'));
const AboutPage     = lazy(() => import('./pages/AboutPage'));
const CareersPage   = lazy(() => import('./pages/CareersPage'));
const BlogPage      = lazy(() => import('./pages/BlogPage'));
const ContactPage   = lazy(() => import('./pages/ContactPage'));
const PrivacyPage   = lazy(() => import('./pages/PrivacyPage'));
const TermsPage     = lazy(() => import('./pages/TermsPage'));
const SecurityPage  = lazy(() => import('./pages/SecurityPage'));
const CookiesPage   = lazy(() => import('./pages/CookiesPage'));

function AppRoutes() {
  usePixelUi();

  return (
    <BrowserRouter>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/"          element={<LandingPage />} />
            <Route path="/pricing"   element={<PricingPage />} />
            <Route path="/demo"      element={<DemoPage />} />
            <Route path="/features"  element={<FeaturesPage />} />
            <Route path="/changelog" element={<ChangelogPage />} />
            <Route path="/docs"      element={<DocsPage />} />
            <Route path="/about"     element={<AboutPage />} />
            <Route path="/careers"   element={<CareersPage />} />
            <Route path="/blog"      element={<BlogPage />} />
            <Route path="/contact"   element={<ContactPage />} />
            <Route path="/privacy"   element={<PrivacyPage />} />
            <Route path="/terms"     element={<TermsPage />} />
            <Route path="/security"  element={<SecurityPage />} />
            <Route path="/cookies"   element={<CookiesPage />} />
          </Route>

          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/admin/*"
            element={
              <RequireAuth>
                <AdminPortal />
              </RequireAuth>
            }
          />

          <Route
            path="/dashboard/*"
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AgentStoreProvider>
        <AppRoutes />
      </AgentStoreProvider>
    </ThemeProvider>
  );
}
