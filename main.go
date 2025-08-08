package main

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"os/exec"
	"time"

	"github.com/gin-contrib/cors" // Importa o middleware de CORS
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	// --- CONFIGURAÇÃO DE CORS ATUALIZADA ---
	// Adicionado "POST" aos métodos permitidos e "Content-Type" aos cabeçalhos.
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST"},
		AllowHeaders:     []string{"Origin", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Rota para iniciar o streaming de vídeo da câmera.
	// **NOTA**: Esta rota permanece GET porque a tag <img> no frontend só pode fazer requisições GET.
	r.GET("/stream", func(c *gin.Context) {
		ip := "192.168.0.5"
		username := "rafaa99"
		password := "Rafa1234"
		quality := c.Query("quality")

		stream := "stream1"
		if quality == "baixa" {
			stream = "stream2"
		}

		rtspURL := fmt.Sprintf("rtsp://%s:%s@%s/%s",
			username, password, ip, stream)
		
		log.Printf("Recebida requisição de stream com qualidade: %s", quality)

		log.Printf("Iniciando ffmpeg para a URL: %s", fmt.Sprintf("rtsp://%s:*****@%s/%s", username, ip, stream))

		cmd := exec.Command("ffmpeg",
			"-analyzeduration", "2M",
			"-probesize", "2M",
			"-rtsp_transport", "tcp",
			"-i", rtspURL,
			"-f", "mjpeg",
			"-q:v", "3",
			"-r", "15",
			"-vf", "scale=640:480",
			"-",
		)

		stdout, err := cmd.StdoutPipe()
		if err != nil {
			log.Printf("Erro ao criar StdoutPipe: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar pipe de vídeo"})
			return
		}

		stderr, err := cmd.StderrPipe()
		if err != nil {
			log.Printf("Erro ao criar StderrPipe: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar pipe de erro"})
			return
		}

		if err := cmd.Start(); err != nil {
			log.Printf("Erro ao iniciar ffmpeg: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao iniciar o processo de stream"})
			return
		}

		go func() {
			stderrBuffer := new(bytes.Buffer)
			stderrBuffer.ReadFrom(stderr)
			if stderrBuffer.Len() > 0 {
				log.Printf("Log do FFMPEG: %s", stderrBuffer.String())
			}
		}()

		defer cmd.Process.Kill()

		c.Header("Content-Type", "multipart/x-mixed-replace; boundary=--frame")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "close")
		c.Header("Access-Control-Allow-Origin", "*")

		scanner := bufio.NewScanner(stdout)
		scanner.Split(func(data []byte, atEOF bool) (advance int, token []byte, err error) {
			// Procura por markers JPEG (0xFFD8 início, 0xFFD9 fim)
			if len(data) < 2 {
				return 0, nil, nil
			}

			start := -1
			for i := 0; i < len(data)-1; i++ {
				if data[i] == 0xFF && data[i+1] == 0xD8 {
					start = i
					break
				}
			}

			if start == -1 {
				return len(data), nil, nil
			}

			for i := start; i < len(data)-1; i++ {
				if data[i] == 0xFF && data[i+1] == 0xD9 {
					return i + 2, data[start : i+2], nil
				}
			}

			return 0, nil, nil
		})

		c.Stream(func(w io.Writer) bool {
			if scanner.Scan() {
				frame := scanner.Bytes()
				if len(frame) > 0 {
					fmt.Fprintf(w, "--frame\r\n")
					fmt.Fprintf(w, "Content-Type: image/jpeg\r\n")
					fmt.Fprintf(w, "Content-Length: %d\r\n\r\n", len(frame))
					w.Write(frame)
					fmt.Fprintf(w, "\r\n")
					return true
				}
			}
			return false
		})
	})

	// Rota de teste com stream simulado
	r.GET("/test-stream", func(c *gin.Context) {
		log.Printf("Iniciando stream de teste simulado")
		
		c.Header("Content-Type", "multipart/x-mixed-replace; boundary=--frame")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "close")
		c.Header("Access-Control-Allow-Origin", "*")

		// Criar uma imagem JPEG simples (1x1 pixel preto)
		testFrame := []byte{
			0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
			0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
			0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
			0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
			0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
			0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
			0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
			0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
			0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
			0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
			0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
			0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x00, 0xFF, 0xD9,
		}

		c.Stream(func(w io.Writer) bool {
			for i := 0; i < 60; i++ { // Simular 60 frames
				fmt.Fprintf(w, "--frame\r\n")
				fmt.Fprintf(w, "Content-Type: image/jpeg\r\n")
				fmt.Fprintf(w, "Content-Length: %d\r\n\r\n", len(testFrame))
				w.Write(testFrame)
				fmt.Fprintf(w, "\r\n")
				time.Sleep(100 * time.Millisecond) // 10 FPS
			}
			return false
		})
	})

	// --- ROTA ATUALIZADA ---
	// Rota para testar a conexão agora usa POST e lê os dados do corpo da requisição.
	r.POST("/test-connection", func(c *gin.Context) {
		ip := "192.168.0.5"
		username := "rafaa99"
		password := "Rafa1234"

		rtspURL := fmt.Sprintf("rtsp://%s:%s@%s/stream1", username, password, ip)

		cmd := exec.Command("ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", rtspURL)

		output, err := cmd.CombinedOutput()
		if err != nil {
			log.Printf("Falha na conexão de teste com ffprobe para o IP %s. Erro: %v", ip, err)
			log.Printf("Saída do ffprobe: %s", string(output))
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Não foi possível conectar à câmera. Verifique as credenciais, o IP e a rede.",
				"details": string(output),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	log.Println("Servidor de API rodando em http://localhost:8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Não foi possível iniciar o servidor: %v", err)
	}
}
