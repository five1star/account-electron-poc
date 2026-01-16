const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * 바탕화면 경로를 가져옵니다
 */
function getDesktopPath() {
  const homeDir = os.homedir();
  const platform = os.platform();
  
  if (platform === 'win32') {
    // Windows: USERPROFILE\Desktop 또는 한글 사용자명일 경우 Desktop 폴더명이 다를 수 있음
    const desktopPath = path.join(homeDir, 'Desktop');
    if (fs.existsSync(desktopPath)) {
      return desktopPath;
    }
    // 대체 경로 시도
    const altDesktopPath = path.join(homeDir, '바탕 화면');
    if (fs.existsSync(altDesktopPath)) {
      return altDesktopPath;
    }
    return desktopPath; // 존재하지 않아도 경로 반환
  } else if (platform === 'darwin') {
    // macOS: ~/Desktop
    return path.join(homeDir, 'Desktop');
  } else {
    // Linux 및 기타
    return path.join(homeDir, 'Desktop');
  }
}

/**
 * 에러를 로그 파일에 저장합니다
 */
function logError(error, context = '') {
  try {
    const desktopPath = getDesktopPath();
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const logFileName = `원주순복음중앙교회_재정관리_에러로그_${timestamp}.txt`;
    const logFilePath = path.join(desktopPath, logFileName);
    
    const errorInfo = {
      timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      context: context || 'Unknown',
      message: error?.message || String(error),
      stack: error?.stack || 'No stack trace available',
      name: error?.name || 'Error',
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
    };
    
    let logContent = '='.repeat(80) + '\n';
    logContent += '원주순복음중앙교회 재정관리 - 에러 로그\n';
    logContent += '='.repeat(80) + '\n\n';
    logContent += `발생 시간: ${errorInfo.timestamp}\n`;
    logContent += `컨텍스트: ${errorInfo.context}\n`;
    logContent += `플랫폼: ${errorInfo.platform} (${errorInfo.arch})\n`;
    logContent += `Node.js 버전: ${errorInfo.nodeVersion}\n`;
    logContent += `Electron 버전: ${errorInfo.electronVersion}\n`;
    logContent += `Chrome 버전: ${errorInfo.chromeVersion}\n`;
    logContent += '\n' + '-'.repeat(80) + '\n';
    logContent += '에러 정보:\n';
    logContent += '-'.repeat(80) + '\n';
    logContent += `에러 이름: ${errorInfo.name}\n`;
    logContent += `에러 메시지: ${errorInfo.message}\n\n`;
    logContent += '스택 트레이스:\n';
    logContent += errorInfo.stack + '\n';
    logContent += '\n' + '='.repeat(80) + '\n';
    
    // 파일에 쓰기 (동기 방식으로 확실히 저장)
    fs.writeFileSync(logFilePath, logContent, 'utf8');
    
    console.error('에러 로그가 저장되었습니다:', logFilePath);
    return logFilePath;
  } catch (logError) {
    console.error('에러 로그 저장 실패:', logError);
    // 로그 저장 실패 시에도 콘솔에 출력
    console.error('원본 에러:', error);
  }
}

/**
 * 여러 에러를 하나의 로그 파일에 추가합니다
 */
function appendError(error, context = '') {
  try {
    const desktopPath = getDesktopPath();
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logFileName = `원주순복음중앙교회_재정관리_에러로그_${timestamp}.txt`;
    const logFilePath = path.join(desktopPath, logFileName);
    
    const errorInfo = {
      timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      context: context || 'Unknown',
      message: error?.message || String(error),
      stack: error?.stack || 'No stack trace available',
      name: error?.name || 'Error',
    };
    
    let logContent = '\n' + '='.repeat(80) + '\n';
    logContent += `발생 시간: ${errorInfo.timestamp}\n`;
    logContent += `컨텍스트: ${errorInfo.context}\n`;
    logContent += '\n' + '-'.repeat(80) + '\n';
    logContent += '에러 정보:\n';
    logContent += '-'.repeat(80) + '\n';
    logContent += `에러 이름: ${errorInfo.name}\n`;
    logContent += `에러 메시지: ${errorInfo.message}\n\n`;
    logContent += '스택 트레이스:\n';
    logContent += errorInfo.stack + '\n';
    logContent += '='.repeat(80) + '\n';
    
    // 파일이 존재하면 추가, 없으면 새로 생성
    if (fs.existsSync(logFilePath)) {
      fs.appendFileSync(logFilePath, logContent, 'utf8');
    } else {
      // 첫 번째 에러인 경우 헤더 추가
      let header = '='.repeat(80) + '\n';
      header += '원주순복음중앙교회 재정관리 - 에러 로그\n';
      header += '='.repeat(80) + '\n\n';
      header += `플랫폼: ${os.platform()} (${os.arch()})\n`;
      header += `Node.js 버전: ${process.version}\n`;
      header += `Electron 버전: ${process.versions.electron}\n`;
      header += `Chrome 버전: ${process.versions.chrome}\n`;
      header += '\n' + '='.repeat(80) + '\n\n';
      fs.writeFileSync(logFilePath, header + logContent, 'utf8');
    }
    
    console.error('에러 로그가 추가되었습니다:', logFilePath);
    return logFilePath;
  } catch (logError) {
    console.error('에러 로그 추가 실패:', logError);
    console.error('원본 에러:', error);
  }
}

module.exports = {
  logError,
  appendError,
  getDesktopPath,
};
