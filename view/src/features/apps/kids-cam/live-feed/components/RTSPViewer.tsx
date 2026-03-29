import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

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

  const wsRef = useRef<WebSocket | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const testFfmpeg = async () => {
    try {
      const version = await invoke<string>("ffmpeg_version");
      setFfmpegInfo(version.split("\n")[0]);
    } catch (e) {
      console.error(e);
      toast.error(`Erro ao testar FFmpeg`, { position: "top-center" });
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
              if (imgRef.current) {
                imgRef.current.src = `data:image/jpeg;base64,${data.data}`;
              }
              break;
            case "status":
              setStatus(data.message);
              break;
            case "error":
              toast.error(data.message, { position: "top-center" });
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
        toast.error("Erro de conexão WebSocket", { position: "top-center" });
        setStatus("Erro de conexão");
      };
    } catch (err) {
      toast.error("Falha ao conectar WebSocket", { position: "top-center" });
    }
  };

  const disconnect = () => {
    wsRef.current?.close();
  };

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
      if (imgRef.current) imgRef.current.src = "";
    }
  };

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Status */}
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <div
          className={`size-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
        />
        <span className="font-medium">{status}</span>
      </div>

      {/* Controles */}
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
          <span className="self-center text-xs font-mono text-muted-foreground">
            {ffmpegInfo}
          </span>
        )}
      </div>

      {/* Stream controls */}
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
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-black">
        {currentStream ? (
          <img
            ref={imgRef}
            alt="RTSP Stream"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <span className="text-sm">
              {isConnected
                ? "Selecione uma stream acima"
                : "Conecte-se primeiro"}
            </span>
          </div>
        )}
        {currentStream && (
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white">
            <div className="size-1.5 animate-pulse rounded-full bg-white" />
            AO VIVO —{" "}
            {currentStream === "stream1" ? "Alta qualidade" : "Baixa qualidade"}
          </div>
        )}
      </div>

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
