import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/_layout/app")({
  beforeLoad: async () => {
    console.log("redirect_if_not_signed_in");
  },
});
