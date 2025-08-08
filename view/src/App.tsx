import React, { useState, useCallback, useRef, useEffect } from "react";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// --- Definições de Tipos ---

type StatusType = "disconnected" | "warning" | "connected";

interface Status {
  message: string;
  type: StatusType;
}

interface CameraConfig {
  quality: "alta" | "baixa";
}

// --- Props dos Componentes ---

interface StatusIconProps {
  type: StatusType;
}

interface VideoStreamProps {
  streamUrl: string | null;
  onLoad: () => void;
  onError: () => void;
}

// --- Componentes ---

// Componente para um ícone de status (círculo colorido)
const StatusIcon: React.FC<StatusIconProps> = ({ type }) => {
  const colorClasses: Record<StatusType, string> = {
    disconnected: "bg-red-500",
    warning: "bg-yellow-500",
    connected: "bg-green-500",
  };
  return (
    <span
      className={`w-3 h-3 rounded-full inline-block mr-2 ${colorClasses[type]}`}
    ></span>
  );
};

// Componente de streaming de vídeo com FFmpeg
const VideoStream: React.FC<VideoStreamProps> = ({ streamUrl, onLoad, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ffmpegRef = useRef<FFmpeg>(new FFmpeg());
  const [isLoaded, setIsLoaded] = useState(false);
  const [mediaSource, setMediaSource] = useState<MediaSource | null>(null);

  // Inicializar FFmpeg
  const loadFFmpeg = useCallback(async () => {
    const ffmpeg = ffmpegRef.current;
    
    if (isLoaded) return;

    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      setIsLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar FFmpeg:', error);
      onError();
    }
  }, [isLoaded, onError]);

  // Processar stream MJPEG
  const processStream = useCallback(async () => {
    if (!streamUrl || !isLoaded) return;

    const video = videoRef.current;

    try {
      // Fetch do stream MJPEG
      const response = await fetch(streamUrl);
      if (!response.ok) {
        throw new Error('Falha ao conectar com o stream');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream não disponível');
      }

      // Criar MediaSource para streaming
      const ms = new MediaSource();
      setMediaSource(ms);

      if (video) {
        video.src = URL.createObjectURL(ms);
        
        ms.addEventListener('sourceopen', async () => {
          try {
            const sourceBuffer = ms.addSourceBuffer('video/mp4; codecs="avc1.42E01E"');
            
            let buffer = new Uint8Array();
            
            const processChunk = async ({ done, value }: ReadableStreamReadResult<Uint8Array>) => {
              if (done) {
                if (ms.readyState === 'open') {
                  ms.endOfStream();
                }
                return;
              }

              // Para simplificar, vamos apenas mostrar os frames MJPEG diretamente
              // em um canvas ao invés de converter para MP4
              const frames = extractJPEGFrames(value);
              
              for (const frame of frames) {
                displayJPEGFrame(frame);
              }

              reader.read().then(processChunk);
            };

            reader.read().then(processChunk);
            onLoad();
          } catch (error) {
            console.error('Erro ao configurar MediaSource:', error);
            // Fallback: usar canvas para exibir frames
            processStreamToCanvas();
          }
        });
      }

    } catch (error) {
      console.error('Erro ao processar stream:', error);
      processStreamToCanvas();
    }
  }, [streamUrl, isLoaded, onLoad, onError]);

  // Fallback: processar stream diretamente no canvas
  const processStreamToCanvas = async () => {
    if (!streamUrl) return;

    try {
      const response = await fetch(streamUrl);
      const reader = response.body?.getReader();
      
      if (!reader) return;

      let buffer = new Uint8Array();

      const processChunk = async ({ done, value }: ReadableStreamReadResult<Uint8Array>) => {
        if (done) return;

        const newBuffer = new Uint8Array(buffer.length + value.length);
        newBuffer.set(buffer);
        newBuffer.set(value, buffer.length);
        buffer = newBuffer;

        const frames = extractJPEGFrames(buffer);
        
        for (const frame of frames) {
          displayJPEGFrame(frame);
        }

        reader.read().then(processChunk);
      };

      reader.read().then(processChunk);
      onLoad();
    } catch (error) {
      console.error('Erro no fallback canvas:', error);
      onError();
    }
  };

  // Extrair frames JPEG do buffer MJPEG
  const extractJPEGFrames = (buffer: Uint8Array): Uint8Array[] => {
    const frames: Uint8Array[] = [];
    let start = 0;

    while (start < buffer.length - 1) {
      const jpegStart = findJPEGMarker(buffer, start, 0xFFD8);
      if (jpegStart === -1) break;

      const jpegEnd = findJPEGMarker(buffer, jpegStart + 2, 0xFFD9);
      if (jpegEnd === -1) break;

      const frame = buffer.slice(jpegStart, jpegEnd + 2);
      frames.push(frame);
      
      start = jpegEnd + 2;
    }

    return frames;
  };

  // Encontrar marcadores JPEG no buffer
  const findJPEGMarker = (buffer: Uint8Array, start: number, marker: number): number => {
    for (let i = start; i < buffer.length - 1; i++) {
      if (buffer[i] === 0xFF && 
          ((marker === 0xFFD8 && buffer[i + 1] === 0xD8) ||
           (marker === 0xFFD9 && buffer[i + 1] === 0xD9))) {
        return i;
      }
    }
    return -1;
  };

  // Exibir frame JPEG no canvas
  const displayJPEGFrame = (frame: Uint8Array) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      // Atualizar o canvas visível
      const visibleCanvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (visibleCanvas) {
        const visibleCtx = visibleCanvas.getContext('2d');
        visibleCanvas.width = img.width;
        visibleCanvas.height = img.height;
        visibleCtx?.drawImage(img, 0, 0);
      }
    };
    
    const blob = new Blob([frame], { type: 'image/jpeg' });
    img.src = URL.createObjectURL(blob);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (mediaSource && mediaSource.readyState === 'open') {
        mediaSource.endOfStream();
      }
    };
  }, [mediaSource]);

  // Inicializar FFmpeg
  useEffect(() => {
    loadFFmpeg();
  }, [loadFFmpeg]);

  // Processar stream quando URL mudar
  useEffect(() => {
    if (streamUrl && isLoaded) {
      processStream();
    }
  }, [streamUrl, isLoaded, processStream]);

  if (!streamUrl) {
    return (
      <div className="flex items-center justify-center min-h-[480px] text-gray-500">
        <div className="text-center">
          <p>Stream desconectado</p>
          <p className="text-sm">Configure e clique em "Conectar"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="max-w-full max-h-[600px] rounded bg-black"
        style={{ display: mediaSource ? 'block' : 'none' }}
      />
      
      <canvas
        className="max-w-full max-h-[600px] rounded bg-black"
        style={{ display: !mediaSource ? 'block' : 'none' }}
      />
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded">
          <div className="text-center text-white">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>Carregando FFmpeg...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Componente Principal ---

export default function App() {
  // Estado para armazenar os dados da câmera
  const [config, setConfig] = useState<CameraConfig>({
    quality: "alta",
  });

  // Estado para a URL do stream de vídeo
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  // Estado para mensagens de status e controle dos botões
  const [status, setStatus] = useState<Status>({
    message: "Desconectado",
    type: "disconnected",
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Função para atualizar o estado da configuração
  const handleConfigChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value } = e.target;
      setConfig((prev) => ({
        ...prev,
        [id]: id === "quality" ? (value as "alta" | "baixa") : value,
      }));
    },
    [],
  );

  // Função para testar a conexão com o backend Go
  const handleTestConnection = async () => {
    setIsTesting(true);
    setStatus({ message: "Testando conexão...", type: "warning" });

    try {
      const response = await fetch(`http://localhost:8080/test-connection`, {
        method: "post",
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setStatus({ message: "Conexão bem-sucedida!", type: "connected" });
      } else {
        setStatus({
          message: `Falha na conexão: ${result.error || "Erro desconhecido"}`,
          type: "disconnected",
        });
      }
    } catch {
      setStatus({
        message: "Erro de rede ao testar. Backend está no ar?",
        type: "disconnected",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Função para iniciar o stream
  const handleStartStream = () => {
    setIsConnecting(true);
    setStatus({ message: "Iniciando stream...", type: "warning" });

    // Usar stream de teste primeiro para debug
    setStreamUrl(`http://localhost:8080/test-stream`);
    
    // Para usar o stream real da câmera, descomente abaixo:
    // const params = new URLSearchParams({ quality: config.quality });
    // setStreamUrl(`http://localhost:8080/stream?${params.toString()}`);
  };

  // Função para parar o stream
  const handleStopStream = useCallback(() => {
    setStreamUrl(null);
    setIsConnecting(false);
    setStatus({ message: "Desconectado", type: "disconnected" });
  }, []);

  // Callbacks para os eventos da tag <img>
  const onImageLoad = () => {
    setStatus({ message: "Stream ativo", type: "connected" });
    setIsConnecting(false);
  };

  const onImageError = () => {
    setStatus({
      message: "Erro no stream. Verifique o console do backend.",
      type: "disconnected",
    });
    handleStopStream();
  };

  const isStreaming = streamUrl !== null;

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-4xl font-bold text-blue-400">
            Tapo Camera Viewer
          </h1>
          <p className="text-gray-400">React + Go (FFmpeg)</p>
        </header>

        <main>
          {/* Seção de Configuração */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
            <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">
              Configuração da Câmera
            </h2>

            <div className="mb-4">
              <span className="block text-sm font-medium text-gray-300 mb-2">
                Qualidade
              </span>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    id="quality"
                    name="quality"
                    value="alta"
                    checked={config.quality === "alta"}
                    onChange={handleConfigChange}
                    className="form-radio h-4 w-4 text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-300">Alta</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    id="quality"
                    name="quality"
                    value="baixa"
                    checked={config.quality === "baixa"}
                    onChange={handleConfigChange}
                    className="form-radio h-4 w-4 text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-300">Baixa</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-700">
              <button
                onClick={handleTestConnection}
                disabled={isTesting || isStreaming}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? "Testando..." : "Testar Conexão"}
              </button>
              <button
                onClick={handleStartStream}
                disabled={isStreaming || isConnecting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? "Conectando..." : "Conectar"}
              </button>
              <button
                onClick={handleStopStream}
                disabled={!isStreaming}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Desconectar
              </button>
            </div>
          </div>

          {/* Seção do Player de Vídeo */}
          <div className="bg-black rounded-lg shadow-lg flex items-center justify-center min-h-[480px] p-2">
            <VideoStream
              streamUrl={streamUrl}
              onLoad={onImageLoad}
              onError={onImageError}
            />
          </div>

          {/* Barra de Status */}
          <div className="mt-4 bg-gray-800 p-3 rounded-lg shadow-lg flex items-center justify-center">
            <StatusIcon type={status.type} />
            <span className="font-medium">{status.message}</span>
          </div>
        </main>
      </div>
    </div>
  );
}
