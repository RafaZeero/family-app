import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

interface RTSPViewerProps {
  serverUrl?: string;
}

export default function RTSPViewer({
  serverUrl = "ws://localhost:3005/?auth_conn=123",
}: RTSPViewerProps) {
  const [ffmpegInfo, setFfmpegInfo] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentStream, setCurrentStream] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Desconectado");

  const wsRef = useRef<WebSocket | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const testFfmpeg = async () => {
    try {
      const version = await invoke<string>("ffmpeg_version");
      setFfmpegInfo(version.split("\n")[0]);
    } catch (e) {
      setFfmpegInfo(`Erro: ${e}`);
    }
  };

  const connectWebSocket = () => {
    try {
      wsRef.current = new WebSocket(serverUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setStatus("Conectado");
        setError(null);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "frame":
              // Atualiza a imagem com o novo frame
              if (imgRef.current) {
                imgRef.current.src = `data:image/jpeg;base64,${data.data}`;
              }
              break;

            case "status":
              setStatus(data.message);
              break;

            case "error":
              setError(data.message);
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

      wsRef.current.onerror = (err) => {
        setError("Erro de conexão WebSocket");
        setStatus("Erro de conexão");
      };
    } catch (err) {
      setError("Falha ao conectar WebSocket");
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  const startStream = (streamKey: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          action: "start",
          stream: streamKey,
        }),
      );
      setCurrentStream(streamKey);
      setError(null);
    }
  };

  const stopStream = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          action: "stop",
        }),
      );
      setCurrentStream(null);
      if (imgRef.current) {
        imgRef.current.src = "";
      }
    }
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const ConnStats = () => (
    <div className="mb-4 p-3 rounded-lg bg-gray-100">
      <div className="flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        ></div>
        <span className="font-medium">Status: {status}</span>
      </div>
      {error && <div className="mt-2 text-red-600 text-sm">⚠️ {error}</div>}
    </div>
  );

  return (
    <div className="p-2 max-w-4xl w-full bg-blue-500">
      <div className="mb-6">
        {/* Status de conexão */}
        <ConnStats />

        {/* Controles de conexão */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={connectWebSocket}
            disabled={isConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 hover:bg-blue-600 transition-colors"
          >
            {isConnected ? "Conectado" : "Conectar"}
          </button>

          <button
            onClick={disconnect}
            disabled={!isConnected}
            className="px-4 py-2 bg-red-500 text-white rounded-lg disabled:bg-gray-300 hover:bg-red-600 transition-colors"
          >
            Desconectar
          </button>
        </div>

        {/* Teste FFmpeg sidecar */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={testFfmpeg}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Testar FFmpeg sidecar
          </button>
          {ffmpegInfo && (
            <span className="text-sm font-mono text-gray-700">
              {ffmpegInfo}
            </span>
          )}
        </div>

        {/* Controles de stream */}
        {isConnected && (
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => startStream("stream1")}
              disabled={currentStream === "stream1"}
              className="px-4 py-2 bg-green-500 text-white rounded-lg disabled:bg-gray-300 hover:bg-green-600 transition-colors"
            >
              Stream 1 (Alta Qualidade)
            </button>

            <button
              onClick={() => startStream("stream2")}
              disabled={currentStream === "stream2"}
              className="px-4 py-2 bg-green-500 text-white rounded-lg disabled:bg-gray-300 hover:bg-green-600 transition-colors"
            >
              Stream 2 (Baixa Qualidade)
            </button>

            <button
              onClick={stopStream}
              disabled={!currentStream}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg disabled:bg-gray-300 hover:bg-orange-600 transition-colors"
            >
              Parar Stream
            </button>
          </div>
        )}
      </div>

      {/* Visualizador de vídeo */}
      <div
        className="relative bg-black rounded-lg overflow-hidden"
        style={{ aspectRatio: "16/9" }}
      >
        {currentStream ? (
          <img
            ref={imgRef}
            alt="RTSP Stream"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">📹</div>
              <div>Nenhuma stream ativa</div>
              <div className="text-sm mt-2">
                {isConnected
                  ? "Selecione uma stream acima"
                  : "Conecte-se primeiro"}
              </div>
            </div>
          </div>
        )}

        {/* Indicador de stream ativa */}
        {currentStream && (
          <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            AO VIVO -{" "}
            {currentStream === "stream1" ? "Alta Qualidade" : "Baixa Qualidade"}
          </div>
        )}
      </div>

      {/* Informações técnicas */}
      <div className="mt-6 text-sm text-gray-600">
        <h3 className="font-medium mb-2">Informações da Câmera:</h3>
        <ul className="space-y-1">
          <li>• IP: 192.168.0.5</li>
          <li>• Usuário: rafaa99</li>
          <li>• Stream 1: Alta qualidade (rtsp://192.168.0.5/stream1)</li>
          <li>• Stream 2: Baixa qualidade (rtsp://192.168.0.5/stream2)</li>
          <li>• Porta RTSP: 554</li>
        </ul>
      </div>
    </div>
  );
}
