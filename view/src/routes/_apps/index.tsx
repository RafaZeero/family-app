import { LiveFeedPage } from "@/features/apps/kids-cam/live-feed";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_apps/")({
  component: LiveFeedPage,
});
