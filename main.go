package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os/exec"

	"github.com/gin-gonic/gin"
)

type CameraConfig struct {
	IP       string `json:"ip"`
	Username string `json:"username"`
	Password string `json:"password"`
	Quality  string `json:"quality"`
}

func main() {
	r := gin.Default()

	r.LoadHTMLGlob("templates/*")
	r.Static("/static", "./static")

	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", gin.H{
			"title": "Tapo Camera Viewer",
		})
	})

	r.POST("/stream", func(c *gin.Context) {
		var config CameraConfig
		if err := c.ShouldBindJSON(&config); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		stream := "stream1"
		if config.Quality == "baixa" {
			stream = "stream2"
		}

		rtspURL := fmt.Sprintf("rtsp://%s:%s@%s/%s",
			config.Username, config.Password, config.IP, stream)

		cmd := exec.Command("ffmpeg",
			"-i", rtspURL,
			"-f", "mjpeg",
			"-q:v", "3",
			"-")

		c.Header("Content-Type", "multipart/x-mixed-replace; boundary=frame")

		stdout, err := cmd.StdoutPipe()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar pipe"})
			return
		}

		if err := cmd.Start(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao iniciar stream"})
			return
		}

		defer cmd.Process.Kill()

		c.Stream(func(w io.Writer) bool {
			buffer := make([]byte, 4096)
			n, err := stdout.Read(buffer)
			if err != nil {
				return false
			}
			w.Write(buffer[:n])
			return true
		})
	})

	r.GET("/test-connection", func(c *gin.Context) {
		ip := c.Query("ip")
		username := c.Query("username")
		password := c.Query("password")

		rtspURL := fmt.Sprintf("rtsp://%s:%s@%s/stream1", username, password, ip)

		cmd := exec.Command("ffprobe", "-v", "quiet", "-print_format", "json", rtspURL)
		if err := cmd.Run(); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Não foi possível conectar à câmera"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	log.Println("Servidor rodando em http://localhost:8080")
	r.Run(":8080")
}
