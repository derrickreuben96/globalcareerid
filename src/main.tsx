import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { initErrorTracking } from "./lib/errorTracking";
import { initAnalytics } from "./lib/analytics";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import App from "./App.tsx";
import "./index.css";

// Initialize Sentry before React render
initErrorTracking();

type ErrorFallbackProps = {
  onReload: () => void;
};

function ErrorFallback({ onReload }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center py-10 gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. Our team has been notified.
          </p>
          <Button onClick={onReload} className="mt-2">
            Reload Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary
    fallback={() => (
      <ErrorFallback
        onReload={() => {
          window.location.reload();
        }}
      />
    )}
  >
    <App />
  </Sentry.ErrorBoundary>
);

// Initialize PostHog after React render
initAnalytics();
