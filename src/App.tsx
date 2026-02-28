import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { StoreProvider } from "@/lib/store";
import { ProgramStoreProvider } from "@/lib/program-store";
import { MetricStoreProvider } from "@/lib/metric-store";
import { RhythmStoreProvider } from "@/lib/rhythm-store";
import { Layout } from "@/components/Layout";
import CommandBoard from "@/pages/CommandBoard";
import PeopleView from "@/pages/PeopleView";
import ProjectDetail from "@/pages/ProjectDetail";
import ProjectsView from "@/pages/ProjectsView";
import ProgramsList from "@/pages/ProgramsList";
import ProgramDetail from "@/pages/ProgramDetail";
import MetricsView from "@/pages/MetricsView";
import MetricDetail from "@/pages/MetricDetail";
import PersonDetail from "@/pages/PersonDetail";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import TrashView from "@/pages/TrashView";
import WorkstreamsView from "@/pages/WorkstreamsView";
import AdvisorChat from "@/pages/AdvisorChat";
import TokenUsage from "@/pages/TokenUsage";
import CalendarView from "@/pages/CalendarView";
import NotFound from "@/pages/NotFound";
import { MFAChallenge } from "@/components/MFAChallenge";
import { MFAEnrollGate } from "@/components/MFAEnrollGate";
import { useEffect, useState } from "react";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading, mfaRequired, mfaVerified, signOut } = useAuth();
  const [checkingTrust, setCheckingTrust] = useState(true);
  const [showMFA, setShowMFA] = useState(false);
  const [needsMFAEnroll, setNeedsMFAEnroll] = useState(false);

  useEffect(() => {
    if (!user || loading) { setCheckingTrust(false); return; }

    // Check if user has MFA enrolled
    (async () => {
      const { data: factors } = await (await import('@/integrations/supabase/client')).supabase.auth.mfa.listFactors();
      const hasVerifiedFactor = factors?.totp?.some(f => f.status === 'verified');

      if (!hasVerifiedFactor) {
        // No MFA enrolled — force enrollment
        setShowMFA(true);
        setNeedsMFAEnroll(true);
        setCheckingTrust(false);
        return;
      }

      if (mfaRequired) {
        // Has MFA but session is aal1 — require verification
        setShowMFA(true);
        setNeedsMFAEnroll(false);
        setCheckingTrust(false);
        return;
      }

      setShowMFA(false);
      setNeedsMFAEnroll(false);
      setCheckingTrust(false);
    })();
  }, [user, loading, mfaRequired]);

  if (loading || checkingTrust) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground font-mono text-sm">LOADING...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (showMFA && needsMFAEnroll) {
    return (
      <MFAEnrollGate onEnrolled={() => { setNeedsMFAEnroll(false); setShowMFA(false); }} onSignOut={signOut} />
    );
  }

  if (showMFA) {
    return (
      <MFAChallenge onVerified={() => { mfaVerified(); setShowMFA(false); }} />
    );
  }

  return (
    <StoreProvider>
      <ProgramStoreProvider>
        <MetricStoreProvider>
          <RhythmStoreProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<CommandBoard />} />
                <Route path="/projects" element={<ProjectsView />} />
                <Route path="/programs" element={<ProgramsList />} />
                <Route path="/workstreams" element={<WorkstreamsView />} />
                <Route path="/program/:id" element={<ProgramDetail />} />
                <Route path="/metrics" element={<MetricsView />} />
                <Route path="/metric/:id" element={<MetricDetail />} />
                <Route path="/people" element={<PeopleView />} />
                <Route path="/person/:id" element={<PersonDetail />} />
                <Route path="/project/:id" element={<ProjectDetail />} />
                <Route path="/advisor" element={<AdvisorChat />} />
                <Route path="/calendar" element={<CalendarView />} />
                <Route path="/trash" element={<TrashView />} />
                <Route path="/tokens" element={<TokenUsage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </RhythmStoreProvider>
        </MetricStoreProvider>
      </ProgramStoreProvider>
    </StoreProvider>
  );
}

function AuthRoute() {
  const { user, loading, mfaRequired } = useAuth();
  if (loading) return null;
  if (user && !mfaRequired) return <Navigate to="/" replace />;
  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
