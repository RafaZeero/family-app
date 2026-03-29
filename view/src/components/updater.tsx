import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "sonner";

export function Updater() {
  useEffect(() => {
    if (!import.meta.env.PROD) return;

    check()
      .then((update) => {
        if (!update) return;

        toast.info(`Nova versao disponivel: ${update.version}`, {
          duration: Infinity,
          action: {
            label: "Atualizar",
            onClick: () => installUpdate(update),
          },
        });
      })
      .catch(console.error);
  }, []);

  return null;
}

async function installUpdate(update: Awaited<ReturnType<typeof check>>) {
  if (!update) return;

  const toastId = toast.loading("Baixando atualização...");
  let downloaded = 0;
  let total = 0;

  try {
    await update.downloadAndInstall((event) => {
      if (event.event === "Started") {
        total = event.data.contentLength ?? 0;
      } else if (event.event === "Progress") {
        downloaded += event.data.chunkLength;
        const pct = total > 0 ? Math.round((downloaded / total) * 100) : 0;
        toast.loading(`Baixando... ${pct}%`, { id: toastId });
      } else if (event.event === "Finished") {
        toast.loading("Reiniciando...", { id: toastId });
      }
    });

    await relaunch();
  } catch {
    toast.error("Erro ao atualizar. Tente novamente.", { id: toastId });
  }
}
