import { KidsCamPage } from "@/features/apps/kids-cam";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_apps/kids-cam/")({
  component: KidsCamPage,
});
