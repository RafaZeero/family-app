package websocket

import (
	"encoding/json"
	"family-app-server/ffmpeg"
	"log"

	"github.com/gorilla/websocket"
)

const (
	ACTION_START = "start"
	ACTION_STOP  = "stop"
)

type Client struct {
	id   string
	conn *websocket.Conn
	send chan []byte
}

func (c *Client) Send() chan []byte {
	return c.send
}

func (c *Client) writePump() {
	for msg := range c.send {
		err := c.conn.WriteMessage(websocket.TextMessage, msg)
		if err != nil {
			break
		}
	}
	c.conn.Close()
}

func (c *Client) readPump(m *Manager, vs *ffmpeg.VideoStream) {
	defer func() {
		vs.Stop()
		m.unregister <- c
		c.conn.Close()
	}()

	for {
		_, msg, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		var wsPayload WSPayload

		if err := json.Unmarshal(msg, &wsPayload); err != nil {
			log.Println("Erro parsing data")
			continue
		}

		switch wsPayload.Action {
		case ACTION_START:
			if wsPayload.IP == "" {
				log.Println("Empty ip")
				break
			}
			vs.StartStream(wsPayload.IP, wsPayload.Stream, c)
		case ACTION_STOP:
			vs.Stop()
		default:
			log.Printf("action desconhecida: %s", wsPayload.Action)
		}
	}
}
