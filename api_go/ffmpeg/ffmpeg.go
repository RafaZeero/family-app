package ffmpeg

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
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
	RTSP_URL_STREAM_01 = "rtsp://rafaa99:Rafa1234@%s/stream1" // Alta qualidade
	RTSP_URL_STREAM_02 = "rtsp://rafaa99:Rafa1234@%s/stream2" // Baixa qualidade
)

type Sender interface {
	Send() chan []byte
}

type VideoStream struct {
	streamSelection string
	ip              string
	cmd             *exec.Cmd
	url             string
	stdOutPipe      io.ReadCloser
	stdErrPipe      io.ReadCloser
}

func NewVideoStream() *VideoStream {
	return &VideoStream{}
}

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

	switch vs.streamSelection {
	case "stream1":
		rtspURL = RTSP_URL_STREAM_01
	case "stream2":
		rtspURL = RTSP_URL_STREAM_02
	default:
		rtspURL = "%s"
	}

	vs.url = fmt.Sprintf(rtspURL, vs.ip)
}

func (vs *VideoStream) generateCmd() error {
	ffmpegArgs := []string{
		"-rtsp_transport",
		"tcp",
		"-i",
		vs.url,
		"-f",
		"image2pipe",
		"-vcodec",
		"mjpeg",
		"-r",
		"10",
		"-q:v",
		"5",
		"-",
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

func (vs *VideoStream) handleVideoStream(stream string, cmd *exec.Cmd, stdout io.ReadCloser, c Sender) {
	var buffer []byte
	chunk := make([]byte, 65536)

	for {
		n, err := stdout.Read(chunk)
		if n > 0 {
			buffer = append(buffer, chunk[:n]...)

			for {
				start := bytes.Index(buffer, []byte{0xFF, 0xD8})
				end := bytes.Index(buffer, []byte{0xFF, 0xD9})

				if start == -1 || end == -1 || end <= start {
					break
				}

				frame := buffer[start : end+2]
				encoded := base64.StdEncoding.EncodeToString(frame)
				msg, _ := json.Marshal(map[string]string{
					"type":   "frame",
					"stream": stream,
					"data":   encoded,
				})
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

	cmd.Wait()
}

func (vs *VideoStream) handleErrorStream(stderr io.ReadCloser, c Sender) {
	buf := make([]byte, 4096)
	for {
		n, err := stderr.Read(buf)
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

func (vs *VideoStream) StartStream(ip, stream string, c Sender) {
	vs.Stop()

	vs.ip = ip
	vs.streamSelection = stream
	vs.generateUrl()

	if err := vs.generateCmd(); err != nil {
		log.Fatal(err)
		return
	}

	if err := vs.cmd.Start(); err != nil {
		log.Fatal(err)
		return
	}

	cmd := vs.cmd
	stdout := vs.stdOutPipe
	stderr := vs.stdErrPipe

	go vs.handleVideoStream(stream, cmd, stdout, c)
	go vs.handleErrorStream(stderr, c)
}
