import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { NavigationProgress } from "@/components/navigation-progress";
import GeneralError from "@/features/errors/general-error";
import NotFoundError from "@/features/errors/not-found-error";
import { Effect } from "effect";
import { Updater } from "@/components/updater";
import { useCameraStore } from "@/stores/camera-store";
import { useEffect } from "react";

type AppContext = {
  runtime: typeof Effect;
};

const RootComponent = () => {
  const cameraStore = useCameraStore();

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    cameraStore.loadFromDisk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <NavigationProgress />
      <Updater />
      <Outlet />
      <Toaster duration={50000} closeButton />
    </>
  );
};

export const Route = createRootRouteWithContext<AppContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
});
