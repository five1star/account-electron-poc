const { ipcMain } = require("electron");

// 서비스들을 지연 로드 (better-sqlite3 네이티브 모듈 로딩 지연)
let financeService = null;
let categoryService = null;
let reportService = null;

function getFinanceService() {
  if (!financeService) {
    financeService = require("../services/financeService");
  }
  return financeService;
}

function getCategoryService() {
  if (!categoryService) {
    categoryService = require("../services/categoryService");
  }
  return categoryService;
}

function getReportService() {
  if (!reportService) {
    reportService = require("../services/reportService");
  }
  return reportService;
}

// IPC 핸들러 등록 함수
function registerIpcHandlers() {
  // 재정 수입 입력 관련 핸들러
  ipcMain.handle("finance:addIncome", async (event, data) => {
    try {
      const result = getFinanceService().addIncome(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 재정 지출 입력 관련 핸들러
  ipcMain.handle("finance:addExpense", async (event, data) => {
    try {
      const result = getFinanceService().addExpense(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 재정 수입 조회
  ipcMain.handle("finance:getIncomeList", async (event, filters = {}) => {
    try {
      const data = getFinanceService().getIncomeList(filters);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 재정 지출 조회
  ipcMain.handle("finance:getExpenseList", async (event, filters = {}) => {
    try {
      const data = getFinanceService().getExpenseList(filters);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 재정 수입 수정
  ipcMain.handle("finance:updateIncome", async (event, id, data) => {
    try {
      const result = getFinanceService().updateIncome(id, data);
      return { success: result.success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 재정 지출 수정
  ipcMain.handle("finance:updateExpense", async (event, id, data) => {
    try {
      const result = getFinanceService().updateExpense(id, data);
      return { success: result.success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 재정 수입 삭제
  ipcMain.handle("finance:deleteIncome", async (event, id) => {
    try {
      const result = getFinanceService().deleteIncome(id);
      return { success: result.success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 재정 지출 삭제
  ipcMain.handle("finance:deleteExpense", async (event, id) => {
    try {
      const result = getFinanceService().deleteExpense(id);
      return { success: result.success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 항목 관리 관련 핸들러
  ipcMain.handle("category:getAll", async (event, type = null) => {
    try {
      const data = getCategoryService().getAllCategories(type);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("category:getMainCategories", async (event, type) => {
    try {
      const data = getCategoryService().getMainCategories(type);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("category:getSubCategories", async (event, type, main_category) => {
    try {
      const data = getCategoryService().getSubCategories(type, main_category);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("category:getHierarchy", async (event, type = null) => {
    try {
      const data = getCategoryService().getCategoriesHierarchy(type);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("category:add", async (event, data) => {
    try {
      const result = getCategoryService().addCategory(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("category:update", async (event, id, data) => {
    try {
      const result = getCategoryService().updateCategory(id, data);
      return { success: result.success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("category:delete", async (event, id) => {
    try {
      const result = getCategoryService().deleteCategory(id);
      return { success: result.success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 결제라인 관리 관련 핸들러
  ipcMain.handle("paymentLine:getAll", async (event) => {
    try {
      const data = getCategoryService().getAllPaymentLines();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("paymentLine:add", async (event, data) => {
    try {
      const result = getCategoryService().addPaymentLine(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("paymentLine:update", async (event, id, data) => {
    try {
      const result = getCategoryService().updatePaymentLine(id, data);
      return { success: result.success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("paymentLine:delete", async (event, id) => {
    try {
      const result = getCategoryService().deletePaymentLine(id);
      return { success: result.success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 주간 보고서 관련 핸들러
  ipcMain.handle("report:weekly", async (event, startDate, endDate) => {
    try {
      const data = getReportService().generateWeeklyReport(startDate, endDate);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 연간 보고서 관련 핸들러
  ipcMain.handle("report:yearly", async (event, year) => {
    try {
      const data = getReportService().generateYearlyReport(year);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 통계 데이터 조회
  ipcMain.handle("report:getStatistics", async (event, filters = {}) => {
    try {
      const data = getReportService().getStatistics(filters);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 파일 저장 다이얼로그 및 파일 저장
  ipcMain.handle("dialog:saveFile", async (event, defaultPath, filters, fileData) => {
    const { dialog } = require("electron");
    const fs = require("fs");
    
    const result = await dialog.showSaveDialog({
      defaultPath: defaultPath,
      filters: filters || [
        { name: "PDF Files", extensions: ["pdf"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    
    if (!result.canceled && fileData) {
      // 파일 데이터를 Buffer로 변환하여 저장
      const buffer = Buffer.from(fileData);
      fs.writeFileSync(result.filePath, buffer);
    }
    
    return result;
  });

  // PDF 생성 (HTML을 PDF로 변환)
  ipcMain.handle("pdf:generate", async (event, htmlContent, options) => {
    const { dialog, BrowserWindow } = require("electron");
    const fs = require("fs");
    const path = require("path");
    
    try {
      // 임시 HTML 파일 생성
      const tempDir = require("os").tmpdir();
      const tempHtmlPath = path.join(tempDir, `temp-pdf-${Date.now()}.html`);
      fs.writeFileSync(tempHtmlPath, htmlContent, "utf8");

      // 숨겨진 브라우저 창 생성
      const pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // HTML 파일 로드
      await pdfWindow.loadFile(tempHtmlPath);
      
      // PDF 생성 옵션
      const pdfOptions = {
        pageSize: "A4",
        printBackground: true,
        margins: {
          marginType: "custom",
          top: 0.4,
          bottom: 0.4,
          left: 0.4,
          right: 0.4,
        },
        ...options,
      };

      // PDF 생성
      const pdfBuffer = await pdfWindow.webContents.printToPDF(pdfOptions);
      
      // 임시 파일 삭제
      pdfWindow.close();
      fs.unlinkSync(tempHtmlPath);

      return { success: true, data: pdfBuffer };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 에러 로깅 핸들러
  ipcMain.handle("log:error", async (event, error, context) => {
    try {
      const { appendError } = require("../utils/logger");
      const errorObj = error instanceof Error ? error : new Error(String(error));
      appendError(errorObj, context || 'Renderer Process');
      return { success: true };
    } catch (logError) {
      console.error("Failed to log error:", logError);
      return { success: false, error: logError.message };
    }
  });

  // 설정 관련 핸들러
  ipcMain.handle("settings:getDbInfo", async (event) => {
    try {
      const { app } = require("electron");
      const path = require("path");
      const fs = require("fs");
      
      const userDataPath = app.getPath("userData");
      const dbPath = path.join(userDataPath, "finance.db");
      const fileName = path.basename(dbPath);
      
      let lastUpdated = null;
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        lastUpdated = stats.mtime;
      }
      
      return {
        success: true,
        data: {
          fileName: fileName,
          filePath: dbPath,
          lastUpdated: lastUpdated,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("settings:backupDatabase", async (event) => {
    try {
      const { app, dialog } = require("electron");
      const path = require("path");
      const fs = require("fs");
      
      const userDataPath = app.getPath("userData");
      const dbPath = path.join(userDataPath, "finance.db");
      
      if (!fs.existsSync(dbPath)) {
        return { success: false, error: "DB 파일을 찾을 수 없습니다." };
      }

      // 기본 파일명 생성 (wonjufgcc-yyyy-mm-dd.db)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const defaultFileName = `wonjufgcc-${year}-${month}-${day}.db`;
      
      const result = await dialog.showSaveDialog({
        title: "DB 백업 저장",
        defaultPath: defaultFileName,
        filters: [
          { name: "Database Files", extensions: ["db"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (result.canceled) {
        return { success: false, error: "백업이 취소되었습니다." };
      }

      const backupPath = result.filePath;
      fs.copyFileSync(dbPath, backupPath);

      return {
        success: true,
        data: backupPath,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("settings:restoreDatabase", async (event) => {
    try {
      const { app, dialog } = require("electron");
      const path = require("path");
      const fs = require("fs");
      
      const result = await dialog.showOpenDialog({
        title: "DB 복구 파일 선택",
        filters: [
          { name: "Database Files", extensions: ["db"] },
          { name: "All Files", extensions: ["*"] },
        ],
        properties: ["openFile"],
      });

      if (result.canceled) {
        return { success: false, error: "복구가 취소되었습니다." };
      }

      const backupPath = result.filePaths[0];
      
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: "선택한 파일을 찾을 수 없습니다." };
      }

      const userDataPath = app.getPath("userData");
      const dbPath = path.join(userDataPath, "finance.db");
      
      // 현재 DB 파일이 열려있으면 닫아야 함
      // database.js의 closeDatabase 함수를 사용할 수 없으므로
      // 직접 처리하거나 경고만 표시
      
      // 현재 DB 파일 백업 (복구 전)
      const currentBackupPath = `${dbPath}.backup.${Date.now()}`;
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, currentBackupPath);
      }

      // 백업 파일을 현재 DB 위치로 복사
      fs.copyFileSync(backupPath, dbPath);

      return {
        success: true,
        data: backupPath,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  registerIpcHandlers,
};
