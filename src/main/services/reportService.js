const { getDatabase } = require("../../../database");

class ReportService {
  constructor() {
    this.db = null;
  }

  getDb() {
    if (!this.db) {
      this.db = getDatabase();
    }
    return this.db;
  }

  // 주간 보고서 생성
  generateWeeklyReport(startDate, endDate) {
    const db = this.getDb();
    
    // 수입 합계
    const incomeStmt = db.prepare(`
      SELECT 
        main_category,
        sub_category,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM income
      WHERE date >= ? AND date <= ?
      GROUP BY main_category, sub_category
      ORDER BY total_amount DESC
    `);
    
    // 지출 합계
    const expenseStmt = db.prepare(`
      SELECT 
        main_category,
        sub_category,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM expense
      WHERE date >= ? AND date <= ?
      GROUP BY main_category, sub_category
      ORDER BY total_amount DESC
    `);
    
    const income = incomeStmt.all(startDate, endDate);
    const expense = expenseStmt.all(startDate, endDate);
    
    // 전체 합계
    const incomeTotalStmt = db.prepare(`
      SELECT SUM(amount) as total FROM income WHERE date >= ? AND date <= ?
    `);
    const expenseTotalStmt = db.prepare(`
      SELECT SUM(amount) as total FROM expense WHERE date >= ? AND date <= ?
    `);
    
    const incomeTotal = incomeTotalStmt.get(startDate, endDate)?.total || 0;
    const expenseTotal = expenseTotalStmt.get(startDate, endDate)?.total || 0;
    
    return {
      startDate,
      endDate,
      income: {
        items: income,
        total: incomeTotal
      },
      expense: {
        items: expense,
        total: expenseTotal
      },
      balance: incomeTotal - expenseTotal
    };
  }

  // 연간 보고서 생성
  generateYearlyReport(year) {
    const db = this.getDb();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    // 월별 수입
    const monthlyIncomeStmt = db.prepare(`
      SELECT 
        strftime('%m', date) as month,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM income
      WHERE date >= ? AND date <= ?
      GROUP BY month
      ORDER BY month
    `);
    
    // 월별 지출
    const monthlyExpenseStmt = db.prepare(`
      SELECT 
        strftime('%m', date) as month,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM expense
      WHERE date >= ? AND date <= ?
      GROUP BY month
      ORDER BY month
    `);
    
    // 카테고리별 수입
    const categoryIncomeStmt = db.prepare(`
      SELECT 
        main_category,
        sub_category,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM income
      WHERE date >= ? AND date <= ?
      GROUP BY main_category, sub_category
      ORDER BY total_amount DESC
    `);
    
    // 카테고리별 지출
    const categoryExpenseStmt = db.prepare(`
      SELECT 
        main_category,
        sub_category,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM expense
      WHERE date >= ? AND date <= ?
      GROUP BY main_category, sub_category
      ORDER BY total_amount DESC
    `);
    
    const monthlyIncome = monthlyIncomeStmt.all(startDate, endDate);
    const monthlyExpense = monthlyExpenseStmt.all(startDate, endDate);
    const categoryIncome = categoryIncomeStmt.all(startDate, endDate);
    const categoryExpense = categoryExpenseStmt.all(startDate, endDate);
    
    // 전체 합계
    const incomeTotalStmt = db.prepare(`
      SELECT SUM(amount) as total FROM income WHERE date >= ? AND date <= ?
    `);
    const expenseTotalStmt = db.prepare(`
      SELECT SUM(amount) as total FROM expense WHERE date >= ? AND date <= ?
    `);
    
    const incomeTotal = incomeTotalStmt.get(startDate, endDate)?.total || 0;
    const expenseTotal = expenseTotalStmt.get(startDate, endDate)?.total || 0;
    
    return {
      year,
      income: {
        monthly: monthlyIncome,
        byCategory: categoryIncome,
        total: incomeTotal
      },
      expense: {
        monthly: monthlyExpense,
        byCategory: categoryExpense,
        total: expenseTotal
      },
      balance: incomeTotal - expenseTotal
    };
  }

  // 통계 데이터 조회
  getStatistics(filters = {}) {
    const db = this.getDb();
    let incomeQuery = "SELECT * FROM income WHERE 1=1";
    let expenseQuery = "SELECT * FROM expense WHERE 1=1";
    const incomeParams = [];
    const expenseParams = [];

    if (filters.startDate) {
      incomeQuery += " AND date >= ?";
      expenseQuery += " AND date >= ?";
      incomeParams.push(filters.startDate);
      expenseParams.push(filters.startDate);
    }
    if (filters.endDate) {
      incomeQuery += " AND date <= ?";
      expenseQuery += " AND date <= ?";
      incomeParams.push(filters.endDate);
      expenseParams.push(filters.endDate);
    }

    const incomeStmt = db.prepare(incomeQuery);
    const expenseStmt = db.prepare(expenseQuery);
    
    const income = incomeStmt.all(...incomeParams);
    const expense = expenseStmt.all(...expenseParams);
    
    const incomeTotal = income.reduce((sum, item) => sum + item.amount, 0);
    const expenseTotal = expense.reduce((sum, item) => sum + item.amount, 0);
    
    return {
      income: {
        count: income.length,
        total: incomeTotal,
        items: income
      },
      expense: {
        count: expense.length,
        total: expenseTotal,
        items: expense
      },
      balance: incomeTotal - expenseTotal
    };
  }
}

module.exports = new ReportService();
