import type { Version } from "@/types";
import { ShieldCheck } from "lucide-react";

export const AboutAppVersionInfo = (props: { version: Version }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-green-600" />
        <span className="text-sm font-medium">Versão Atual</span>
      </div>
      <span className="text-sm font-mono font-bold bg-background px-2 py-1 border rounded text-muted-foreground">
        v{props.version}
      </span>
    </div>
  );
};
