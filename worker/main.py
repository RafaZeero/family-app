import time
from concurrent import futures

import cv2
import grpc
import torch
from ultralytics.models import yolo

import detector_pb2
import detector_pb2_grpc

MAX_WORKER = 10


class DetectorService(detector_pb2_grpc.DetectorServiceServicer):
    def Detect(
        self,
        request: detector_pb2.DetectRequest,
        context: grpc.ServicerContext,
    ) -> detector_pb2.DetectResponse:
        print("Msg recebida")
        print(f"source_id={request.source_id}")
        print(f"payload={request.payload}")
        print(f"timestamp_ms={request.timestamp_ms}")

        return detector_pb2.DetectResponse(
            ok=True,
            message="python recebeu :D",
            received_source_id=request.source_id,
            received_payload=request.payload,
            processed_at_ms=int(time.time() * 1000),
        )


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=MAX_WORKER))
    detector_pb2_grpc.add_DetectorServiceServicer_to_server(DetectorService(), server)

    server.add_insecure_port("[::]:50051")
    server.start()
    print("gRPC python rodando porta :50051")
    server.wait_for_termination()


def check_gpu():
    print(torch.cuda.is_available())
    print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else "sem gpu")


def spawn_model() -> yolo.YOLO:
    model = yolo.YOLO("yolo26n.pt")

    return model


def capture_video() -> cv2.VideoCapture:
    return cv2.VideoCapture(0)


def main():
    check_gpu()
    model = spawn_model()

    cap = capture_video()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        start = time.time()
        results = model(frame)

        print("latency:", time.time() - start)

        annotated = results[0].plot()

        cv2.imshow("YOLO", annotated)

        if cv2.waitKey(1) == 27:
            cap.release()
            cv2.destroyAllWindows()
            break

    # serve()


if __name__ == "__main__":
    main()
