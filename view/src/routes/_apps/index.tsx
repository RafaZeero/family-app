import { HomePage } from "@/features/apps/home";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_apps/")({
  component: HomePage,
});
