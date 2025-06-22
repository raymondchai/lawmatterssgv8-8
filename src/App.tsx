import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Suspense, lazy } from "react";
import Index from "./pages/Index";
import Pricing from "./pages/Pricing";
import LawFirms from "./pages/LawFirms";
import LawFirmProfile from "./pages/LawFirmProfile";
import Documents from "./pages/Documents";
import LegalQA from "./pages/LegalQA";
import { QuestionDetail } from "./components/qa";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/dashboard/Dashboard";
import DashboardDocuments from "./pages/dashboard/Documents";
import AIAssistant from "./pages/dashboard/AIAssistant";
import Templates from "./pages/dashboard/Templates";
import DashboardLawFirms from "./pages/dashboard/LawFirms";
import Admin from "./pages/dashboard/Admin";
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
import TemplateCustomize from "./pages/TemplateCustomize";
import TemplateVersionManagement from "./pages/TemplateVersionManagement";
import TemplateAnalytics from "./pages/dashboard/TemplateAnalytics";
import SearchHistory from "./pages/dashboard/SearchHistory";
import NotFound from "./pages/NotFound";
import { ROUTES } from "@/lib/config/constants";

// Lazy load PDF-related components to avoid loading heavy libraries on initial page load
const PdfAnnotationsDemo = lazy(() => import("./pages/PdfAnnotationsDemo"));

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
              <Route path={ROUTES.dashboard} element={<Dashboard />} />
              <Route path={ROUTES.documents} element={<DashboardDocuments />} />
              <Route path="/dashboard/ai-assistant" element={<AIAssistant />} />
              <Route path="/dashboard/templates" element={<Templates />} />
              <Route path="/dashboard/law-firms" element={<DashboardLawFirms />} />
              <Route path="/dashboard/admin" element={<Admin />} />
              <Route path="/dashboard/template-analytics" element={<TemplateAnalytics />} />
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
              <Route path={`${ROUTES.templateCustomize}/:slug`} element={<TemplateCustomize />} />
              <Route path={`/templates/:slug/versions`} element={<TemplateVersionManagement />} />
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
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
