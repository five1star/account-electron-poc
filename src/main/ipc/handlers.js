const { ipcMain } = require("electron");
const financeService = require("../services/financeService");
const categoryService = require("../services/categoryService");
const reportService = require("../services/reportService");

// IPC 핸들러 등록 함수
function registerIpcHandlers() {
  // 재정 수입 입력 관련 핸들러
  ipcMain.handle("finance:addIncome", async (event, data) => {
    try {
      const result = financeService.addIncome(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 재정 지출 입력 관련 핸들러
  ipcMain.handle("finance:addExpense", async (event, data) => {
    try {
      const result = financeService.addExpense(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 재정 수입 조회
  ipcMain.handle("finance:getIncomeList", async (event, filters = {}) => {
    try {
      const data = financeService.getIncomeList(filters);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 재정 지출 조회
  ipcMain.handle("finance:getExpenseList", async (event, filters = {}) => {
    try {
      const data = financeService.getExpenseList(filters);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 재정 수입 수정
  ipcMain.handle("finance:updateIncome", async (event, id, data) => {
    try {
      const result = financeService.updateIncome(id, data);
      return { success: result.success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 재정 지출 수정
  ipcMain.handle("finance:updateExpense", async (event, id, data) => {
    try {
      const result = financeService.updateExpense(id, data);
      return { success: result.success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 재정 수입 삭제
  ipcMain.handle("finance:deleteIncome", async (event, id) => {
    try {
      const result = financeService.deleteIncome(id);
      return { success: result.success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 재정 지출 삭제
  ipcMain.handle("finance:deleteExpense", async (event, id) => {
    try {
      const result = financeService.deleteExpense(id);
      return { success: result.success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 항목 관리 관련 핸들러
  ipcMain.handle("category:getAll", async (event, type = null) => {
    try {
      const data = categoryService.getAllCategories(type);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("category:getMainCategories", async (event, type) => {
    try {
      const data = categoryService.getMainCategories(type);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("category:getSubCategories", async (event, type, main_category) => {
    try {
      const data = categoryService.getSubCategories(type, main_category);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("category:getHierarchy", async (event, type = null) => {
    try {
      const data = categoryService.getCategoriesHierarchy(type);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("category:add", async (event, data) => {
    try {
      const result = categoryService.addCategory(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("category:update", async (event, id, data) => {
    try {
      const result = categoryService.updateCategory(id, data);
      return { success: result.success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("category:delete", async (event, id) => {
    try {
      const result = categoryService.deleteCategory(id);
      return { success: result.success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 주간 보고서 관련 핸들러
  ipcMain.handle("report:weekly", async (event, startDate, endDate) => {
    try {
      const data = reportService.generateWeeklyReport(startDate, endDate);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 연간 보고서 관련 핸들러
  ipcMain.handle("report:yearly", async (event, year) => {
    try {
      const data = reportService.generateYearlyReport(year);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 통계 데이터 조회
  ipcMain.handle("report:getStatistics", async (event, filters = {}) => {
    try {
      const data = reportService.getStatistics(filters);
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
}

module.exports = {
  registerIpcHandlers,
};
