import React from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { router } from "@/core/router";
import { ThemeProvider } from "@/core/theme";

// Create QueryClient with production fallback configurations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent query re-fetching on tab switching
      retry: 1,                     // Retry failed requests once before showing failure states
      staleTime: 1000 * 60 * 5,     // Cache items for 5 minutes
    },
  },
});

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
