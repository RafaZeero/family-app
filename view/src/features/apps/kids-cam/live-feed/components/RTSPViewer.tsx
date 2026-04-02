import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useHeaderStore } from "@/stores/header-store";
import { useCameraStore } from "@/stores/camera-store";
import { toast } from "sonner";
import { Circle, Maximize2, Minimize2, Pin, PinOff, Play, Power, RefreshCw, Square, Video } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import idleImg from "@/assets/kids-cam-idle.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NoConfigModal } from "./no-config-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StreamState = "idle" | "playing" | "stopped";

interface RTSPViewerProps {
  serverUrl?: string;
}

export default function RTSPViewer({
  serverUrl = "ws://localhost:3005/?auth_conn=VdpfcQzI4TSaXn88465ZWP_DRmKdXk19LffV7TEpti0=",
}: RTSPViewerProps) {
  const { ip, username, password } = useCameraStore();
  const [isConnected, setIsConnected] = useState(false);
  const [streamState, setStreamState] = useState<StreamState>("idle");
  const [currentStream, setCurrentStream] = useState<string | null>(null);
  const [isInAppFullscreen, setIsInAppFullscreen] = useState(false);
  const [inAppSize, setInAppSize] = useState<{ width: number; height: number } | null>(null);
  const [isGlobalFullscreen, setIsGlobalFullscreen] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [selectedStream, setSelectedStream] = useState<"stream1" | "stream2">("stream1");
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isNoConfigOpen, setIsNoConfigOpen] = useState(false);

  const { setContent, clearContent, setBadge, clearBadge } = useHeaderStore();

  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // --- Header: badge ---
  useEffect(() => {
    if (streamState === "playing") {
      setBadge(
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-100 shrink-0">
          <Circle size={6} fill="currentColor" />
          ON
        </span>,
      );
    } else if (streamState === "stopped") {
      setBadge(
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[9px] font-bold border border-red-100 shrink-0">
          <Circle size={6} fill="currentColor" />
          OFF
        </span>,
      );
    } else {
      clearBadge();
    }
    return () => clearBadge();
  }, [streamState]);

  // --- Header: controls ---
  useEffect(() => {
    const iconBtn = "p-1.5 rounded-md transition-all disabled:opacity-40";

    if (!isConnected) {
      setContent(
        <button
          onClick={connectWebSocket}
          className={`${iconBtn} flex items-center gap-1.5 px-2.5 bg-primary text-primary-foreground hover:bg-primary/90`}
          title="Conectar"
        >
          <Power size={15} />
          <span className="text-xs font-medium">Conectar</span>
        </button>,
      );
      return () => clearContent();
    }

    const streamChanged = currentStream !== null && selectedStream !== currentStream;

    setContent(
      <div className="flex items-center gap-1.5">
        {streamChanged && (
          <button
            onClick={() => startStream(selectedStream)}
            className={`${iconBtn} text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600`}
            title="Trocar stream"
          >
            <RefreshCw size={15} />
          </button>
        )}

        <Select
          value={selectedStream}
          onValueChange={(v) => setSelectedStream(v as "stream1" | "stream2")}
        >
          <SelectTrigger className="h-8 w-32 text-xs gap-1.5">
            <Video size={13} className="text-muted-foreground shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stream1">Stream 1</SelectItem>
            <SelectItem value="stream2">Stream 2</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-px h-5 bg-border mx-0.5" />

        {streamState === "playing" ? (
          <button
            onClick={stopStream}
            className={`${iconBtn} text-rose-500 hover:bg-rose-50`}
            title="Parar"
          >
            <Square size={15} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={() => startStream(selectedStream)}
            className={`${iconBtn} bg-primary text-primary-foreground hover:bg-primary/90`}
            title="Play"
          >
            <Play size={15} fill="currentColor" />
          </button>
        )}
      </div>,
    );

    return () => clearContent();
  }, [isConnected, streamState, currentStream, selectedStream, ip, username, password]);

  // --- WebSocket ---
  const connectWebSocket = () => {
    if (!ip) {
      setIsNoConfigOpen(true);
      return;
    }

    try {
      wsRef.current = new WebSocket(serverUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case "frame":
              drawFrame(data.data);
              break;
            case "error":
              toast.error(data.message);
              break;
          }
        } catch (err) {
          console.error("Erro ao processar mensagem WebSocket:", err);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setStreamState("idle");
        setCurrentStream(null);
      };

      wsRef.current.onerror = () => {
        toast.error("Erro de conexão WebSocket");
      };
    } catch {
      toast.error("Falha ao conectar WebSocket");
    }
  };

  const startStream = (streamKey: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "start", stream: streamKey, ip, username, password }));
      setCurrentStream(streamKey);
      setStreamState("playing");
    }
  };

  const stopStream = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "stop" }));
      setCurrentStream(null);
      setStreamState("stopped");
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  useEffect(() => {
    return () => wsRef.current?.close();
  }, []);

  // --- Fullscreen ---
  const toggleAlwaysOnTop = async () => {
    const next = !isAlwaysOnTop;
    await getCurrentWindow().setAlwaysOnTop(next);
    setIsAlwaysOnTop(next);
  };

  const toggleInAppFullscreen = async () => {
    if (!isInAppFullscreen) {
      const win = getCurrentWindow();
      const physical = await win.innerSize();
      const scale = await win.scaleFactor();
      setInAppSize({ width: physical.width / scale, height: physical.height / scale });
      setIsInAppFullscreen(true);
    } else {
      setIsInAppFullscreen(false);
      setInAppSize(null);
    }
  };

  useEffect(() => {
    if (!isInAppFullscreen) return;
    const win = getCurrentWindow();
    const updateSize = async () => {
      const physical = await win.innerSize();
      const scale = await win.scaleFactor();
      setInAppSize({ width: physical.width / scale, height: physical.height / scale });
    };
    const unlistenResized = win.onResized(updateSize);
    const unlistenScale = win.onScaleChanged(updateSize);
    return () => {
      unlistenResized.then((fn) => fn());
      unlistenScale.then((fn) => fn());
    };
  }, [isInAppFullscreen]);

  const toggleGlobalFullscreen = () => {
    if (!isGlobalFullscreen) {
      videoContainerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onChange = () => setIsGlobalFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // --- Canvas ---
  const drawFrame = (base64: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
    };
    img.src = `data:image/jpeg;base64,${base64}`;
  };

  // --- Render ---
  const floatBtn =
    "flex size-8 items-center justify-center rounded-md bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 hover:border hover:border-white transition-colors";

  const videoContent = (onFullscreenToggle: () => void, isFullscreen: boolean) => (
    <>
      <canvas ref={canvasRef} className="h-full w-full object-contain" />
      {streamState !== "playing" && (
        <img
          src={idleImg}
          alt="idle"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute right-3 top-3 flex gap-2">
        <button onClick={toggleAlwaysOnTop} className={floatBtn} title="Sempre a frente">
          {isAlwaysOnTop ? <PinOff className="size-4" /> : <Pin className="size-4" />}
        </button>
        <button
          onClick={onFullscreenToggle}
          className={floatBtn}
          title={isFullscreen ? "Sair do fullscreen in-app" : "Fullscreen in-app"}
        >
          {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
        <button onClick={toggleGlobalFullscreen} className={floatBtn} title="Fullscreen global">
          {isGlobalFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => setIsInfoOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex size-10 items-center justify-center rounded-full border bg-background text-sm font-medium shadow-md hover:bg-muted transition-colors"
        title="Informações da câmera"
      >
        ?
      </button>

      {!isInAppFullscreen && (
        <div
          ref={videoContainerRef}
          className="relative w-full aspect-video overflow-hidden rounded-xl border bg-black"
        >
          {videoContent(toggleInAppFullscreen, false)}
        </div>
      )}

      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informações da câmera</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">IP:</span>{" "}
              {ip || <span className="italic">não configurado</span>}
            </li>
            <li>
              <span className="font-medium text-foreground">Usuário:</span>{" "}
              {username || <span className="italic">não configurado</span>}
            </li>
            <li>
              <span className="font-medium text-foreground">Stream 1:</span>{" "}
              Alta qualidade{ip ? ` (rtsp://${ip}/stream1)` : ""}
            </li>
            <li>
              <span className="font-medium text-foreground">Stream 2:</span>{" "}
              Baixa qualidade{ip ? ` (rtsp://${ip}/stream2)` : ""}
            </li>
          </ul>
        </DialogContent>
      </Dialog>

      <NoConfigModal open={isNoConfigOpen} onOpenChange={setIsNoConfigOpen} />

      {isInAppFullscreen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] overflow-hidden bg-black"
            style={inAppSize ? { width: inAppSize.width, height: inAppSize.height } : undefined}
          >
            {videoContent(toggleInAppFullscreen, true)}
          </div>,
          document.body,
        )}
    </div>
  );
}
