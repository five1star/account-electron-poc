const { app, BrowserWindow } = require("electron");
const path = require("path");
const { initDatabase, closeDatabase } = require("./database");
const { registerIpcHandlers } = require("./src/main/ipc/handlers");

// 개발 모드 체크: NODE_ENV가 development이고 app이 패키징되지 않았을 때만
// 또는 명시적으로 ELECTRON_DEV=true로 설정된 경우
const isDev = 
  (process.env.NODE_ENV === "development" || process.env.ELECTRON_DEV === "true") && 
  !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

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
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  try {
    // 데이터베이스 초기화 (에러 발생 시에도 앱은 계속 실행)
    initDatabase();
  } catch (error) {
    console.error("Database initialization failed, but continuing:", error);
    // 데이터베이스 초기화 실패해도 앱은 계속 실행
  }
  
  // IPC 핸들러 등록
  registerIpcHandlers();
  
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    closeDatabase();
    app.quit();
  }
});

app.on("before-quit", () => {
  closeDatabase();
});
