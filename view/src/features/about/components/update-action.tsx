import { RefreshCw, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type UpdateStatus = "idle" | "checking" | "available" | "up-to-date" | "error";

export const AboutUpdateAction = () => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [availableVersion, setAvailableVersion] = useState("");
  const [updateRef, setUpdateRef] =
    useState<Awaited<ReturnType<typeof check>>>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isInstalling, setIsInstalling] = useState(false);

  const checkUpdates = async () => {
    setUpdateStatus("checking");
    try {
      const update = await check();
      if (update) {
        setAvailableVersion(update.version);
        setUpdateRef(update);
        setUpdateStatus("available");
      } else {
        setUpdateStatus("up-to-date");
      }
    } catch {
      setUpdateStatus("error");
    }
  };

  const installUpdate = async () => {
    if (!updateRef) return;
    setIsInstalling(true);
    let downloaded = 0;
    let total = 0;

    try {
      await updateRef.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          setDownloadProgress(
            total > 0 ? Math.round((downloaded / total) * 100) : 0,
          );
        }
      });
      await relaunch();
    } catch {
      setIsInstalling(false);
      setUpdateStatus("error");
    }
  };

  return (
    <div>
      {updateStatus === "idle" && (
        <button
          onClick={checkUpdates}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Verificar Atualizações
        </button>
      )}

      {updateStatus === "checking" && (
        <div className="w-full flex items-center justify-center gap-3 py-2.5 bg-muted text-muted-foreground rounded-lg">
          <RefreshCw size={16} className="animate-spin" />
          <span>Verificando servidores...</span>
        </div>
      )}

      {updateStatus === "up-to-date" && (
        <div className="space-y-3">
          <div className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-700 rounded-lg border border-green-100">
            <CheckCircle2 size={16} />
            <span className="font-medium">O sistema está atualizado!</span>
          </div>
          <button
            onClick={() => setUpdateStatus("idle")}
            className="w-full py-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Verificar novamente
          </button>
        </div>
      )}

      {updateStatus === "available" && (
        <div className="space-y-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download size={16} />
              <span className="font-medium">
                Versão {availableVersion} disponível
              </span>
            </div>
          </div>
          {isInstalling ? (
            <div className="space-y-2">
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-foreground h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Baixando... {downloadProgress}%
              </p>
            </div>
          ) : (
            <button
              onClick={installUpdate}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <Download size={16} />
              Instalar e Reiniciar
            </button>
          )}
        </div>
      )}

      {updateStatus === "error" && (
        <div className="space-y-3">
          <div className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-700 rounded-lg border border-red-100">
            <AlertCircle size={16} />
            <span className="font-medium">Erro ao verificar atualizacoes</span>
          </div>
          <button
            onClick={() => setUpdateStatus("idle")}
            className="w-full py-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
};
