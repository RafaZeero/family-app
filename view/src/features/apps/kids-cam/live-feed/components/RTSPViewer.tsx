import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useHeaderStore } from "@/stores/header-store";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import {
  Maximize2,
  Minimize2,
  PictureInPicture,
  PictureInPicture2,
  Pin,
  PinOff,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RTSPViewerProps {
  serverUrl?: string;
}

export default function RTSPViewer({
  serverUrl = "ws://localhost:3005/?auth_conn=123",
}: RTSPViewerProps) {
  const [ffmpegInfo, setFfmpegInfo] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentStream, setCurrentStream] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Desconectado");
  const [isInAppFullscreen, setIsInAppFullscreen] = useState(false);
  const [inAppSize, setInAppSize] = useState<{ width: number; height: number } | null>(null);
  const [isGlobalFullscreen, setIsGlobalFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [selectedStream, setSelectedStream] = useState<"stream1" | "stream2">("stream1");

  const { setContent, clearContent } = useHeaderStore();

  useEffect(() => {
    const btnClass = "rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors";
    const primaryClass = "rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors";

    setContent(
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className={`size-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="hidden sm:inline text-xs text-muted-foreground">{status}</span>
        </div>
        {isConnected ? (
          <button onClick={disconnect} className={btnClass}>
            Desconectar
          </button>
        ) : (
          <button onClick={connectWebSocket} className={primaryClass}>
            Conectar
          </button>
        )}
        {isConnected && (
          <>
            <div className="mx-1 h-4 w-px bg-border" />
            <Select value={selectedStream} onValueChange={(v) => setSelectedStream(v as "stream1" | "stream2")}>
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stream1">Stream 1</SelectItem>
                <SelectItem value="stream2">Stream 2</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => startStream(selectedStream)}
              disabled={currentStream === selectedStream}
              className={primaryClass}
            >
              {currentStream ? "Trocar" : "Iniciar"}
            </button>
            <button onClick={stopStream} disabled={!currentStream} className={btnClass}>
              Parar
            </button>
          </>
        )}
      </div>
    );

    return () => clearContent();
  }, [isConnected, currentStream, status, selectedStream]);

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
      setInAppSize({
        width: physical.width / scale,
        height: physical.height / scale,
      });
      setIsInAppFullscreen(true);
    } else {
      setIsInAppFullscreen(false);
      setInAppSize(null);
    }
  };

  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Inicializa o canvas stream no video element para habilitar PiP
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const stream = canvas.captureStream(10);
    video.srcObject = stream;
    video.play().catch(() => {});
  }, []);

  // Atualiza inAppSize quando a janela for redimensionada ou mudar de monitor (DPI)
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

  // Desenha cada frame recebido no canvas
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

  // Fullscreen global (OS-level)
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

  // Picture in Picture
  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (!isPiP) {
        await video.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (e) {
      toast.error("Picture in Picture nao suportado neste ambiente");
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnter = () => setIsPiP(true);
    const onLeave = () => setIsPiP(false);
    video.addEventListener("enterpictureinpicture", onEnter);
    video.addEventListener("leavepictureinpicture", onLeave);
    return () => {
      video.removeEventListener("enterpictureinpicture", onEnter);
      video.removeEventListener("leavepictureinpicture", onLeave);
    };
  }, []);

  const testFfmpeg = async () => {
    try {
      const version = await invoke<string>("ffmpeg_version");
      setFfmpegInfo(version.split("\n")[0]);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao testar FFmpeg");
    }
  };

  const connectWebSocket = () => {
    try {
      wsRef.current = new WebSocket(serverUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setStatus("Conectado");
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case "frame":
              drawFrame(data.data);
              break;
            case "status":
              setStatus(data.message);
              break;
            case "error":
              toast.error(data.message);
              setStatus("Erro na stream");
              break;
          }
        } catch (err) {
          console.error("Erro ao processar mensagem WebSocket:", err);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setCurrentStream(null);
        setStatus("Desconectado");
      };

      wsRef.current.onerror = () => {
        toast.error("Erro de conexao WebSocket");
        setStatus("Erro de conexao");
      };
    } catch {
      toast.error("Falha ao conectar WebSocket");
    }
  };

  const disconnect = () => wsRef.current?.close();

  const startStream = (streamKey: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ action: "start", stream: streamKey }),
      );
      setCurrentStream(streamKey);
    }
  };

  const stopStream = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "stop" }));
      setCurrentStream(null);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const floatBtn =
    "flex size-8 items-center justify-center rounded-md bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors";

  return (
    <div className="flex flex-col gap-6">
      {/* Video - normal */}
      {!isInAppFullscreen && (
        <div ref={videoContainerRef} className="relative w-full aspect-video overflow-hidden rounded-xl border bg-black">
          <canvas ref={canvasRef} className="h-full w-full object-contain" />
          <video ref={videoRef} className="hidden" muted playsInline />
          {!currentStream && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              {isConnected ? "Selecione uma stream acima" : "Conecte-se primeiro"}
            </div>
          )}
          {currentStream && (
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white">
              <div className="size-1.5 animate-pulse rounded-full bg-white" />
              AO VIVO — {currentStream === "stream1" ? "Alta qualidade" : "Baixa qualidade"}
            </div>
          )}
          <div className="absolute right-3 top-3 flex gap-2">
            <button onClick={toggleAlwaysOnTop} className={floatBtn} title="Sempre a frente">
              {isAlwaysOnTop ? <PinOff className="size-4" /> : <Pin className="size-4" />}
            </button>
            <button onClick={togglePiP} className={floatBtn} title="Picture in Picture">
              {isPiP ? <PictureInPicture2 className="size-4" /> : <PictureInPicture className="size-4" />}
            </button>
            <button onClick={toggleInAppFullscreen} className={floatBtn} title="Fullscreen in-app">
              <Maximize2 className="size-4" />
            </button>
            <button onClick={toggleGlobalFullscreen} className={floatBtn} title="Fullscreen global">
              {isGlobalFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Video - in-app fullscreen via Portal */}
      {isInAppFullscreen && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-hidden bg-black"
          style={inAppSize ? { width: inAppSize.width, height: inAppSize.height } : undefined}
        >
          <canvas ref={canvasRef} className="h-full w-full object-contain" />
          <video ref={videoRef} className="hidden" muted playsInline />
          {!currentStream && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              {isConnected ? "Selecione uma stream acima" : "Conecte-se primeiro"}
            </div>
          )}
          {currentStream && (
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white">
              <div className="size-1.5 animate-pulse rounded-full bg-white" />
              AO VIVO — {currentStream === "stream1" ? "Alta qualidade" : "Baixa qualidade"}
            </div>
          )}
          <div className="absolute right-3 top-3 flex gap-2">
            <button onClick={toggleAlwaysOnTop} className={floatBtn} title="Sempre a frente">
              {isAlwaysOnTop ? <PinOff className="size-4" /> : <Pin className="size-4" />}
            </button>
            <button onClick={togglePiP} className={floatBtn} title="Picture in Picture">
              {isPiP ? <PictureInPicture2 className="size-4" /> : <PictureInPicture className="size-4" />}
            </button>
            <button onClick={toggleInAppFullscreen} className={floatBtn} title="Sair do fullscreen in-app">
              <Minimize2 className="size-4" />
            </button>
            <button onClick={toggleGlobalFullscreen} className={floatBtn} title="Fullscreen global">
              {isGlobalFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Info */}
      <div className="rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">
          Informacoes da camera
        </p>
        <ul className="space-y-1">
          <li>IP: 192.168.0.5</li>
          <li>Stream 1: Alta qualidade (rtsp://192.168.0.5/stream1)</li>
          <li>Stream 2: Baixa qualidade (rtsp://192.168.0.5/stream2)</li>
        </ul>
      </div>
    </div>
  );
}
