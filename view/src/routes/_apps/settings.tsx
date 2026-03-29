import { SettingsPage } from "@/features/apps/kids-cam/settings";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_apps/settings")({
  component: SettingsPage,
});
