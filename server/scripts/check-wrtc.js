/**
 * 이 스크립트는 wrtc 패키지 설치 가능 여부를 확인합니다.
 * Windows에서 문제가 발생할 경우 메시지를 표시합니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Checking WebRTC compatibility...');

// wrtc 패키지 설치 시도
try {
  // Windows 운영체제 확인
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    console.log('Windows 환경을 감지했습니다.');
    console.log('wrtc 패키지 대신 브라우저 기반 WebRTC를 사용하도록 설정합니다.');
    
    // webrtc-adapter 패키지 설치 (브라우저 호환성을 위한 패키지)
    try {
      console.log('webrtc-adapter 패키지를 설치합니다...');
      execSync('npm install webrtc-adapter --save', { stdio: 'inherit' });
    } catch (err) {
      console.warn('webrtc-adapter 패키지 설치 중 문제가 발생했습니다:', err.message);
    }
    
    // wrtc-mock.js 파일 생성
    const wrtcMockPath = path.join(__dirname, '..', 'wrtc-mock.js');
    const wrtcMockContent = `/**
 * wrtc 패키지 대체를 위한 모의 구현
 * Windows에서 네이티브 WebRTC 지원이 없을 때 사용
 */
console.log('Using browser-compatible WebRTC implementation');

// 필요한 최소한의 인터페이스 제공
module.exports = {
  RTCPeerConnection: global.RTCPeerConnection || function() {
    console.warn('RTCPeerConnection is not fully supported in this environment');
    return {
      close: () => {},
      addTrack: () => {},
      createOffer: () => Promise.resolve({}),
      createAnswer: () => Promise.resolve({}),
      setLocalDescription: () => Promise.resolve(),
      setRemoteDescription: () => Promise.resolve(),
      addIceCandidate: () => Promise.resolve()
    };
  },
  RTCSessionDescription: global.RTCSessionDescription || function() {},
  RTCIceCandidate: global.RTCIceCandidate || function() {},
  MediaStream: global.MediaStream || function() {
    return {
      addTrack: () => {}
    };
  },
  // 모의 구현을 위한 확장
  nonstandard: {
    RTCVideoSource: function() {
      return {
        createTrack: function() {
          return {
            kind: 'video'
          };
        },
        onFrame: () => {}
      };
    }
  }
};
`;

    fs.writeFileSync(wrtcMockPath, wrtcMockContent);
    console.log(`모의 WebRTC 구현이 생성되었습니다: ${wrtcMockPath}`);
    
    console.log('Windows 환경에서 wrtc 패키지를 사용할 수 없습니다.');
    console.log('브라우저에서만 WebRTC 기능이 제한적으로 작동할 수 있습니다.');
  } else {
    // 리눅스/맥에서는 wrtc 패키지 설치 시도
    try {
      console.log('wrtc 패키지를 설치합니다...');
      execSync('npm install wrtc --save', { stdio: 'inherit' });
      console.log('wrtc 패키지가 성공적으로 설치되었습니다.');
    } catch (err) {
      console.warn('wrtc 패키지 설치 중 문제가 발생했습니다:', err.message);
      console.warn('일부 WebRTC 기능이 제한될 수 있습니다.');
    }
  }
} catch (err) {
  console.error('WebRTC 호환성 검사 중 오류가 발생했습니다:', err);
}
