import { Layout } from "@/components/layout/layout";
import { useVersionHook } from "@/hooks/use-version";
import { AboutAppIdentity } from "./components/identity";
import { AboutAppVersionInfo } from "./components/version-info";
import { AboutFooterLink } from "./components/footer-links";
import { AboutUpdateAction } from "./components/update-action";

export function AboutPage() {
  const { version } = useVersionHook();

  return (
    <Layout>
      <div className="flex-1 flex p-8">
        <div className="w-full max-w-md space-y-6">
          {/* App identity */}
          <AboutAppIdentity />

          {/* Version info */}
          <AboutAppVersionInfo version={version} />

          {/* Update actions */}
          <AboutUpdateAction />

          {/* Footer links */}
          <AboutFooterLink />
        </div>
      </div>
    </Layout>
  );
}
