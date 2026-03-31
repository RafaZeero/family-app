package websocket

import (
	"sync"
)

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
			m.openConn(client)

		case client := <-m.unregister:
			m.closeConn(client)

		case message := <-m.broadcast:
			m.broadcastMessage(message)
		}
	}
}

func (m *Manager) openConn(c *Client) {
	m.mu.Lock()
	m.clients[c.id] = c
	m.mu.Unlock()
}

func (m *Manager) closeConn(c *Client) {
	m.mu.Lock()
	if _, ok := m.clients[c.id]; ok {
		delete(m.clients, c.id)
		close(c.send)
	}
	m.mu.Unlock()
}

func (m *Manager) broadcastMessage(msg []byte) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, client := range m.clients {
		select {
		case client.send <- msg:
		default:
			close(client.send)
			delete(m.clients, client.id)
		}
	}
}
