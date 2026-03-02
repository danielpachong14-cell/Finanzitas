"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from"@/core/context/UserContext";
import { ThemeProvider } from"next-themes";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class"defaultTheme="system"enableSystem>
      <UserProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
