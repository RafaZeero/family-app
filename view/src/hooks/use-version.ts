import { useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { useVersionStore } from "@/stores/vesion-store";

export const useVersionHook = () => {
  const version = useVersionStore((s) => s.version);
  const updateVersion = useVersionStore((s) => s.updateVersion);

  useEffect(() => {
    getVersion()
      .then(updateVersion)
      .catch(() => updateVersion("—"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    version,
    updateVersion,
  };
};
