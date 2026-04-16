package ffmpeg

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"family-app-server/types"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

const (
	RTSP_URL_STREAM_01 = "rtsp://%s:%s@%s/stream1" // Alta qualidade
	RTSP_URL_STREAM_02 = "rtsp://%s:%s@%s/stream2" // Baixa qualidade
)

type Sender interface {
	Send() chan []byte
}

type FrameMsg struct {
	Type   string `json:"type"`
	Stream string `json:"stream"`
	Data   string `json:"data"`
}

type VideoStream struct {
	streamSelection string
	ip              string
	username        string
	password        string
	cmd             *exec.Cmd
	url             string
	stdOutPipe      io.ReadCloser
	stdErrPipe      io.ReadCloser
}

func NewVideoStream() *VideoStream {
	return &VideoStream{}
}

// @TODO: isso aqui tem q mudar pra colocar o sidecar como padrao
func findFFmpeg() string {
	exe, err := os.Executable()
	if err != nil {
		return "ffmpeg"
	}

	dir := filepath.Dir(exe)

	name := "ffmpeg"

	if runtime.GOOS == "windows" {
		name = "ffmpeg.exe"
	}

	bundled := filepath.Join(dir, name)
	if _, err := os.Stat(bundled); err == nil {
		return bundled
	}

	return "ffmpeg"
}

func (vs *VideoStream) generateUrl() {
	var rtspURL string

	// @TODO: colocar stream selection dinamico, pois acho q nem toda camera tem esses valores stream1 e stream2, sei la
	switch vs.streamSelection {
	case "stream1":
		rtspURL = RTSP_URL_STREAM_01
	case "stream2":
		rtspURL = RTSP_URL_STREAM_02
	default:
		vs.url = fmt.Sprintf("rtsp://%s", vs.ip)
		return
	}

	vs.url = fmt.Sprintf(rtspURL, vs.username, vs.password, vs.ip)
}

func (vs *VideoStream) generateCmd() error {
	ffmpegArgs := []string{
		// --- Transporte / input ---
		"-rtsp_transport", "tcp", // força RTSP via TCP (mais estável que UDP)
		"-i", vs.url, // URL do stream RTSP

		// --- Formato de saída ---
		"-f", "image2pipe", // saída como stream contínuo de imagens
		"-vcodec", "mjpeg", // cada frame será um JPEG (MJPEG)

		// --- Controle de qualidade ---
		"-r", "10", // limita FPS (10 frames por segundo)
		"-q:v", "5", // qualidade do JPEG (menor = melhor qualidade)

		// --- Output ---
		"-", // stdout (pipe para o processo Go ler)
	}

	cmd := exec.Command(findFFmpeg(), ffmpegArgs...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	vs.cmd = cmd
	vs.stdOutPipe = stdout
	vs.stdErrPipe = stderr

	return nil
}

func (vs *VideoStream) handleVideoStream(c Sender) {
	var buffer []byte
	chunk := make([]byte, 65536) // 2^16, 16 bits ou short integer

	for {
		n, err := vs.stdOutPipe.Read(chunk) // le o chunks
		if n > 0 {
			buffer = append(buffer, chunk[:n]...) // coloca no buffer

			for {
				start := bytes.Index(buffer, []byte{0xFF, 0xD8}) // procura comeco de imagem JPEG
				end := bytes.Index(buffer, []byte{0xFF, 0xD9})   // procura final de imagem JPEG

				if start == -1 || end == -1 || end <= start {
					break
				}

				frame := buffer[start : end+2] // pega 1 frame. +2 pois inclui os 2 bytes finais (FFD9)

				encoded := base64.StdEncoding.EncodeToString(frame) // encode pra base64

				frameMsg := FrameMsg{
					Type:   "frame",
					Stream: vs.streamSelection,
					Data:   encoded,
				}

				msg, _ := json.Marshal(frameMsg)

				select {
				case c.Send() <- msg:
				default:
				}

				buffer = buffer[end+2:]
			}
		}
		if err != nil {
			break
		}
	}

	vs.cmd.Wait()
}

func (vs *VideoStream) handleErrorStream(c Sender) {
	buf := make([]byte, 4096)

	for {
		n, err := vs.stdErrPipe.Read(buf)
		if n > 0 {
			msg := string(buf[:n])
			if strings.ContainsAny(msg, "error\nError\nfailed") {
				// @TODO: improve error
				select {
				case c.Send() <- []byte(msg):
				default:
				}
			}
		}
		if err != nil {
			break
		}
	}
}

func (vs *VideoStream) Stop() {
	if vs.cmd != nil && vs.cmd.Process != nil {
		vs.cmd.Process.Kill()
	}

	vs.cmd = nil
	vs.stdOutPipe = nil
	vs.stdErrPipe = nil
}

func (vs *VideoStream) StartStream(payload types.WSPayload, c Sender) {
	// limpa os bgl
	vs.Stop()

	// define os dados na struct vs
	vs.ip = payload.IP
	vs.username = payload.Username
	vs.password = payload.Password
	vs.streamSelection = payload.Stream
	vs.generateUrl() // @TODO: queria mudar isso aqui mas eh preciosismo, deixar pra depois

	// cria o cmd (nao executa) pro ffmpeg e ajusta os pipes de leitura
	if err := vs.generateCmd(); err != nil {
		log.Fatal(err)
		return
	}

	// executa o cmd
	if err := vs.cmd.Start(); err != nil {
		log.Fatal(err)
		return
	}

	// leitura dos pipes nas goroutines
	go vs.handleVideoStream(c)
	go vs.handleErrorStream(c)
}
