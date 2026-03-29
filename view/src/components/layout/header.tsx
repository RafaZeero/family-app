import { Link, useRouterState } from "@tanstack/react-router";
import { useHeaderStore } from "@/stores/header-store";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const routeLabels: Record<string, string> = {
  "/": "Home",
  "/kids-cam/live-feed": "Live Feed",
  "/kids-cam/settings": "Settings",
};

const routeParents: Record<string, { label: string; to: string } | null> = {
  "/": null,
  "/kids-cam/live-feed": { label: "Kids Cam", to: "/kids-cam/live-feed" },
  "/kids-cam/settings": { label: "Kids Cam", to: "/kids-cam/live-feed" },
};

export const Header = () => {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const headerContent = useHeaderStore((s) => s.content);

  const label = routeLabels[pathname] ?? pathname;
  const parent = routeParents[pathname] ?? null;

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {parent && (
              <>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link to={parent.to}>{parent.label}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>{label}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {headerContent && (
        <div className="ml-auto flex items-center gap-2 px-4">
          {headerContent}
        </div>
      )}
    </header>
  );
};
