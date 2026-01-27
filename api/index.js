import express from "express";
import { WebSocketServer } from "ws";
import cors from "cors";
import { spawn } from "child_process";
import { createServer } from "http";
import os from "os";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

function GetIpAddr() {
  const networkInterfaces = os.networkInterfaces();

  // Iterate through the network interfaces to find IPv4 addresses that are not internal (loopback)
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === "IPv4" && !iface.internal) {
        console.log(`Local IP Address (${interfaceName}): ${iface.address}`);
        // You can break here if you only need one, or continue to list all
        // break;
        return iface.address;
      }
    }
  }
}

// const IP_ADDR = GetIpAddr();
const IP_ADDR = "192.168.0.5";

// URLs das streams RTSP
const RTSP_URLS = {
  stream1: `rtsp://rafaa99:Rafa1234@${IP_ADDR}/stream1`, // Alta qualidade
  stream2: `rtsp://rafaa99:Rafa1234@${IP_ADDR}/stream2`, // Baixa qualidade
};

let activeStreams = new Map(); // Controla streams ativas

// Função para iniciar stream RTSP usando spawn direto
function startRTSPStream(streamKey, ws) {
  const rtspUrl = RTSP_URLS[streamKey];

  console.log(`Iniciando stream: ${streamKey} - ${rtspUrl}`);

  // Argumentos FFmpeg otimizados para RTSP
  const ffmpegArgs = [
    "-rtsp_transport",
    "tcp",
    "-i",
    rtspUrl,
    "-f",
    "image2pipe",
    "-vcodec",
    "mjpeg",
    "-r",
    "10",
    "-q:v",
    "5",
    "-",
  ];

  const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

  let buffer = Buffer.alloc(0);

  ffmpegProcess.stdout.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    // Procura por marcadores JPEG (0xFFD8 início, 0xFFD9 fim)
    let startIndex = buffer.indexOf(Buffer.from([0xff, 0xd8]));
    let endIndex = buffer.indexOf(Buffer.from([0xff, 0xd9]));

    while (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      // Extrai frame JPEG completo
      const frameBuffer = buffer.slice(startIndex, endIndex + 2);

      // Envia frame via WebSocket como base64
      if (ws.readyState === ws.OPEN) {
        const base64Frame = frameBuffer.toString("base64");
        ws.send(
          JSON.stringify({
            type: "frame",
            stream: streamKey,
            data: base64Frame,
          }),
        );
      }

      // Remove frame processado do buffer
      buffer = buffer.slice(endIndex + 2);
      startIndex = buffer.indexOf(Buffer.from([0xff, 0xd8]));
      endIndex = buffer.indexOf(Buffer.from([0xff, 0xd9]));
    }
  });

  ffmpegProcess.stderr.on("data", (data) => {
    const errorMsg = data.toString();
    // Filtrar logs normais do FFmpeg
    if (
      errorMsg.includes("error") ||
      errorMsg.includes("Error") ||
      errorMsg.includes("failed")
    ) {
      console.error(`FFmpeg stderr para ${streamKey}:`, errorMsg);
      ws.send(
        JSON.stringify({
          type: "error",
          message: `Erro na stream ${streamKey}: ${errorMsg.split("\n")[0]}`,
        }),
      );
    }
  });

  ffmpegProcess.on("error", (err) => {
    console.error(`Erro ao iniciar FFmpeg para ${streamKey}:`, err);
    ws.send(
      JSON.stringify({
        type: "error",
        message: `Erro ao iniciar stream ${streamKey}: ${err.message}`,
      }),
    );
  });

  ffmpegProcess.on("close", (code) => {
    console.log(`FFmpeg para ${streamKey} finalizou com código: ${code}`);
    if (code !== 0 && code !== null) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: `Stream ${streamKey} foi interrompida (código: ${code})`,
        }),
      );
    }
  });

  return ffmpegProcess;
}

// WebSocket connections
wss.on("connection", (ws) => {
  console.log("Cliente conectado via WebSocket");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.action === "start" && data.stream) {
        // Para stream anterior se existir
        if (activeStreams.has(ws)) {
          activeStreams.get(ws).kill("SIGTERM");
        }

        // Inicia nova stream
        const ffmpegProcess = startRTSPStream(data.stream, ws);
        activeStreams.set(ws, ffmpegProcess);

        ws.send(
          JSON.stringify({
            type: "status",
            message: `Stream ${data.stream} iniciada`,
          }),
        );
      }

      if (data.action === "stop") {
        if (activeStreams.has(ws)) {
          activeStreams.get(ws).kill("SIGTERM");
          activeStreams.delete(ws);

          ws.send(
            JSON.stringify({
              type: "status",
              message: "Stream parada",
            }),
          );
        }
      }
    } catch (error) {
      console.error("Erro ao processar mensagem WebSocket:", error);
    }
  });

  ws.on("close", () => {
    console.log("Cliente desconectado");
    if (activeStreams.has(ws)) {
      activeStreams.get(ws).kill("SIGTERM");
      activeStreams.delete(ws);
    }
  });
});

// Rota de teste
app.get("/", (req, res) => {
  res.json({
    message: "Servidor RTSP WebSocket ativo",
    streams: Object.keys(RTSP_URLS),
  });
});

// Teste de conectividade RTSP
app.get("/test/:stream", (req, res) => {
  const streamKey = req.params.stream;
  const rtspUrl = RTSP_URLS[streamKey];

  if (!rtspUrl) {
    return res.status(404).json({ error: "Stream não encontrada" });
  }

  // Testa conectividade RTSP com timeout
  const testProcess = spawn("ffprobe", [
    "-rtsp_transport",
    "tcp",
    "-timeout",
    "5000000", // 5 segundos
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_streams",
    rtspUrl,
  ]);

  let output = "";

  testProcess.stdout.on("data", (data) => {
    output += data.toString();
  });

  testProcess.on("close", (code) => {
    if (code === 0) {
      try {
        const streamInfo = JSON.parse(output);
        res.json({
          success: true,
          streamKey,
          url: rtspUrl,
          info: streamInfo,
        });
      } catch (e) {
        res.json({
          success: true,
          streamKey,
          url: rtspUrl,
          message: "Stream acessível mas sem informações detalhadas",
        });
      }
    } else {
      res.status(500).json({
        success: false,
        streamKey,
        url: rtspUrl,
        error: `Falha na conexão (código: ${code})`,
      });
    }
  });
});

const PORT = process.env.PORT || 3005;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`WebSocket disponível em ws://localhost:${PORT}`);
  console.log(`Teste de streams: http://localhost:${PORT}/test/stream1`);
});
