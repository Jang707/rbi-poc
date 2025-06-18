import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import io from 'socket.io-client';

const SessionContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
  margin-top: 1rem;
`;

const BrowserControls = styled.div`
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background-color: white;
  border: 1px solid var(--border-color);
  border-bottom: none;
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
`;

const ControlButton = styled.button`
  background-color: transparent;
  padding: 0.5rem;
  color: var(--text-color);
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: var(--border-color);
  }
`;

const AddressBar = styled.input`
  flex: 1;
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.9rem;
  
  &:focus {
    outline: 2px solid var(--secondary-color);
    border-color: transparent;
  }
`;

const BrowserViewport = styled.div`
  flex: 1;
  position: relative;
  border: 1px solid var(--border-color);
  background-color: white;
  overflow: hidden;
  
  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background-color: #f0f0f0;
  }
`;

const StatusBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: white;
  border: 1px solid var(--border-color);
  border-top: none;
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
  font-size: 0.8rem;
  color: var(--light-text-color);
`;

const SessionTimer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
`;

const SpinnerCircle = styled.div`
  width: 3rem;
  height: 3rem;
  border: 4px solid rgba(37, 99, 235, 0.1);
  border-left-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const BrowserSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  const [connected, setConnected] = useState(false);
  
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  
  // 세션 초기화 및 WebRTC 연결 설정
  useEffect(() => {
    let timerInterval;
    let sessionCheckInterval;
    
    const initSession = async () => {
      try {
        // 세션 정보 가져오기
        const response = await axios.get(`/api/sessions/${sessionId}`);
        setCurrentUrl('http://example.com'); // 초기 URL
        
        // 세션 만료 시간 설정
        const expiresAt = new Date(response.data.expiresAt).getTime();
        const remainingTime = Math.floor((expiresAt - Date.now()) / 1000);
        setTimeRemaining(remainingTime > 0 ? remainingTime : 0);
        
        // 타이머 설정
        timerInterval = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev <= 1) {
              clearInterval(timerInterval);
              alert('Session has expired');
              navigate('/');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // 연결 설정
        setupConnection();
        
        // 주기적으로 세션 상태 확인
        sessionCheckInterval = setInterval(async () => {
          try {
            await axios.get(`/api/sessions/${sessionId}`);
          } catch (error) {
            // 세션이 없거나 만료된 경우
            clearInterval(sessionCheckInterval);
            alert('Session is no longer available');
            navigate('/');
          }
        }, 30000); // 30초마다 체크
      } catch (error) {
        console.error('Error initializing session:', error);
        alert('Failed to initialize session');
        navigate('/');
      }
    };
    
    initSession();
    
    return () => {
      // 정리
      if (timerInterval) clearInterval(timerInterval);
      if (sessionCheckInterval) clearInterval(sessionCheckInterval);
      if (socketRef.current) socketRef.current.disconnect();
      if (peerConnectionRef.current) peerConnectionRef.current.close();
    };
  }, [sessionId, navigate]);
  
  // WebRTC 연결 설정
  const setupConnection = () => {
    // Socket.IO 연결
    socketRef.current = io();
    
    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      
      // 세션 참여
      socketRef.current.emit('join-session', sessionId);
    });
    
    socketRef.current.on('session-joined', (data) => {
      console.log('Joined session:', data);
      
      // WebRTC 연결 설정
      setupWebRTC();
    });
    
    socketRef.current.on('error', (error) => {
      console.error('Socket error:', error);
      alert(`Error: ${error.message}`);
    });
    
    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });
  };
  
  // WebRTC 연결 설정
  const setupWebRTC = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };
    
    // RTCPeerConnection 생성
    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;
    
    // 미디어 스트림 처리
    pc.ontrack = (event) => {
      console.log('Received remote track');
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
        setLoading(false);
        setConnected(true);
      }
    };
    
    // ICE 후보 이벤트
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('webrtc-signal', {
          candidate: event.candidate
        });
      }
    };
    
    // 연결 상태 변경 처리
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      
      if (pc.iceConnectionState === 'disconnected' || 
          pc.iceConnectionState === 'failed' ||
          pc.iceConnectionState === 'closed') {
        setConnected(false);
      }
    };
    
    // 데이터 채널 생성 (선택 사항)
    pc.createDataChannel('input');
    
    // 오퍼 생성 및 전송
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        socketRef.current.emit('webrtc-signal', {
          offer: pc.localDescription
        });
      })
      .catch(error => {
        console.error('Error creating offer:', error);
      });
    
    // 시그널링 이벤트 처리
    socketRef.current.on('webrtc-answer', (data) => {
      console.log('Received answer');
      pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    });
    
    socketRef.current.on('webrtc-ice', (data) => {
      console.log('Received ICE candidate');
      pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    });
  };
  
  // 사용자 입력 이벤트 전송
  const sendInputEvent = (event) => {
    if (!socketRef.current || !connected) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / rect.width * 1920);
    const y = Math.floor((event.clientY - rect.top) / rect.height * 1080);
    
    switch (event.type) {
      case 'mousemove':
        socketRef.current.emit('input-event', {
          type: 'mousemove',
          x,
          y
        });
        break;
        
      case 'mousedown':
        socketRef.current.emit('input-event', {
          type: 'mousedown',
          x,
          y,
          button: event.button + 1 // WebSocket은 1-기반, DOM은 0-기반
        });
        break;
        
      case 'mouseup':
        socketRef.current.emit('input-event', {
          type: 'mouseup',
          x,
          y,
          button: event.button + 1
        });
        break;
        
      default:
        break;
    }
  };
  
  // 키보드 입력 이벤트 전송
  const handleKeyEvent = (event) => {
    if (!socketRef.current || !connected) return;
    
    // 브라우저에서 중재하는 키 조합 방지
    if (event.ctrlKey || event.altKey || event.metaKey) {
      event.preventDefault();
    }
    
    // XDoTool로 전송할 키 매핑
    let key = event.key;
    
    // 특수 키 처리 (XDoTool 형식으로 변환)
    if (key === 'ArrowLeft') key = 'Left';
    else if (key === 'ArrowRight') key = 'Right';
    else if (key === 'ArrowUp') key = 'Up';
    else if (key === 'ArrowDown') key = 'Down';
    else if (key === ' ') key = 'space';
    else if (key === 'Escape') key = 'Escape';
    else if (key === 'Backspace') key = 'BackSpace';
    else if (key === 'Delete') key = 'Delete';
    else if (key === 'Enter') key = 'Return';
    else if (key === 'Tab') key = 'Tab';
    
    socketRef.current.emit('input-event', {
      type: event.type === 'keydown' ? 'keydown' : 'keyup',
      key
    });
    
    // 단일 문자 입력의 경우 type 이벤트 전송
    if (event.type === 'keypress' && key.length === 1) {
      socketRef.current.emit('input-event', {
        type: 'type',
        text: key
      });
    }
  };
  
  // 주소 입력 핸들러
  const handleAddressSubmit = (e) => {
    e.preventDefault();
    
    if (!currentUrl) return;
    
    // URL 형식 확인 및 수정
    let url = currentUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    
    // 입력된 URL로 이동 명령 전송
    if (socketRef.current && connected) {
      socketRef.current.emit('input-event', {
        type: 'navigate',
        url
      });
    }
  };
  
  // 시간 포맷 변환 (초 -> MM:SS)
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <SessionContainer>
      <BrowserControls>
        <ControlButton onClick={() => console.log('Back button clicked')}>
          ←
        </ControlButton>
        <ControlButton onClick={() => console.log('Forward button clicked')}>
          →
        </ControlButton>
        <ControlButton onClick={() => console.log('Refresh button clicked')}>
          ↻
        </ControlButton>
        <form onSubmit={handleAddressSubmit} style={{ flex: 1 }}>
          <AddressBar
            type="text"
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            placeholder="Enter URL"
          />
        </form>
      </BrowserControls>
      
      <BrowserViewport
        onMouseMove={sendInputEvent}
        onMouseDown={sendInputEvent}
        onMouseUp={sendInputEvent}
        onClick={sendInputEvent}
        onKeyDown={handleKeyEvent}
        onKeyUp={handleKeyEvent}
        onKeyPress={handleKeyEvent}
        tabIndex="0"
      >
        <video ref={videoRef} autoPlay playsInline />
        
        {loading && (
          <LoadingOverlay>
            <SpinnerCircle />
            <p>Starting secure browser session...</p>
          </LoadingOverlay>
        )}
      </BrowserViewport>
      
      <StatusBar>
        <div>
          {connected ? (
            <span style={{ color: 'green' }}>● Connected</span>
          ) : (
            <span style={{ color: 'red' }}>● Disconnected</span>
          )}
        </div>
        <SessionTimer>
          <span>Session expires in:</span>
          <strong>{formatTime(timeRemaining)}</strong>
        </SessionTimer>
      </StatusBar>
    </SessionContainer>
  );
};

export default BrowserSession;
