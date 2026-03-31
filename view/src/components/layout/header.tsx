import { Link, useRouterState } from "@tanstack/react-router";
import { useHeaderStore } from "@/stores/header-store";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ChevronRight } from "lucide-react";

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
  const headerBadge = useHeaderStore((s) => s.badge);

  const label = routeLabels[pathname] ?? pathname;
  const parent = routeParents[pathname] ?? null;

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-4 transition-[width,height] ease-linear">
      <div className="flex items-center gap-3 overflow-hidden">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4 shrink-0" />

        <nav className="flex flex-col min-w-0">
          {parent && (
            <div className="flex items-center text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
              <Link to={parent.to} className="truncate hover:text-foreground transition-colors">
                {parent.label}
              </Link>
              <ChevronRight size={10} className="mx-0.5 shrink-0" />
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground truncate leading-none">
              {label}
            </span>
            {headerBadge}
          </div>
        </nav>
      </div>

      {headerContent && (
        <div className="flex items-center gap-2 shrink-0">
          {headerContent}
        </div>
      )}
    </header>
  );
};
