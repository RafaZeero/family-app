package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	PORT               = 3005
	IP_ADDR            = "192.168.0.5"
	RTSP_URL_STREAM_01 = "rtsp://rafaa99:Rafa1234@%s/stream1" // Alta qualidade
	RTSP_URL_STREAM_02 = "rtsp://rafaa99:Rafa1234@%s/stream2" // Baixa qualidade
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Client struct {
	id   string
	conn *websocket.Conn
	send chan []byte
}

type Manager struct {
	clients    map[string]*Client
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
	mu         sync.RWMutex
}

func NewManager() *Manager {
	return &Manager{
		clients:    make(map[string]*Client),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte),
	}
}

func (m *Manager) Run() {
	for {
		select {
		case client := <-m.register:
			m.mu.Lock()
			m.clients[client.id] = client
			m.mu.Unlock()

		case client := <-m.unregister:
			m.mu.Lock()
			if _, ok := m.clients[client.id]; ok {
				delete(m.clients, client.id)
				close(client.send)
			}
			m.mu.Unlock()

		case message := <-m.broadcast:
			m.mu.RLock()
			for _, client := range m.clients {
				select {
				case client.send <- message:
				default:
					// cliente travado → remove
					close(client.send)
					delete(m.clients, client.id)
				}
			}
			m.mu.RUnlock()
		}
	}
}

func (c *Client) writePump() {
	for msg := range c.send {
		// _msg := []byte(fmt.Sprint("enviando como retorno:", string(msg)))
		err := c.conn.WriteMessage(websocket.TextMessage, msg)
		if err != nil {
			break
		}
	}
	c.conn.Close()
}

type WSPayload struct {
	Action string `json:"action"`
	Stream string `json:"stream"`
}

func (c *Client) readPump(m *Manager) {
	defer func() {
		m.unregister <- c
		c.conn.Close()
	}()

	for {
		_, msg, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		log.Printf("recebido: %s", msg)

		var wsPayload WSPayload

		if err := json.Unmarshal(msg, &wsPayload); err != nil {
			log.Println("Erro parsing data")
			break
		}

		cmd := startRTSPStream(wsPayload.Stream, c)
		defer cmd.Process.Kill()

		// exemplo: rebroadcast
		m.broadcast <- msg
	}
}

func wsHandler(m *Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Upgrade") != "websocket" {
			log.Println("Cliente com protocolo invalido")
			http.Error(w, "invalid protocol - use ws or wss", http.StatusBadRequest)
			return
		}

		auth := r.URL.Query().Get("auth_conn")
		if auth == "" {
			log.Println("Cliente sem autenticacao")
			http.Error(w, "Conexao invalida", http.StatusBadRequest)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		id := uuid.NewString()

		client := &Client{
			id:   id,
			conn: conn,
			send: make(chan []byte, 256),
		}

		m.register <- client

		go client.writePump()
		go client.readPump(m)
	}
}

func startRTSPStream(streamUrl string, c *Client) *exec.Cmd {
	var rtspURL string

	if streamUrl == "stream1" {
		rtspURL = RTSP_URL_STREAM_01
	} else {
		rtspURL = RTSP_URL_STREAM_02
	}

	rtspURL = fmt.Sprintf(rtspURL, IP_ADDR)

	ffmpegArgs := []string{
		"-rtsp_transport",
		"tcp",
		"-i",
		rtspURL,
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

	cmd := exec.Command("ffmpeg", ffmpegArgs...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		log.Fatal(err)
		return nil
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		log.Fatal(err)
		return nil
	}

	cmd.Start()

	go func() {
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
						"stream": streamUrl,
						"data":   encoded,
					})
					select {
					case c.send <- msg:
					default: // canal cheio, descarta frame
					}

					buffer = buffer[end+2:]
				}
			}
			if err != nil {
				break // EOF ou processo morreu
			}
		}

		cmd.Wait() // recolhe o processo filho
	}()

	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := stderr.Read(buf)
			if n > 0 {
				msg := string(buf[:n])
				if strings.ContainsAny(msg, "error\nError\nfailed") {
					// @TODO: improve error
					c.send <- []byte(msg)
				}

			}
			if err != nil {
				break
			}
		}
	}()

	return cmd
}

func main() {
	manager := NewManager()

	go manager.Run()

	http.HandleFunc("/", wsHandler(manager))
	http.ListenAndServe(fmt.Sprintf(":%d", PORT), nil)
}
