import { RootLayout } from "@/features/root";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_apps")({
  component: RootLayout,
});
