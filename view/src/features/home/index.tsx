import { CardSection } from "@/components/common/card-section";
import { Layout } from "@/components/layout/layout";
import { Video, Box, Settings, Bot } from "lucide-react";

const apps = [
  {
    title: "Kids Cam",
    description: "De olho no soninho deles",
    icon: Video,
    to: "/kids-cam",
    available: true,
  },
  {
    title: "App 2",
    description: "Em breve!",
    icon: Box,
    to: "/",
    available: false,
  },
  {
    title: "App 3",
    description: "Em breve!",
    icon: Bot,
    to: "/",
    available: false,
  },
  {
    title: "App 4",
    description: "Em breve!",
    icon: Settings,
    to: "/",
    available: false,
  },
] as const;

const AppsSection = () => {
  return (
    <>
      <h1 className="text-xl font-semibold mb-6">Aplicativos</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {apps.map((app) => (
          <CardSection {...app} />
        ))}
      </div>
    </>
  );
};

export function HomePage() {
  return (
    <Layout>
      <AppsSection />
    </Layout>
  );
}
