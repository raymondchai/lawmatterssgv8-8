import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Pricing from "./pages/Pricing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/dashboard/Dashboard";
import Documents from "./pages/dashboard/Documents";
import AIAssistant from "./pages/dashboard/AIAssistant";
import Templates from "./pages/dashboard/Templates";
import LawFirms from "./pages/dashboard/LawFirms";
import Admin from "./pages/dashboard/Admin";
import Subscription from "./pages/dashboard/Subscription";
import Settings from "./pages/dashboard/Settings";
import Subscribe from "./pages/Subscribe";
import PaymentSuccess from "./pages/payment/PaymentSuccess";
import PaymentFailure from "./pages/payment/PaymentFailure";
import SharedDocument from "./pages/SharedDocument";
import NotFound from "./pages/NotFound";
import { ROUTES } from "@/lib/config/constants";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path={ROUTES.home} element={<Index />} />
            <Route path={ROUTES.pricing} element={<Pricing />} />
            <Route path={ROUTES.login} element={<Login />} />
            <Route path={ROUTES.register} element={<Register />} />
            <Route path={ROUTES.forgotPassword} element={<ForgotPassword />} />
            <Route path={ROUTES.resetPassword} element={<ResetPassword />} />
            <Route path={ROUTES.dashboard} element={<Dashboard />} />
            <Route path={ROUTES.documents} element={<Documents />} />
            <Route path="/dashboard/ai-assistant" element={<AIAssistant />} />
            <Route path="/dashboard/templates" element={<Templates />} />
            <Route path="/dashboard/law-firms" element={<LawFirms />} />
            <Route path="/dashboard/admin" element={<Admin />} />
            <Route path="/dashboard/subscription" element={<Subscription />} />
            <Route path="/dashboard/settings" element={<Settings />} />
            <Route path="/subscribe/:tier" element={<Subscribe />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/failure" element={<PaymentFailure />} />
            <Route path="/shared/:shareToken" element={<SharedDocument />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
