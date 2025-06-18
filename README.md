# PixelPush RBI (Remote Browser Isolation)

A Proof of Concept implementation of a Pixel Push Remote Browser Isolation solution.

## What is RBI?

Remote Browser Isolation (RBI) is a security technology that physically separates browsing activity from the local device, executing it in a remote container instead. In the Pixel Push approach, only the visual representation (pixels) of the browser is transmitted to the user, protecting them from web-based threats.

## Features

- Secure browsing within isolated Docker containers
- WebRTC-based pixel streaming for low-latency experience
- Full browser interaction support (mouse, keyboard)
- Session-based isolation with automatic cleanup

## Architecture

- **Server**: Node.js + Express backend
- **Client**: React-based web interface
- **Container**: Rocky Linux with Chromium in headless mode
- **Streaming**: WebRTC for real-time video streaming
- **Input**: WebSockets for user input transmission

## Project Structure

```
rbi-poc/
├── docker/
│   ├── Dockerfile
│   └── start-browser.sh
├── server/
│   ├── app.js
│   ├── session-manager.js
│   └── webrtc-server.js
└── client/
    ├── public/
    └── src/
        ├── components/
        └── App.js
```

## Getting Started

### Prerequisites

- Docker
- Node.js (v16+)
- npm or yarn

### Setup

1. Build the Docker image:

```bash
cd docker
docker build -t pixelpush-rbi .
```

2. Install server dependencies:

```bash
cd server
npm install
```

3. Install client dependencies:

```bash
cd client
npm install
```

4. Start the development server:

```bash
# In the server directory
npm run dev

# In a separate terminal, in the client directory
npm start
```

5. Access the application at http://localhost:3000

## Development Status

This is a Proof of Concept implementation with basic features for demonstration purposes.

## License

MIT
