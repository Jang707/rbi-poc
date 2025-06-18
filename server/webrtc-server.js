const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Windows 호환성을 위한 wrtc 패키지 로드 방식 수정
let wrtc;
try {
  // wrtc-mock.js 파일이 있는지 확인
  const mockPath = path.join(__dirname, 'wrtc-mock.js');
  if (fs.existsSync(mockPath) && process.platform === 'win32') {
    console.log('Using WebRTC mock implementation for Windows');
    wrtc = require('./wrtc-mock');
  } else {
    wrtc = require('wrtc');
  }
} catch (err) {
  console.warn('Failed to load wrtc package:', err.message);
  console.warn('Using mock implementation');
  
  // 간단한 모의 구현
  wrtc = {
    RTCPeerConnection: function() { 
      return {
        onicecandidate: null,
        oniceconnectionstatechange: null,
        onconnectionstatechange: null,
        addTrack: () => {},
        setRemoteDescription: () => Promise.resolve(),
        createAnswer: () => Promise.resolve({}),
        setLocalDescription: () => Promise.resolve(),
        addIceCandidate: () => Promise.resolve(),
        close: () => {}
      };
    },
    RTCSessionDescription: function() {},
    RTCIceCandidate: function() {},
    MediaStream: function() { 
      return { addTrack: () => {} };
    },
    nonstandard: {
      RTCVideoSource: function() {
        return {
          createTrack: () => ({ kind: 'video' }),
          onFrame: () => {}
        };
      }
    }
  };
}

// WebRTC 연결을 관리할 객체
const peerConnections = {};

/**
 * 새 WebRTC 피어 연결 생성
 * @param {string} sessionId 세션 ID
 * @returns {RTCPeerConnection} WebRTC 피어 연결 객체
 */
function createPeerConnection(sessionId) {
  console.log(`Creating new RTCPeerConnection for session ${sessionId}`);
  
  const pc = new wrtc.RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  });
  
  // ICE 후보 생성 이벤트 핸들러
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      // ICE 후보를 클라이언트에 전달
      const socket = peerConnections[sessionId]?.socket;
      if (socket) {
        socket.emit('webrtc-ice', {
          candidate: event.candidate
        });
      }
    }
  };
  
  // ICE 연결 상태 변경 이벤트 핸들러
  pc.oniceconnectionstatechange = () => {
    console.log(`ICE connection state for session ${sessionId}: ${pc.iceConnectionState}`);
  };
  
  return pc;
}

/**
 * WebRTC 시그널링 처리
 * @param {Socket} socket Socket.IO 소켓 객체
 * @param {Object} data 시그널링 데이터
 */
function handleSignal(socket, data) {
  const sessionId = socket.sessionId;
  
  if (!sessionId) {
    socket.emit('error', { message: 'Not connected to a session' });
    return;
  }
  
  // 기존 피어 연결 가져오거나 새로 생성
  let pc = peerConnections[sessionId]?.pc;
  
  if (!pc) {
    pc = createPeerConnection(sessionId);
    peerConnections[sessionId] = { pc, socket };
    
    // 브라우저 화면 스트림 설정
    setupBrowserStream(sessionId, pc);
  }
  
  // 시그널 타입에 따라 처리
  if (data.offer) {
    console.log(`Processing offer for session ${sessionId}`);
    
    pc.setRemoteDescription(new wrtc.RTCSessionDescription(data.offer))
      .then(() => pc.createAnswer())
      .then(answer => pc.setLocalDescription(answer))
      .then(() => {
        socket.emit('webrtc-answer', {
          answer: pc.localDescription
        });
      })
      .catch(err => {
        console.error(`Error processing offer for session ${sessionId}:`, err);
        socket.emit('error', { message: 'Failed to process WebRTC offer' });
      });
  } else if (data.answer) {
    console.log(`Processing answer for session ${sessionId}`);
    
    pc.setRemoteDescription(new wrtc.RTCSessionDescription(data.answer))
      .catch(err => {
        console.error(`Error processing answer for session ${sessionId}:`, err);
        socket.emit('error', { message: 'Failed to process WebRTC answer' });
      });
  } else if (data.candidate) {
    console.log(`Processing ICE candidate for session ${sessionId}`);
    
    pc.addIceCandidate(new wrtc.RTCIceCandidate(data.candidate))
      .catch(err => {
        console.error(`Error processing ICE candidate for session ${sessionId}:`, err);
        socket.emit('error', { message: 'Failed to process ICE candidate' });
      });
  }
}

/**
 * 브라우저 화면 스트림 설정
 * @param {string} sessionId 세션 ID
 * @param {RTCPeerConnection} pc WebRTC 피어 연결 객체
 */
function setupBrowserStream(sessionId, pc) {
  const session = require('./session-manager').getSession(sessionId);
  if (!session) {
    console.error(`Session ${sessionId} not found`);
    return;
  }
  
  console.log(`Setting up browser stream for session ${sessionId}`);
  
  // FFmpeg를 사용하여 Xvfb 화면을 스트리밍
  const ffmpeg = spawn('ffmpeg', [
    '-f', 'x11grab',
    '-video_size', '1920x1080',
    '-framerate', '15',
    '-i', `:99.0`,
    '-c:v', 'libvpx',
    '-b:v', '1M',
    '-deadline', 'realtime',
    '-cpu-used', '4',
    '-pix_fmt', 'yuv420p',
    '-f', 'webm',
    'pipe:1'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  
  // 오류 처리
  ffmpeg.stderr.on('data', (data) => {
    console.log(`FFmpeg stderr: ${data.toString()}`);
  });
  
  // 미디어 소스 생성
  const videoStream = new wrtc.MediaStream();
  const videoTrack = new wrtc.nonstandard.RTCVideoSource();
  
  const track = videoTrack.createTrack();
  videoStream.addTrack(track);
  
  // 스트림 추가
  pc.addTrack(track, videoStream);
  
  // FFmpeg 출력 처리
  ffmpeg.stdout.on('data', (chunk) => {
    videoTrack.onFrame({
      data: new Uint8Array(chunk),
      width: 1920,
      height: 1080
    });
  });
  
  // 연결 종료 시 정리
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      console.log(`Connection for session ${sessionId} ended`);
      ffmpeg.kill();
      delete peerConnections[sessionId];
    }
  };
}

/**
 * 사용자 입력을 Docker 컨테이너에 전송
 * @param {Object} session 세션 정보
 * @param {Object} inputEvent 입력 이벤트 데이터
 */
function sendInputToContainer(session, inputEvent) {
  const containerId = session.containerId;
  
  // 입력 타입에 따라 다르게 처리
  switch (inputEvent.type) {
    case 'mousemove':
      executeContainerCommand(containerId, 
        `xdotool mousemove ${inputEvent.x} ${inputEvent.y}`);
      break;
      
    case 'mousedown':
      executeContainerCommand(containerId, 
        `xdotool mousedown ${inputEvent.button}`);
      break;
      
    case 'mouseup':
      executeContainerCommand(containerId, 
        `xdotool mouseup ${inputEvent.button}`);
      break;
      
    case 'click':
      executeContainerCommand(containerId, 
        `xdotool click ${inputEvent.button}`);
      break;
      
    case 'keydown':
      if (inputEvent.key) {
        executeContainerCommand(containerId, 
          `xdotool keydown ${inputEvent.key}`);
      }
      break;
      
    case 'keyup':
      if (inputEvent.key) {
        executeContainerCommand(containerId, 
          `xdotool keyup ${inputEvent.key}`);
      }
      break;
      
    case 'type':
      if (inputEvent.text) {
        executeContainerCommand(containerId, 
          `xdotool type "${inputEvent.text}"`);
      }
      break;
  }
}

/**
 * Docker 컨테이너 내에서 명령어 실행
 * @param {string} containerId 컨테이너 ID
 * @param {string} command 실행할 명령어
 */
function executeContainerCommand(containerId, command) {
  const { exec } = require('child_process');
  
  // Docker exec를 사용하여 컨테이너 내에서 명령어 실행
  exec(`docker exec ${containerId} bash -c "${command}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing command in container ${containerId}:`, error);
      return;
    }
    
    if (stderr) {
      console.error(`Command stderr:`, stderr);
    }
  });
}

module.exports = {
  handleSignal,
  sendInputToContainer
};
