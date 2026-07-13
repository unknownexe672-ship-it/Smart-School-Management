import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@workspace/school-router";

export const trpc = createTRPCReact<AppRouter>();
