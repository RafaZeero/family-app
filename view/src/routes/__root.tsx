import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@/components/ui/sonner";
import { NavigationProgress } from "@/components/navigation-progress";
import GeneralError from "@/features/errors/general-error";
import NotFoundError from "@/features/errors/not-found-error";
import { Effect } from "effect";

type AppContext = {
  runtime: typeof Effect;
};

export const Route = createRootRouteWithContext<AppContext>()({
  component: () => {
    return (
      <>
        <NavigationProgress />
        <Outlet />
        <Toaster duration={50000} />
        {/* {import.meta.env.MODE === "development" && ( */}
        {/*   <TanStackRouterDevtools position="bottom-right" /> */}
        {/* )} */}
      </>
    );
  },
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
});
