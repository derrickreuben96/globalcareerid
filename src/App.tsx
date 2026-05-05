import { lazy, Suspense } from "react";
import { useDirection } from "@/hooks/useDirection";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import { PageLoader } from "./components/PageLoader";
import { CookieConsent } from "./components/CookieConsent";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const Register = lazy(() => import("./pages/Register"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Verify = lazy(() => import("./pages/Verify"));
const EmployerDashboard = lazy(() => import("./pages/EmployerDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Contact = lazy(() => import("./pages/Contact"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const FAQ = lazy(() => import("./pages/FAQ"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const ForJobSeekers = lazy(() => import("./pages/ForJobSeekers"));
const ForEmployers = lazy(() => import("./pages/ForEmployers"));
const Disputes = lazy(() => import("./pages/Disputes"));
const About = lazy(() => import("./pages/About"));
const Careers = lazy(() => import("./pages/Careers"));
const VerifyCredential = lazy(() => import("./pages/VerifyCredential"));
const PrivacySettings = lazy(() => import("./pages/settings/PrivacySettings"));
const AnalyticsDashboard = lazy(() => import("./pages/admin/AnalyticsDashboard"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const EmployerProjects = lazy(() => import("./pages/employer/Projects"));
const AddProject = lazy(() => import("./pages/employer/AddProject"));
const PendingProjects = lazy(() => import("./pages/employee/PendingProjects"));
const PublicProject = lazy(() => import("./pages/PublicProject"));
const Apply = lazy(() => import("./pages/Apply"));

const queryClient = new QueryClient();

const App = () => {
  useDirection();
  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <RouteErrorBoundary>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/employer" element={<ProtectedRoute allowedRoles={['employer']}><EmployerDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/verify/:profileId" element={<Verify />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/for-job-seekers" element={<ForJobSeekers />} />
            <Route path="/for-employers" element={<ForEmployers />} />
            <Route path="/for-recruiters" element={<ForEmployers />} />
            <Route path="/disputes" element={<ProtectedRoute><Disputes /></ProtectedRoute>} />
            <Route path="/about" element={<About />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/verify-credential" element={<VerifyCredential />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/settings/privacy" element={<ProtectedRoute><PrivacySettings /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AnalyticsDashboard /></ProtectedRoute>} />
            <Route path="/employer/projects" element={<ProtectedRoute allowedRoles={['employer']}><EmployerProjects /></ProtectedRoute>} />
            <Route path="/employer/projects/new" element={<ProtectedRoute allowedRoles={['employer']}><AddProject /></ProtectedRoute>} />
            <Route path="/dashboard/pending-projects" element={<ProtectedRoute><PendingProjects /></ProtectedRoute>} />
            <Route path="/project/:projectId" element={<PublicProject />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </RouteErrorBoundary>
          <CookieConsent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
