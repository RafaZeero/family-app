import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@/components/ui/sonner";
import { NavigationProgress } from "@/components/navigation-progress";
import GeneralError from "@/features/errors/general-error";
import NotFoundError from "@/features/errors/not-found-error";
import { Effect } from "effect";
import { Updater } from "@/components/updater";

type AppContext = {
  runtime: typeof Effect;
};

export const Route = createRootRouteWithContext<AppContext>()({
  component: () => {
    return (
      <>
        <NavigationProgress />
        <Updater />
        <Outlet />
        <Toaster duration={50000} closeButton />
        {/* {import.meta.env.MODE === "development" && ( */}
        {/*   <TanStackRouterDevtools position="bottom-right" /> */}
        {/* )} */}
      </>
    );
  },
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
});
