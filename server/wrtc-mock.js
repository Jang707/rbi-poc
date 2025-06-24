/**
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
