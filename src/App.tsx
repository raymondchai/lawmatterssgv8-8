import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Pricing from "./pages/Pricing";
import LawFirms from "./pages/LawFirms";
import LawFirmProfile from "./pages/LawFirmProfile";
import Documents from "./pages/Documents";
import LegalQA from "./pages/LegalQA";
import { QuestionDetail } from "./components/qa";
import Login from "./pages/auth/Login";
import Debug from "./pages/Debug";
import DebugUpload from "./pages/DebugUpload";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/dashboard/Dashboard";
import DashboardLawFirms from "./pages/dashboard/LawFirms";
import Subscription from "./pages/dashboard/Subscription";
import Settings from "./pages/dashboard/Settings";
import SecuritySettings from "./pages/dashboard/SecuritySettings";
import Subscribe from "./pages/Subscribe";
import PaymentSuccess from "./pages/payment/PaymentSuccess";
import PaymentFailure from "./pages/payment/PaymentFailure";
import SharedDocument from "./pages/SharedDocument";
import PublicAnalysis from "./pages/PublicAnalysis";
import PublicAnalysisResult from "./pages/PublicAnalysisResult";
import TemplateBrowser from "./pages/TemplateBrowser";
import TemplatePreview from "./pages/TemplatePreview";

import SearchHistory from "./pages/dashboard/SearchHistory";
import NotFound from "./pages/NotFound";
import DebugAuth from "./pages/DebugAuth";
import AuthTest from "./pages/AuthTest";
import ClearAuth from "./pages/ClearAuth";
import { ROUTES } from "@/lib/config/constants";
import { AuthenticatedRoute, OptionalAuthRoute } from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthErrorBoundary from "@/components/auth/AuthErrorBoundary";

// Import test utilities for debugging in production
if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_MODE === 'true') {
  import("@/test/platformStatsTest");
}

// Lazy load heavy components to avoid loading large libraries on initial page load
const PdfAnnotationsDemo = lazy(() => import("./pages/PdfAnnotationsDemo"));

// Lazy load document-heavy components
const LazyDashboardDocuments = lazy(() => import("./pages/dashboard/Documents"));
const LazyAIAssistant = lazy(() => import("./pages/dashboard/AIAssistant"));
const LazyTemplates = lazy(() => import("./pages/dashboard/Templates"));
const LazyTemplateCustomize = lazy(() => import("./pages/TemplateCustomize"));
const LazyTemplateVersionManagement = lazy(() => import("./pages/TemplateVersionManagement"));
const LazyTemplateAnalytics = lazy(() => import("./pages/dashboard/TemplateAnalytics"));

// Lazy load admin components
const LazyAdmin = lazy(() => import("./pages/dashboard/Admin"));

const queryClient = new QueryClient();

const App = () => {
  return (
    <ErrorBoundary level="page">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthErrorBoundary>
              <AuthProvider>
          <Routes>
              <Route path={ROUTES.home} element={<Index />} />
              <Route path="/law-firms" element={<LawFirms />} />
              <Route path="/law-firms/:id" element={<LawFirmProfile />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/legal-qa" element={<LegalQA />} />
              <Route path="/legal-qa/:id" element={<QuestionDetail />} />
              <Route path={ROUTES.pricing} element={<Pricing />} />
              <Route path={ROUTES.login} element={<Login />} />
              <Route path={ROUTES.register} element={<Register />} />
              <Route path={ROUTES.forgotPassword} element={<ForgotPassword />} />
              <Route path={ROUTES.resetPassword} element={<ResetPassword />} />
              <Route path="/debug" element={<Debug />} />
              <Route path="/debug/upload" element={<DebugUpload />} />
              <Route path="/debug-auth" element={<DebugAuth />} />
              <Route path="/auth-test" element={<AuthTest />} />
              <Route path="/clear-auth" element={<ClearAuth />} />
              <Route path={ROUTES.dashboard} element={
                <AuthenticatedRoute>
                  <Dashboard />
                </AuthenticatedRoute>
              } />
              <Route path={ROUTES.documents} element={
                <AuthenticatedRoute>
                  <Suspense fallback={<div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>}>
                    <LazyDashboardDocuments />
                  </Suspense>
                </AuthenticatedRoute>
              } />
              <Route path="/dashboard/ai-assistant" element={
                <Suspense fallback={<div className="flex items-center justify-center h-screen">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>}>
                  <LazyAIAssistant />
                </Suspense>
              } />
              <Route path="/dashboard/templates" element={
                <Suspense fallback={<div className="flex items-center justify-center h-screen">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>}>
                  <LazyTemplates />
                </Suspense>
              } />
              <Route path="/dashboard/law-firms" element={<DashboardLawFirms />} />
              <Route path="/dashboard/admin" element={
                <Suspense fallback={<div className="flex items-center justify-center h-screen">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>}>
                  <LazyAdmin />
                </Suspense>
              } />
              <Route path="/dashboard/template-analytics" element={
                <Suspense fallback={<div className="flex items-center justify-center h-screen">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>}>
                  <LazyTemplateAnalytics />
                </Suspense>
              } />
              <Route path="/dashboard/search-history" element={<SearchHistory />} />
              <Route path="/dashboard/subscription" element={<Subscription />} />
              <Route path="/dashboard/settings" element={<Settings />} />
              <Route path="/dashboard/security" element={<SecuritySettings />} />
              <Route path="/subscribe/:tier" element={<Subscribe />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/failure" element={<PaymentFailure />} />
              <Route path="/shared/:shareToken" element={<SharedDocument />} />
              <Route path={ROUTES.publicAnalysis} element={<PublicAnalysis />} />
              <Route path={`${ROUTES.publicAnalysisResult}/:analysisId`} element={<PublicAnalysisResult />} />
              {/* Template Marketplace Routes */}
              <Route path={ROUTES.templateBrowser} element={<TemplateBrowser />} />
              <Route path={ROUTES.templateMarketplace} element={<TemplateBrowser />} />
              <Route path={`${ROUTES.templatePreview}/:slug`} element={<TemplatePreview />} />
              <Route path={`${ROUTES.templateCustomize}/:slug`} element={
                <Suspense fallback={<div className="flex items-center justify-center h-screen">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>}>
                  <LazyTemplateCustomize />
                </Suspense>
              } />
              <Route path={`/templates/:slug/versions`} element={
                <Suspense fallback={<div className="flex items-center justify-center h-screen">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>}>
                  <LazyTemplateVersionManagement />
                </Suspense>
              } />
              {/* PDF Annotations Demo Route */}
              <Route
                path="/pdf-annotations-demo"
                element={
                  <Suspense fallback={<div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>}>
                    <PdfAnnotationsDemo />
                  </Suspense>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
              </AuthProvider>
            </AuthErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
