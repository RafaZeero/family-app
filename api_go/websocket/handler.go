package websocket

import (
	"errors"
	"family-app-server/ffmpeg"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var errInvalidAuthConn = errors.New("Token de verificacao invalido")

const AUTH_CONN = "VdpfcQzI4TSaXn88465ZWP_DRmKdXk19LffV7TEpti0="

type WSPayload struct {
	Action   string `json:"action"`
	Stream   string `json:"stream"`
	IP       string `json:"ip"`
	Username string `json:"username"`
	Password string `json:"password"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func Handler(m *Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Upgrade") != "websocket" {
			log.Println("Cliente com protocolo invalido")
			http.Error(w, "invalid protocol - use ws or wss", http.StatusBadRequest)
			return
		}

		if err := validateAuth(w, r); err != nil {
			log.Println("Cliente sem autenticacao")
			http.Error(w, err.Error(), http.StatusBadRequest)
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

		vs := ffmpeg.NewVideoStream()

		go client.writePump()
		go client.readPump(m, vs)
	}
}

func validateAuth(w http.ResponseWriter, r *http.Request) error {
	auth := r.URL.Query().Get("auth_conn")
	if auth != AUTH_CONN {
		return errInvalidAuthConn
	}
	return nil
}
