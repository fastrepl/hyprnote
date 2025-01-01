import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ClerkProvider } from "@clerk/clerk-react";

// const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
// if (!PUBLISHABLE_KEY) {
//   throw new Error("VITE_CLERK_PUBLISHABLE_KEY is not set");
// }

export const Route = createRootRoute({
  component: () => (
    <ClerkProvider
      publishableKey={"pk_test_Zml0LWtvZGlhay0xNi5jbGVyay5hY2NvdW50cy5kZXYk"}
    >
      <Outlet />
    </ClerkProvider>
  ),
});
