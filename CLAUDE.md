# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kids Cam is a Tauri-based desktop application for viewing RTSP camera streams from Tapo cameras. The project uses a multi-language architecture with:
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui components
- **Backend API**: Node.js/Express with WebSocket support for RTSP streaming (uses FFmpeg)
- **Desktop Wrapper**: Tauri v2 (Rust)
- **Experimental Rust API**: Axum-based API server (in development)

The application connects to IP cameras via RTSP, processes video streams through FFmpeg, and displays them in real-time via WebSocket connections.

## Development Commands

### Running the Application

```bash
# Start both API server and Tauri app in parallel (recommended for development)
make dev

# Or individually:
make api      # Start Node.js API server on port 3005
make tauri    # Start Tauri desktop app (frontend on port 3006)
make view     # Start only frontend dev server
```

### Installation & Setup

```bash
# Install all dependencies (API + frontend)
make install

# Or manually:
cd api && pnpm install
cd view && pnpm install
```

### Frontend Commands

```bash
cd view
pnpm run dev      # Start Vite dev server on port 3006
pnpm run build    # TypeScript compile + production build
pnpm run lint     # ESLint with React hooks plugin
pnpm run preview  # Preview production build
```

### API Commands

```bash
cd api
pnpm run dev      # Start API with nodemon (auto-reload)
pnpm run start    # Start API in production mode
```

### Tauri Commands

```bash
# From project root:
cargo tauri dev   # Start Tauri in development mode
cargo tauri build # Build production app

# Tauri automatically runs the frontend dev server via beforeDevCommand
```

### Rust API (Experimental)

```bash
cd api_rs
cargo run         # Start Axum server on port 5000
cargo build       # Build the API
cargo test        # Run tests
```

### Cleaning

```bash
make clean        # Remove all node_modules and build artifacts
```

## Architecture

### Multi-Process Architecture

The application runs as three separate processes:

1. **Node.js API Server** (`api/index.js`)
   - Runs on port 3005
   - WebSocket server for real-time video streaming
   - Spawns FFmpeg processes to decode RTSP streams
   - Converts H.264 video to MJPEG frames
   - Sends base64-encoded JPEG frames to frontend via WebSocket

2. **React Frontend** (`view/`)
   - Runs on port 3006 (Vite dev server)
   - Main component: `RTSPViewer.tsx`
   - Connects to API via WebSocket
   - Displays video stream using base64-encoded image updates
   - Built with shadcn/ui component library

3. **Tauri Desktop Wrapper** (`src-tauri/`)
   - Wraps the React frontend in a native desktop window
   - Minimal Rust code - primarily configuration
   - Uses `tauri.conf.json` to point to frontend dev server or built files

### Video Streaming Flow

1. User clicks "Connect" in RTSPViewer component
2. WebSocket connection established to `ws://localhost:3005`
3. User selects stream quality (stream1=high, stream2=low)
4. API spawns FFmpeg process with RTSP URL
5. FFmpeg decodes H.264 RTSP stream to MJPEG
6. API extracts JPEG frames from FFmpeg stdout (looks for 0xFFD8/0xFFD9 markers)
7. Frames sent as base64 over WebSocket
8. Frontend updates `<img>` src with `data:image/jpeg;base64,...`

### RTSP Configuration

The API is currently hardcoded with camera credentials in `api/index.js`:

```javascript
const IP_ADDR = "192.168.0.5";
const RTSP_URLS = {
  stream1: `rtsp://rafaa99:Rafa1234@${IP_ADDR}/stream1`, // High quality
  stream2: `rtsp://rafaa99:Rafa1234@${IP_ADDR}/stream2`, // Low quality
};
```

⚠️ These credentials should be moved to environment variables or a configuration file.

### Tauri Integration

The Tauri app is configured to:
- Run `pnpm run dev` in the `view/` directory before starting (dev mode)
- Run `pnpm run build` before creating production build
- Point to `http://localhost:3006` in development
- Serve from `view/` directory in production

The Tauri Rust code is minimal - it just initializes the app with logging support.

## Project Structure

```
.
├── api/                    # Node.js WebSocket API server
│   ├── index.js           # Main server file with FFmpeg streaming logic
│   └── package.json       # Dependencies: express, ws, cors
├── api_rs/                # Experimental Rust API (Axum)
│   ├── src/main.rs        # Basic Axum server with JSON endpoints
│   └── Cargo.toml         # Dependencies: axum, tokio, serde
├── view/                  # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── RTSPViewer.tsx       # Main video streaming component
│   │   │   └── ui/                   # shadcn/ui components
│   │   ├── App.tsx        # Root component
│   │   └── main.tsx       # Entry point
│   ├── vite.config.ts     # Vite config with @ alias
│   └── package.json       # React 19, shadcn/ui, Tailwind v4
├── src-tauri/             # Tauri desktop wrapper
│   ├── src/
│   │   ├── main.rs        # Entry point
│   │   └── lib.rs         # Tauri app initialization
│   ├── tauri.conf.json    # Tauri configuration
│   └── Cargo.toml         # Tauri dependencies
├── Makefile               # Development commands
└── README.md              # Original Go implementation docs (outdated)
```

## Key Technical Details

### Frontend

- **Path Alias**: `@` maps to `view/src/` (configured in `vite.config.ts`)
- **Styling**: Uses Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- **Component Library**: Full shadcn/ui installation with 40+ components
- **State Management**: React hooks (useState, useEffect, useRef)
- **WebSocket**: Native browser WebSocket API, no external libraries

### API

- **FFmpeg Arguments**:
  - `-rtsp_transport tcp`: Force TCP for reliability
  - `-f image2pipe`: Pipe MJPEG frames to stdout
  - `-vcodec mjpeg`: Convert to MJPEG
  - `-r 10`: 10 frames per second
  - `-q:v 5`: JPEG quality (1-31, lower = better)
- **Frame Parsing**: Looks for JPEG markers in stdout buffer
- **Connection Management**: Each WebSocket client gets its own FFmpeg process
- **Process Cleanup**: Kills FFmpeg on client disconnect

### Tauri

- **Version**: Tauri v2.5.0
- **Frontend Build**: Points to `view/` directory
- **Dev Server**: Configured to use port 3006
- **Window Config**: 800x600, resizable, titled "kids-cam"

## Important Notes

### Current State

The README.md describes a Go implementation with gortsplib that is **not** the current implementation. The actual running code is the Node.js implementation in `api/index.js`.

The experimental Rust API (`api_rs/`) is a basic Axum server with example endpoints, not integrated with the video streaming functionality.

### Dependencies

- **FFmpeg Required**: The API requires FFmpeg and FFprobe installed on the system
- **Node.js**: API uses ES modules (`"type": "module"`)
- **pnpm**: Project uses pnpm for package management
- **Rust**: Required for both Tauri and the experimental Rust API

### Port Configuration

- 3005: Node.js API WebSocket server
- 3006: Vite dev server (frontend)
- 5000: Rust API (if running separately)
- 554: RTSP camera port (standard)

### Known Issues

- Camera credentials are hardcoded in `api/index.js`
- No error recovery for RTSP disconnections
- No configuration UI for camera settings
- FFmpeg processes may not be properly cleaned up on crashes
- The README describes a different (Go) implementation

## Adding New Features

### Adding New UI Components

The project uses shadcn/ui. To add new components:

```bash
cd view
npx shadcn@latest add [component-name]
```

Components will be added to `view/src/components/ui/`.

### Modifying Video Streaming

Key files to modify:
- `api/index.js`: FFmpeg configuration, frame processing
- `view/src/components/RTSPViewer.tsx`: WebSocket handling, UI controls

### Camera Configuration

To support dynamic camera configuration:
1. Add configuration form in RTSPViewer
2. Send camera config via WebSocket message
3. Update `startRTSPStream()` in API to use dynamic RTSP URLs
4. Consider adding camera config persistence (local storage or Tauri's file system API)
