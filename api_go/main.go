package main

import (
	"family-app-server/websocket"
	"fmt"
	"net/http"
)

const PORT = 3005

func main() {
	manager := websocket.NewManager()

	go manager.Run()

	http.HandleFunc("/", websocket.Handler(manager))
	http.ListenAndServe(fmt.Sprintf(":%d", PORT), nil)
}
