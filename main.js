const { app, BrowserWindow } = require("electron");
const path = require("path");

// macOS Writing Tools 관련 크래시 방지를 위한 command line arguments
// app.whenReady() 전에 설정해야 함
if (process.platform === 'darwin') {
  // Writing Tools 및 관련 기능 비활성화
  app.commandLine.appendSwitch('disable-features', 'WritingTools');
  // 텍스트 입력 관련 기능 비활성화
  app.commandLine.appendSwitch('disable-spell-checking');
}

// 모든 모듈을 지연 로드하여 초기화 문제 방지
let databaseModule = null;
let handlersModule = null;
let loggerModule = null;

function getDatabaseModule() {
  if (!databaseModule) {
    try {
      databaseModule = require("./database");
    } catch (error) {
      console.error("Failed to load database module:", error);
      throw error;
    }
  }
  return databaseModule;
}

function getHandlersModule() {
  if (!handlersModule) {
    try {
      handlersModule = require("./src/main/ipc/handlers");
    } catch (error) {
      console.error("Failed to load handlers module:", error);
      throw error;
    }
  }
  return handlersModule;
}

function getLoggerModule() {
  if (!loggerModule) {
    try {
      loggerModule = require("./src/main/utils/logger");
    } catch (error) {
      console.error("Failed to load logger module:", error);
      // 로거 로드 실패는 치명적이지 않으므로 기본 함수 제공
      loggerModule = {
        logError: (error, context) => console.error(`[${context}]`, error),
        appendError: (error, context) => console.error(`[${context}]`, error),
      };
    }
  }
  return loggerModule;
}

// 개발 모드 체크: NODE_ENV가 development이고 app이 패키징되지 않았을 때만
// 또는 명시적으로 ELECTRON_DEV=true로 설정된 경우
const isDev = 
  (process.env.NODE_ENV === "development" || process.env.ELECTRON_DEV === "true") && 
  !app.isPackaged;

let mainWindow;

function createWindow() {
  const iconPath = path.join(__dirname, 'src', 'renderer', 'image', 'logo.jpg');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // macOS Writing Tools 관련 크래시 방지
      spellcheck: false,
      enableWebSQL: false
    },
    // macOS Writing Tools 비활성화
    ...(process.platform === 'darwin' && {
      titleBarStyle: 'default'
    })
  });
  
  // macOS에서 Writing Tools 관련 기능 비활성화
  if (process.platform === 'darwin') {
    try {
      // 컨텍스트 메뉴에서 Writing Tools 관련 항목 제거
      mainWindow.webContents.on('context-menu', (event, params) => {
        // Writing Tools 관련 메뉴 항목 필터링
        event.preventDefault();
      });
    } catch (error) {
      console.warn('Failed to disable context menu:', error);
    }
  }

  if (isDev) {
    // 개발 모드: Vite 서버에 연결 (포트는 환경 변수로 전달 가능)
    const vitePort = process.env.VITE_PORT || 5173;
    mainWindow.loadURL(`http://localhost:${vitePort}`);
    mainWindow.webContents.openDevTools();
  } else {
    // 프로덕션 모드: 빌드된 파일 사용
    const indexPath = path.join(__dirname, "dist", "index.html");
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error("Failed to load index.html:", err);
      console.log("Please run 'npm run build' first to build the React app.");
      try {
        getLoggerModule().logError(err, 'Failed to Load index.html');
      } catch (logErr) {
        console.error("Failed to log error:", logErr);
      }
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  
  // 에러 핸들러 설정
  setupErrorHandlers(mainWindow);
}

app.whenReady().then(() => {
  // 데이터베이스 초기화를 더 늦게 지연시켜 앱이 먼저 완전히 시작되도록
  // 개발 모드에서는 더 긴 지연 시간 사용
  const delay = isDev ? 2000 : 500;
  setTimeout(() => {
    try {
      // 데이터베이스 모듈 지연 로드 및 초기화
      const { initDatabase } = getDatabaseModule();
      initDatabase();
    } catch (error) {
      console.error("Database initialization failed, but continuing:", error);
      try {
        getLoggerModule().logError(error, 'Database Initialization');
      } catch (logErr) {
        console.error("Failed to log error:", logErr);
      }
      // 데이터베이스 초기화 실패해도 앱은 계속 실행
    }
  }, delay);
  
  try {
    // IPC 핸들러 등록 (지연 로드)
    const { registerIpcHandlers } = getHandlersModule();
    registerIpcHandlers();
  } catch (error) {
    console.error("IPC handler registration failed:", error);
    try {
      getLoggerModule().logError(error, 'IPC Handler Registration');
    } catch (logErr) {
      console.error("Failed to log error:", logErr);
    }
  }
  
  try {
    createWindow();
  } catch (error) {
    console.error("Window creation failed:", error);
    try {
      getLoggerModule().logError(error, 'Window Creation');
    } catch (logErr) {
      console.error("Failed to log error:", logErr);
    }
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      try {
        createWindow();
      } catch (error) {
        console.error("Window creation failed on activate:", error);
        try {
          getLoggerModule().logError(error, 'Window Creation (Activate)');
        } catch (logErr) {
          console.error("Failed to log error:", logErr);
        }
      }
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    try {
      const { closeDatabase } = getDatabaseModule();
      closeDatabase();
    } catch (error) {
      console.error("Error closing database:", error);
    }
    app.quit();
  }
});

app.on("before-quit", () => {
  try {
    const { closeDatabase } = getDatabaseModule();
    closeDatabase();
  } catch (error) {
    console.error("Error closing database:", error);
  }
});

// 전역 에러 핸들러 설정
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  try {
    getLoggerModule().logError(error, 'Uncaught Exception');
  } catch (logErr) {
    console.error("Failed to log error:", logErr);
  }
  // 앱이 크래시되지 않도록 하려면 주석 해제
  // app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  const error = reason instanceof Error ? reason : new Error(String(reason));
  try {
    getLoggerModule().logError(error, 'Unhandled Rejection');
  } catch (logErr) {
    console.error("Failed to log error:", logErr);
  }
});

// 모든 BrowserWindow에 대해 에러 이벤트 리스너 추가
function setupErrorHandlers(window) {
  if (!window) return;
  
  // 렌더러 프로세스 크래시 감지
  app.on('render-process-gone', (event, webContents, details) => {
    if (webContents === window.webContents) {
      console.error('Render process gone:', details);
      const error = new Error(`Render process crashed: ${details.reason || 'unknown'}`);
      error.stack = `Exit code: ${details.exitCode || 'unknown'}\nReason: ${details.reason || 'unknown'}`;
      try {
        getLoggerModule().logError(error, 'Render Process Crashed');
      } catch (logErr) {
        console.error("Failed to log error:", logErr);
      }
    }
  });
  
  // 웹 콘텐츠 크래시 감지
  window.webContents.on('crashed', (event, killed) => {
    console.error('WebContents crashed, killed:', killed);
    const error = new Error(`WebContents crashed (killed: ${killed})`);
    try {
      getLoggerModule().logError(error, 'WebContents Crashed');
    } catch (logErr) {
      console.error("Failed to log error:", logErr);
    }
  });
  
  // 웹 콘텐츠 응답 없음 감지
  window.webContents.on('unresponsive', () => {
    console.error('WebContents became unresponsive');
    const error = new Error('WebContents became unresponsive');
    try {
      getLoggerModule().logError(error, 'WebContents Unresponsive');
    } catch (logErr) {
      console.error("Failed to log error:", logErr);
    }
  });
  
  // 렌더러 프로세스에서 발생한 에러 감지
  window.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame) {
      console.error('Failed to load:', validatedURL, errorCode, errorDescription);
      const error = new Error(`Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
      try {
        getLoggerModule().logError(error, 'Failed to Load');
      } catch (logErr) {
        console.error("Failed to log error:", logErr);
      }
    }
  });
  
  // 콘솔 메시지 캡처 (에러 포함)
  window.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level === 3) { // 3 = error level
      const error = new Error(message);
      error.stack = `Console error at ${sourceId}:${line}\n${message}`;
      try {
        getLoggerModule().appendError(error, 'Renderer Console Error');
      } catch (logErr) {
        console.error("Failed to log error:", logErr);
      }
    }
  });
}
