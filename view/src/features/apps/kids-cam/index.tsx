import { CardSection } from "@/components/common/card-section";
import { Layout } from "@/components/layout/layout";
import type { CardSectionType } from "@/types/card-section";
import { Cog, Tv } from "lucide-react";

const apps: CardSectionType[] = [
  {
    title: "Ao vivo",
    description: "Assistir ao feed ao vivo",
    icon: Tv,
    to: "/kids-cam/live-feed",
    available: true,
  },
  {
    title: "Configurações",
    description: "IP, usuário e senha da câmera",
    icon: Cog,
    to: "/kids-cam/settings",
    available: true,
  },
] as const;

export function KidsCamPage() {
  return (
    <Layout>
      <h1 className="text-xl font-semibold mb-6">Kids Cam</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {apps.map((app) => (
          <CardSection {...app} />
        ))}
      </div>
    </Layout>
  );
}
