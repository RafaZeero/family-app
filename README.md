# Tapo Camera Viewer - gortsplib Implementation

This is a refactored version of the Tapo camera viewer that replaces ffmpeg with gortsplib for RTSP stream handling.

## Features

- **gortsplib Integration**: Native Go RTSP client instead of external ffmpeg process
- **Multi-client Support**: Multiple web browsers can view the stream simultaneously
- **Connection Testing**: Test RTSP connectivity before starting the stream
- **Clean Architecture**: Proper separation of concerns with StreamManager
- **Concurrent Safety**: Thread-safe implementation with proper mutex usage

## Architecture

### StreamManager
- Handles RTSP connection using gortsplib
- Manages multiple client connections
- Processes H.264 RTP packets
- Broadcasts frames to all connected clients

### H264Decoder
- Depacketizes RTP packets into H.264 NAL units
- Handles SPS/PPS parameter sets
- Constructs complete H.264 frames

## Current Implementation Status

### ✅ Completed
- RTSP connection and stream negotiation
- RTP packet reception and depacketization
- Multi-client stream management
- Web interface integration
- Connection testing

### 🚧 In Progress - H.264 Decoding
The current implementation includes H.264 depacketization but **requires a complete H.264 decoder** to convert H.264 frames to JPEG images for web display.

#### Current Placeholder
The application currently generates colorful placeholder images to demonstrate the streaming pipeline. Each "frame" shows:
- H.264 data reception confirmation
- Frame size in bytes
- Timestamp

#### Required for Full Implementation
You need to implement one of these approaches:

#### Option 1: FFmpeg Bindings (Recommended for Production)
```go
import "github.com/u2takey/ffmpeg-go"

func decodeH264ToJPEG(h264Data []byte) ([]byte, error) {
    // Use ffmpeg-go to decode H.264 to JPEG
    // This provides the most reliable decoding
}
```

#### Option 2: Pure Go H.264 Decoder
```go
import "github.com/yapingcat/gomedia/go-h264"

func decodeH264ToJPEG(h264Data []byte) ([]byte, error) {
    // Use gomedia for pure Go H.264 decoding
    // Lighter weight but may be less robust
}
```

#### Option 3: Custom Decoder Integration
Implement your own H.264 decoder or integrate with existing libraries.

## API Endpoints

### Web Interface
- `GET /` - Main web interface
- `GET /static/*` - Static assets

### Stream Control
- `POST /stream` - Start RTSP stream with camera config
- `DELETE /stream` - Stop active stream
- `GET /test-connection` - Test RTSP connectivity

### Video Streaming
- `GET /video-stream` - MJPEG video stream endpoint

## Configuration

The application expects the same configuration format as the original:

```json
{
  "ip": "192.168.1.100",
  "username": "admin",
  "password": "your-password",
  "quality": "alta" // or "baixa"
}
```

- `quality: "alta"` → Uses `stream1` (high quality)
- `quality: "baixa"` → Uses `stream2` (low quality)

## Usage

1. Start the application:
```bash
go run .
```

2. Open browser to `http://localhost:8080`

3. Configure camera settings and test connection

4. Start streaming

## Dependencies

```go
require (
    github.com/bluenviron/gortsplib/v4 v4.16.0
    github.com/bluenviron/mediacommon v1.14.0
    github.com/gin-gonic/gin v1.9.1
    github.com/pion/rtp v1.8.21
)
```

## Key Improvements Over FFmpeg Version

1. **No External Dependencies**: Pure Go implementation
2. **Better Error Handling**: Detailed error reporting and connection management
3. **Resource Efficiency**: No subprocess overhead
4. **Concurrent Streaming**: Native support for multiple clients
5. **Integration Friendly**: Easier to extend and integrate with other Go services

## Next Steps for Full Implementation

1. **Choose H.264 Decoder**: Select and integrate one of the decoder options above
2. **Implement Frame Conversion**: Convert decoded frames to JPEG
3. **Performance Optimization**: Add frame rate limiting and quality controls
4. **Error Recovery**: Implement automatic reconnection on stream errors
5. **Configuration Expansion**: Add more Tapo camera configuration options

## File Structure

```
├── main.go              # Main application and StreamManager
├── h264decoder.go       # H.264 RTP depacketization
├── templates/
│   └── index.html       # Web interface
├── go.mod              # Dependencies
└── README.md           # This file
```

## Testing

The application includes comprehensive connection testing that verifies:
- Network connectivity to camera
- RTSP protocol negotiation  
- Stream description parsing
- Authentication validation

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check camera IP, username, password
2. **No Video Stream**: Verify H.264 decoder implementation
3. **Multiple Client Issues**: Check browser caching, try incognito mode
4. **Performance Problems**: Consider implementing frame rate limiting

### Debug Mode

Enable detailed logging by setting Gin to debug mode:
```bash
export GIN_MODE=debug
go run .
```

This implementation provides a solid foundation for RTSP streaming with gortsplib. The main remaining task is implementing the H.264 decoder component based on your specific requirements and constraints.
EOF < /dev/null