package main

import (
	"context"
	"family-app-server/websocket"
	"fmt"
	"log"
	"net/http"
	"time"

	detectorpb "family-app-server/proto/detectorpb"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

const PORT = 3005

func main() {
	manager := websocket.NewManager()

	go manager.Run()

	go gRPCRun()

	http.HandleFunc("/", websocket.Handler(manager))
	http.ListenAndServe(fmt.Sprintf(":%d", PORT), nil)
}

func gRPCRun() {
	conn, err := grpc.NewClient(
		"localhost:50051",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalf("erro ao conectar no servidor grpc: %v", err)
	}
	defer conn.Close()

	client := detectorpb.NewDetectorServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := client.Detect(ctx, &detectorpb.DetectRequest{
		SourceId:    "camera-01",
		Payload:     "teste vindo do Go",
		TimestampMs: time.Now().UnixMilli(),
	})
	if err != nil {
		log.Fatalf("erro ao chamar Detect: %v", err)
	}

	log.Printf("ok=%v", resp.Ok)
	log.Printf("message=%s", resp.Message)
	log.Printf("received_source_id=%s", resp.ReceivedSourceId)
	log.Printf("received_payload=%s", resp.ReceivedPayload)
	log.Printf("processed_at_ms=%d", resp.ProcessedAtMs)
}
