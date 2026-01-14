const { contextBridge, ipcRenderer } = require("electron");

// 렌더러 프로세스에서 사용할 API를 여기에 노출
contextBridge.exposeInMainWorld("electronAPI", {
  // 재정 입력 관련 API
  finance: {
    // 수입
    addIncome: (data) => ipcRenderer.invoke("finance:addIncome", data),
    getIncomeList: (filters) => ipcRenderer.invoke("finance:getIncomeList", filters),
    updateIncome: (id, data) => ipcRenderer.invoke("finance:updateIncome", id, data),
    deleteIncome: (id) => ipcRenderer.invoke("finance:deleteIncome", id),
    
    // 지출
    addExpense: (data) => ipcRenderer.invoke("finance:addExpense", data),
    getExpenseList: (filters) => ipcRenderer.invoke("finance:getExpenseList", filters),
    updateExpense: (id, data) => ipcRenderer.invoke("finance:updateExpense", id, data),
    deleteExpense: (id) => ipcRenderer.invoke("finance:deleteExpense", id),
  },

  // 항목 관리 관련 API
  category: {
    getAll: (type) => ipcRenderer.invoke("category:getAll", type),
    getMainCategories: (type) => ipcRenderer.invoke("category:getMainCategories", type),
    getSubCategories: (type, main_category) => 
      ipcRenderer.invoke("category:getSubCategories", type, main_category),
    getHierarchy: (type) => ipcRenderer.invoke("category:getHierarchy", type),
    add: (data) => ipcRenderer.invoke("category:add", data),
    update: (id, data) => ipcRenderer.invoke("category:update", id, data),
    delete: (id) => ipcRenderer.invoke("category:delete", id),
  },

  // 보고서 관련 API
  report: {
    weekly: (startDate, endDate) =>
      ipcRenderer.invoke("report:weekly", startDate, endDate),
    yearly: (year) => ipcRenderer.invoke("report:yearly", year),
    getStatistics: (filters) => ipcRenderer.invoke("report:getStatistics", filters),
  },

  // 파일 저장 다이얼로그
  saveFile: (defaultPath, filters, fileData) =>
    ipcRenderer.invoke("dialog:saveFile", defaultPath, filters, fileData),
  
  // PDF 생성 (HTML을 PDF로 변환)
  generatePDF: (htmlContent, options) =>
    ipcRenderer.invoke("pdf:generate", htmlContent, options),
});
