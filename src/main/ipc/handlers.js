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
}

module.exports = {
  registerIpcHandlers,
};
