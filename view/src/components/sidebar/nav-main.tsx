"use client";

import { Bot, ChevronRight, House, Settings2, Video } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";

const navItems = [
  {
    title: "Home",
    url: "/",
    icon: House,
    isActive: true,
    items: [],
  },
  {
    title: "Kids Cam",
    url: "/kids-cam",
    icon: Video,
    isActive: false,
    items: [
      {
        title: "Live Feed",
        url: "/kids-cam/live-feed",
      },
      {
        title: "Settings",
        url: "/kids-cam/settings",
      },
    ],
  },
  // {
  //   title: "AI",
  //   url: "#",
  //   icon: Bot,
  //   isActive: false,
  //   items: [
  //     {
  //       title: "Chat",
  //       url: "#",
  //     },
  //     {
  //       title: "Settings",
  //       url: "#",
  //     },
  //   ],
  // },
  // {
  //   title: "Settings",
  //   url: "#",
  //   icon: Settings2,
  //   isActive: false,
  //   items: [
  //     {
  //       title: "General",
  //       url: "#",
  //     },
  //   ],
  // },
] as const;

export function NavMain() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Apps</SidebarGroupLabel>
      <SidebarMenu>
        {navItems.map((item) => (
          <div key={item.title}>
            {item.items.length === 0 ? (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={item.title}>
                  <Link
                    to={item.url}
                    key={item.title}
                    activeProps={{ className: "" }}
                    activeOptions={{
                      exact: item.url === "/",
                    }}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={item.isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <Link
                              to={subItem.url}
                              key={subItem.title}
                              activeProps={{ className: "" }}
                              activeOptions={{
                                exact: subItem.url === "/live-feed",
                              }}
                            >
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )}
          </div>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
