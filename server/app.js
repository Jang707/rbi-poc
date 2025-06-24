const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Docker = require('dockerode');
const sessionManager = require('./session-manager');
const webrtcServer = require('./webrtc-server');
const fs = require('fs');
const { execSync } = require('child_process');
const { Network } = require('inspector/promises');

// Express 앱 초기화
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Docker 클라이언트 초기화
const docker = new Docker();

// 개발 모드 확인
const isDev = process.env.NODE_ENV !== 'production';
const clientBuildPath = path.join(__dirname, '../client/build');
const clientPublicPath = path.join(__dirname, '../client/public');

// FFmpeg 설치 확인
try {
  const ffmpegVersion = execSync('ffmpeg -version').toString().split('\n')[0];
  console.log('FFmpeg 설치 확인됨:', ffmpegVersion);
} catch (error) {
  console.error('경고: FFmpeg가 설치되지 않았거나 PATH에 등록되지 않았습니다.');
  console.error('원격 브라우저 스트리밍을 위해 FFmpeg 설치가 필요합니다.');
}

// 정적 파일 제공 (클라이언트 측 코드)
// 프로덕션 환경이거나 빌드 폴더가 존재하면 빌드된 파일 사용
if (!isDev && fs.existsSync(clientBuildPath)) {
  console.log('Serving static files from build directory');
  app.use(express.static(clientBuildPath));
} else {
  console.log('Running in development mode - API only');
  // 개발 환경에서는 API만 제공 (React 앱은 자체 서버에서 실행)
}

// API 라우트
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 새 세션 생성 API
app.post('/api/sessions', async (req, res) => {
  try {
    const sessionId = uuidv4();
    const containerName = `rbi-browser-${sessionId}`;
    
    console.log(`Creating new session ${sessionId} with container ${containerName}`);
    
    // Check if image exists
    const images = await docker.listImages();
    const imageExists = images.some(img => 
      img.RepoTags && img.RepoTags.includes('pixelpush-rbi:latest'));
    
    if (!imageExists) {
      console.error('Image pixelpush-rbi:latest not found');
      return res.status(500).json({ 
        error: 'Docker image not found. Please build the pixelpush-rbi:latest image first.'
      });
    }
      console.log('Docker 이미지 확인 완료, 컨테이너 생성 시도중...');
      
    // Docker 컨테이너 생성 및 실행
    try {
      // Windows 환경인지 확인
      const isWindows = process.platform === 'win32';
      
      // 포트 바인딩 설정
      const containerOptions = {
        Image: 'pixelpush-rbi:latest',
        name: containerName,
        ExposedPorts: {
          '9222/tcp': {}
        },
        HostConfig: {
          PortBindings: {
            '9222/tcp': [{ HostPort: '9222' }]
          },
          PublishAllPorts: true,
          NetworkMode: 'bridge' // 브리지 네트워크 모드 사용
                }
      };
      
      // 컨테이너 생성
      const container = await docker.createContainer(containerOptions);
      
      console.log(`컨테이너 생성 성공: ${container.id}`);
      
      try {
        await container.start();
        console.log(`컨테이너 시작 성공: ${container.id}`);
      } catch (startError) {
        console.error('컨테이너 시작 실패:', startError);
        return res.status(500).json({ error: '컨테이너 시작 실패', details: startError.message });
      }
        // 컨테이너 정보 가져오기
      const containerInfo = await container.inspect();
      
      // Add detailed debugging
      console.log('Container info received:');
      console.log('NetworkSettings available:', !!containerInfo.NetworkSettings);
      if (containerInfo.NetworkSettings) {
        console.log('Ports available:', !!containerInfo.NetworkSettings.Ports);
        if (containerInfo.NetworkSettings.Ports) {
          console.log('Port 9222/tcp mappings:', JSON.stringify(containerInfo.NetworkSettings.Ports['9222/tcp']));
        }
      }
      
      // 추가 디버그용 - 네트워크 설정 덤프
      console.log('Alternate container data:', containerInfo.NetworkSettings?.Networks || {});
      
      // 포트 매핑 확인 및 오류 처리 개선
      let containerPort = '9222';
      let hostPort = '9222';
      
      // 포트 매핑이 있는지 확인
      if (!containerInfo.NetworkSettings?.Ports?.['9222/tcp']) {
        console.warn('경고: 포트 매핑 정보를 찾을 수 없습니다. 기본값인 9222 사용');
      } else {
        hostPort = containerInfo.NetworkSettings.Ports['9222/tcp'][0]?.HostPort || '9222';
        console.log(`포트 매핑 성공: 컨테이너 포트 ${containerPort} -> 호스트 포트 ${hostPort}`);
      }
      
      // Store session with resolved host port
      sessionManager.createSession({
        id: sessionId,
        containerId: container.id,
        containerName,
        port: hostPort,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 10000)
      });
      
      // 세션 정보 반환
      res.status(201).json({
        sessionId,
        url: `/session/${sessionId}`,
        expiresAt: new Date(Date.now() + 5 * 60 * 10000)
      });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ error: 'Failed to create session', details: error.message });
    }
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session', details: error.message });
  }
});

// 세션 정보 조회 API
app.get('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessionManager.getSession(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json(session);
});

// Docker 컨테이너 실행 확인 및 디버깅
app.get('/api/docker/check', async (req, res) => {
  try {
    const containers = await docker.listContainers({all: true});
    
    // 실행 중인 컨테이너 정보 가져오기
    const runningContainers = containers.filter(c => c.State === 'running' && c.Names.some(name => name.includes('rbi-browser')));
    
    if (runningContainers.length === 0) {
      return res.json({ status: 'No running RBI browser containers found' });
    }
    
    // 상세 정보 가져오기
    const containerDetails = await Promise.all(
      runningContainers.map(async c => {
        const container = docker.getContainer(c.Id);
        const info = await container.inspect();
        return {
          id: c.Id,
          name: c.Names[0],
          status: c.State,
          ports: info.NetworkSettings?.Ports || {},
          networks: info.NetworkSettings?.Networks || {},
          created: c.Created,
          command: c.Command
        };
      })
    );
    
    res.json({
      count: runningContainers.length,
      containers: containerDetails
    });
    
  } catch (error) {
    console.error('Error checking docker:', error);
    res.status(500).json({ error: error.message });
  }
});

// 클라이언트 앱 서빙 (React SPA를 위한 설정)
app.get('*', (req, res, next) => {
  // API 경로는 Pass-through
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  const indexPath = path.join(__dirname, '../client/build/index.html');
  
  // 프로덕션 환경이거나 빌드 폴더가 존재하면 SPA 제공
  if (!isDev && fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // 개발 환경에서는 API 요청이 아닌 경우 프론트엔드 서버 주소로 리다이렉트
    res.send(`
      <html>
        <head>
          <title>PixelPush RBI - Development Mode</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #2563eb; }
            code { background: #f1f5f9; padding: 2px 4px; border-radius: 4px; }
            .highlight { background: #fef9c3; padding: 1rem; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>PixelPush RBI API Server</h1>
          <p>The server is running in development mode.</p>
          
          <div class="highlight">
            <h2>Development Setup Instructions:</h2>
            <p>You need to run both the API server and React dev server separately:</p>
            <ol>
              <li>Keep this API server running (<code>npm run server</code>)</li>
              <li>Open another terminal and run the React dev server: <code>cd client && npm start</code></li>
              <li>Access the application at <a href="http://localhost:5173">http://localhost:5173</a></li>
            </ol>
          </div>
          
          <p>For production, build the client first: <code>npm run build:client</code></p>
          
          <h2>API Status</h2>
          <p>API server is running at <a href="/api/health">/api/health</a></p>
        </body>
      </html>
    `);
  }
});

// Socket.IO 이벤트 핸들링
io.on('connection', (socket) => {
  console.log('New client connected', socket.id);
  
  // 세션 연결
  socket.on('join-session', (sessionId) => {
    console.log(`Client ${socket.id} joining session ${sessionId}`);
    const session = sessionManager.getSession(sessionId);
    
    if (!session) {
      socket.emit('error', { message: 'Invalid session' });
      return;
    }
    
    // 소켓을 세션 룸에 추가
    socket.join(`session-${sessionId}`);
    socket.sessionId = sessionId;
    
    // 세션 정보 전송
    socket.emit('session-joined', {
      sessionId,
      containerId: session.containerId
    });
  });
  
  // WebRTC 시그널링
  socket.on('webrtc-signal', (data) => {
    if (!socket.sessionId) {
      socket.emit('error', { message: 'Not connected to a session' });
      return;
    }
    
    console.log(`WebRTC signal from ${socket.id} for session ${socket.sessionId}`);
    webrtcServer.handleSignal(socket, data);
  });
  
  // 사용자 입력 이벤트
  socket.on('input-event', (data) => {
    if (!socket.sessionId) {
      socket.emit('error', { message: 'Not connected to a session' });
      return;
    }
    
    const session = sessionManager.getSession(socket.sessionId);
    if (!session) {
      socket.emit('error', { message: 'Invalid session' });
      return;
    }
    
    // 사용자 입력을 Docker 컨테이너에 전달
    console.log(`Input event from ${socket.id} for session ${socket.sessionId}`);
    webrtcServer.sendInputToContainer(session, data);
  });
  
  // 연결 종료
  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });
});

// 만료된 세션 정리 (주기적으로 실행)
setInterval(() => {
  console.log('Cleaning expired sessions...');
  sessionManager.cleanExpiredSessions();
}, 60 * 1000); // 1분마다 실행

// 서버 시작
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// 종료 시 리소스 정리
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  
  // 모든 세션 종료
  await sessionManager.terminateAllSessions();
  
  process.exit(0);
});
