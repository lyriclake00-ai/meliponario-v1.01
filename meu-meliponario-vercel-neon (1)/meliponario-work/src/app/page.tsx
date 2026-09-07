"use client";

import { useEffect, useState } from "react";
import { AppProvider, useApp } from "@/components/AppContext";
import AuthScreen from "@/components/AuthScreen";
import Onboarding from "@/components/Onboarding";
import Shell from "@/components/Shell";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Spinner } from "@/components/ui";

function LoadingScreen() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-melibg p-6 text-center">
      <Spinner />
      {slow && (
        <div className="max-w-sm">
          <p className="text-sm text-gray-500">
            Está demorando mais que o normal para carregar.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-3 rounded-xl px-5 py-2.5 text-sm font-bold"
          >
            Recarregar
          </button>
        </div>
      )}
    </div>
  );
}

function Root() {
  const { user, loading, melisLoaded, melis, current } = useApp();
  const [forceOnboard, setForceOnboard] = useState(false);

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthScreen />;
  // Wait for the meliponários list before deciding between onboarding and app,
  // otherwise the onboarding screen flashes for users that already have one.
  if (!melisLoaded) return <LoadingScreen />;

  if (forceOnboard || melis.length === 0 || !current) {
    return (
      <Onboarding
        onDone={() => setForceOnboard(false)}
        showBack={melis.length > 0 && !!current}
      />
    );
  }

  return <Shell onOnboard={() => setForceOnboard(true)} />;
}

export default function Home() {
  return (
    <ErrorBoundary fullScreen>
      <AppProvider>
        <Root />
      </AppProvider>
    </ErrorBoundary>
  );
}
