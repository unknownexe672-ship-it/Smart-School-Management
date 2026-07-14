import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

// In Electron, VITE_API_URL is injected at build time pointing to the local
// API server (e.g. http://localhost:58423). In the normal web build it is
// undefined and we fall back to the same-origin base path as before.
const apiBase =
  ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "") ||
  base;

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${apiBase}/api/trpc`,
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
