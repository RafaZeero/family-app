import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Maximize2, Minimize2, PictureInPicture, PictureInPicture2 } from "lucide-react";

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
  const [isGlobalFullscreen, setIsGlobalFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);

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
      wsRef.current.send(JSON.stringify({ action: "start", stream: streamKey }));
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
    return () => { wsRef.current?.close(); };
  }, []);

  const floatBtn = "flex size-8 items-center justify-center rounded-md bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors";

  return (
    <div className="flex flex-col gap-6">
      {/* Status */}
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <div className={`size-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
        <span className="font-medium">{status}</span>
      </div>

      {/* Controles de conexao */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={connectWebSocket}
          disabled={isConnected}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          {isConnected ? "Conectado" : "Conectar"}
        </button>
        <button
          onClick={disconnect}
          disabled={!isConnected}
          className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
        >
          Desconectar
        </button>
        <button
          onClick={testFfmpeg}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Testar FFmpeg
        </button>
        {ffmpegInfo && (
          <span className="self-center text-xs font-mono text-muted-foreground">{ffmpegInfo}</span>
        )}
      </div>

      {/* Controles de stream */}
      {isConnected && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => startStream("stream1")}
            disabled={currentStream === "stream1"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            Stream 1 — Alta qualidade
          </button>
          <button
            onClick={() => startStream("stream2")}
            disabled={currentStream === "stream2"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            Stream 2 — Baixa qualidade
          </button>
          <button
            onClick={stopStream}
            disabled={!currentStream}
            className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
          >
            Parar
          </button>
        </div>
      )}

      {/* Video */}
      <div
        ref={videoContainerRef}
        className={[
          "relative w-full overflow-hidden rounded-xl border bg-black",
          isInAppFullscreen
            ? "fixed inset-0 z-50 rounded-none border-none aspect-auto"
            : "aspect-video",
        ].join(" ")}
      >
        {/* Canvas visivel - renderiza os frames */}
        <canvas
          ref={canvasRef}
          className="h-full w-full object-contain"
        />

        {/* Video oculto - apenas para PiP */}
        <video
          ref={videoRef}
          className="hidden"
          muted
          playsInline
        />

        {/* Placeholder quando sem stream */}
        {!currentStream && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            {isConnected ? "Selecione uma stream acima" : "Conecte-se primeiro"}
          </div>
        )}

        {/* Badge AO VIVO */}
        {currentStream && (
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white">
            <div className="size-1.5 animate-pulse rounded-full bg-white" />
            AO VIVO — {currentStream === "stream1" ? "Alta qualidade" : "Baixa qualidade"}
          </div>
        )}

        {/* Botoes flutuantes */}
        <div className="absolute right-3 top-3 flex gap-2">
          <button onClick={togglePiP} className={floatBtn} title="Picture in Picture">
            {isPiP ? <PictureInPicture2 className="size-4" /> : <PictureInPicture className="size-4" />}
          </button>
          <button onClick={() => setIsInAppFullscreen((v) => !v)} className={floatBtn} title="Fullscreen in-app">
            {isInAppFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          <button onClick={toggleGlobalFullscreen} className={floatBtn} title="Fullscreen global">
            {isGlobalFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">Informacoes da camera</p>
        <ul className="space-y-1">
          <li>IP: 192.168.0.5</li>
          <li>Stream 1: Alta qualidade (rtsp://192.168.0.5/stream1)</li>
          <li>Stream 2: Baixa qualidade (rtsp://192.168.0.5/stream2)</li>
        </ul>
      </div>
    </div>
  );
}
