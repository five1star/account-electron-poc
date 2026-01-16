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
}

module.exports = {
  registerIpcHandlers,
};
