import { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import RequireAuth from './components/RequireAuth';
import PageLoader from './components/PageLoader';
import { ThemeProvider } from './context/ThemeContext';
import { AgentStoreProvider } from './lib/agents/AgentStoreContext';
import { lazyWithRetry } from './lib/lazy-with-retry';

// ── Lazy-loaded routes ─────────────────────────────────────────────
const LandingPage   = lazyWithRetry(() => import('./pages/LandingPage'));
const AuthPage      = lazyWithRetry(() => import('./pages/AuthPage'));
const ResetPasswordPage = lazyWithRetry(() => import('./pages/ResetPasswordPage'));
const AdminPortal   = lazyWithRetry(() => import('./pages/AdminPortal'));
const DashboardLayout = lazyWithRetry(() => import('./pages/DashboardLayout'));
const PricingPage   = lazyWithRetry(() => import('./pages/PricingPage'));
const DemoPage      = lazyWithRetry(() => import('./pages/DemoPage'));
const FeaturesPage  = lazyWithRetry(() => import('./pages/FeaturesPage'));
const ChangelogPage = lazyWithRetry(() => import('./pages/ChangelogPage'));
const DocsPage      = lazyWithRetry(() => import('./pages/DocsPage'));
const AboutPage     = lazyWithRetry(() => import('./pages/AboutPage'));
const BlogPage      = lazyWithRetry(() => import('./pages/BlogPage'));
const ContactPage   = lazyWithRetry(() => import('./pages/ContactPage'));
const PrivacyPage   = lazyWithRetry(() => import('./pages/PrivacyPage'));
const TermsPage     = lazyWithRetry(() => import('./pages/TermsPage'));
const SecurityPage  = lazyWithRetry(() => import('./pages/SecurityPage'));
const CookiesPage   = lazyWithRetry(() => import('./pages/CookiesPage'));
const NotFoundPage  = lazyWithRetry(() => import('./pages/NotFoundPage'));

function AppRoutes() {
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

          <Route element={<PublicLayout />}>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
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
