const Docker = require('dockerode');

// Docker 클라이언트 초기화
const docker = new Docker();

// 활성 세션을 저장할 객체
const activeSessions = {};

/**
 * 새 세션 생성
 * @param {Object} sessionData 세션 데이터
 */
function createSession(sessionData) {
  activeSessions[sessionData.id] = {
    ...sessionData,
    active: true
  };
  
  console.log(`Session created: ${sessionData.id}, expires: ${sessionData.expiresAt}`);
  
  // 세션 만료 시간 설정 (자동 정리를 위해)
  const expirationTime = new Date(sessionData.expiresAt).getTime() - Date.now();
  setTimeout(() => {
    terminateSession(sessionData.id);
  }, expirationTime);
  
  return activeSessions[sessionData.id];
}

/**
 * 세션 정보 조회
 * @param {string} sessionId 세션 ID
 * @returns {Object|null} 세션 정보 또는 없을 경우 null
 */
function getSession(sessionId) {
  return activeSessions[sessionId] || null;
}

/**
 * 세션 갱신 (만료 시간 연장)
 * @param {string} sessionId 세션 ID
 * @param {number} extensionMinutes 연장할 시간 (분)
 */
function extendSession(sessionId, extensionMinutes = 5) {
  const session = activeSessions[sessionId];
  if (!session) return null;
  
  const newExpiresAt = new Date(Date.now() + extensionMinutes * 60 * 1000);
  session.expiresAt = newExpiresAt;
  
  console.log(`Session extended: ${sessionId}, new expiry: ${newExpiresAt}`);
  
  return session;
}

/**
 * 세션 종료
 * @param {string} sessionId 종료할 세션 ID
 */
async function terminateSession(sessionId) {
  const session = activeSessions[sessionId];
  if (!session) return;
  
  try {
    console.log(`Terminating session: ${sessionId}`);
    
    // Docker 컨테이너 중지 및 제거
    const container = docker.getContainer(session.containerId);
    await container.stop();
    await container.remove();
    
    console.log(`Container removed: ${session.containerName}`);
    
    // 세션 정보 삭제
    delete activeSessions[sessionId];
  } catch (error) {
    console.error(`Error terminating session ${sessionId}:`, error);
  }
}

/**
 * 만료된 세션 정리
 */
function cleanExpiredSessions() {
  const now = Date.now();
  
  Object.keys(activeSessions).forEach(sessionId => {
    const session = activeSessions[sessionId];
    const expiresAt = new Date(session.expiresAt).getTime();
    
    if (expiresAt <= now) {
      console.log(`Session expired: ${sessionId}`);
      terminateSession(sessionId);
    }
  });
}

/**
 * 모든 세션 종료 (서버 종료 시 호출)
 */
async function terminateAllSessions() {
  const sessionIds = Object.keys(activeSessions);
  console.log(`Terminating all sessions (${sessionIds.length})...`);
  
  const promises = sessionIds.map(terminateSession);
  await Promise.all(promises);
  
  console.log('All sessions terminated');
}

module.exports = {
  createSession,
  getSession,
  extendSession,
  terminateSession,
  cleanExpiredSessions,
  terminateAllSessions
};
