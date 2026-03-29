import { Link } from "@tanstack/react-router";
import { Video, Box, Settings, Bot } from "lucide-react";

const apps = [
  {
    title: "Kids Cam",
    description: "Live RTSP camera feed",
    icon: Video,
    to: "/kids-cam/live-feed",
    available: true,
  },
  {
    title: "App 2",
    description: "Coming soon",
    icon: Box,
    to: "/",
    available: false,
  },
  {
    title: "App 3",
    description: "Coming soon",
    icon: Bot,
    to: "/",
    available: false,
  },
  {
    title: "App 4",
    description: "Coming soon",
    icon: Settings,
    to: "/",
    available: false,
  },
] as const;

export function HomePage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-6">Apps</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {apps.map((app) => {
          const Icon = app.icon;
          const card = (
            <div
              className={[
                "flex flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center transition-colors",
                app.available
                  ? "cursor-pointer hover:bg-muted"
                  : "cursor-default opacity-40",
              ].join(" ")}
            >
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
                <Icon className="size-8 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{app.title}</p>
                <p className="text-xs text-muted-foreground">{app.description}</p>
              </div>
            </div>
          );

          return app.available ? (
            <Link key={app.title} to={app.to} className="block">
              {card}
            </Link>
          ) : (
            <div key={app.title}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
