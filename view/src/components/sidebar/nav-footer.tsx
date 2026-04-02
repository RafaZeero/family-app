import { Link } from "@tanstack/react-router";
import { useSidebar } from "@/components/ui/sidebar";
import { useVersionHook } from "@/hooks/use-version";

export const NavFooter = () => {
  const { state } = useSidebar();
  const { version } = useVersionHook();

  if (state === "collapsed") return null;

  return (
    <div className="px-3 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          {version ? `v${version}` : ""}
        </span>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">
          ALPHA
        </span>
      </div>
      <Link
        to="/about"
        className="text-[10px] text-blue-500 hover:underline font-medium"
      >
        Check updates
      </Link>
    </div>
  );
};
