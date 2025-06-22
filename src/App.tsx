import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { memoryMonitor } from "@/lib/services/memoryMonitor";
import { autoAdjustFeatures, disableFeatures } from "@/lib/config/features";
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
import PdfAnnotationsDemo from "./pages/PdfAnnotationsDemo";
import NotFound from "./pages/NotFound";
import { ROUTES } from "@/lib/config/constants";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialize memory monitoring and auto-adjust features
    autoAdjustFeatures();

    // Set up memory warning handlers
    const unsubscribeWarning = memoryMonitor.onMemoryWarning((stats) => {
      console.warn(`Memory warning: ${stats.usagePercentage.toFixed(1)}% used`);
    });

    const unsubscribeCritical = memoryMonitor.onMemoryCritical((stats) => {
      console.error(`Memory critical: ${stats.usagePercentage.toFixed(1)}% used`);
      // Disable heavy features to free memory
      disableFeatures(['enablePdfOcr', 'enablePdfAnalysis', 'enableRealTimeCollaboration']);
    });

    const unsubscribeEmergency = memoryMonitor.onMemoryEmergency((stats) => {
      console.error(`Memory emergency: ${stats.usagePercentage.toFixed(1)}% used`);
      // Force garbage collection if available
      memoryMonitor.forceGarbageCollection();
      // Disable all heavy features
      disableFeatures([
        'enablePdfOcr',
        'enablePdfAnalysis',
        'enableAiDocumentGeneration',
        'enableRealTimeCollaboration'
      ]);
    });

    return () => {
      unsubscribeWarning();
      unsubscribeCritical();
      unsubscribeEmergency();
      memoryMonitor.stopMonitoring();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="p-8">
        <h1 className="text-4xl font-bold text-blue-900 mb-4">LawMattersSG</h1>
        <p className="text-lg text-gray-600 mb-8">Application is loading...</p>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          React is working! The development server is running successfully.
        </div>
      </div>
    </div>
  );
};

export default App;
