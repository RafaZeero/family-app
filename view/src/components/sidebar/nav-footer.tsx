import { Link } from "@tanstack/react-router";
import { useSidebar } from "@/components/ui/sidebar";
import { useVersionHook } from "@/hooks/use-version";

export const NavFooter = () => {
  const { state } = useSidebar();
  const { version } = useVersionHook();

  if (state === "collapsed") return null;

  return (
    <div className="px-3 py-2 flex items-center justify-between">
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
        {version ? `v${version}` : ""}
      </span>
      <Link
        to="/about"
        className="text-[10px] text-blue-500 hover:underline font-medium"
      >
        Check updates
      </Link>
    </div>
  );
};
