const { getDatabase } = require("../../../database");

class FinanceService {
  constructor() {
    this.db = null;
  }

  getDb() {
    if (!this.db) {
      this.db = getDatabase();
    }
    return this.db;
  }

  // 재정 수입 추가
  addIncome(data) {
    const db = this.getDb();
    const stmt = db.prepare(`
      INSERT INTO income (date, main_category, sub_category, name1, name2, amount, memo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.date,
      data.main_category,
      data.sub_category,
      data.name1,
      data.name2 || null,
      data.amount,
      data.memo || null
    );
    
    return { id: result.lastInsertRowid, ...data };
  }

  // 재정 지출 추가
  addExpense(data) {
    const db = this.getDb();
    const stmt = db.prepare(`
      INSERT INTO expense (date, main_category, sub_category, amount, memo)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.date,
      data.main_category,
      data.sub_category,
      data.amount,
      data.memo || null
    );
    
    return { id: result.lastInsertRowid, ...data };
  }

  // 재정 수입 조회
  getIncomeList(filters = {}) {
    const db = this.getDb();
    let query = "SELECT * FROM income WHERE 1=1";
    const params = [];

    if (filters.startDate) {
      query += " AND date >= ?";
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += " AND date <= ?";
      params.push(filters.endDate);
    }
    if (filters.main_category) {
      query += " AND main_category = ?";
      params.push(filters.main_category);
    }
    if (filters.sub_category) {
      query += " AND sub_category = ?";
      params.push(filters.sub_category);
    }

    query += " ORDER BY date DESC, id DESC";

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  // 재정 지출 조회
  getExpenseList(filters = {}) {
    const db = this.getDb();
    let query = "SELECT * FROM expense WHERE 1=1";
    const params = [];

    if (filters.startDate) {
      query += " AND date >= ?";
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += " AND date <= ?";
      params.push(filters.endDate);
    }
    if (filters.main_category) {
      query += " AND main_category = ?";
      params.push(filters.main_category);
    }
    if (filters.sub_category) {
      query += " AND sub_category = ?";
      params.push(filters.sub_category);
    }

    query += " ORDER BY date DESC, id DESC";

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  // 재정 수입 수정
  updateIncome(id, data) {
    const db = this.getDb();
    const stmt = db.prepare(`
      UPDATE income 
      SET date = ?, main_category = ?, sub_category = ?, name1 = ?, name2 = ?, amount = ?, memo = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);
    
    const result = stmt.run(
      data.date,
      data.main_category,
      data.sub_category,
      data.name1,
      data.name2 || null,
      data.amount,
      data.memo || null,
      id
    );
    
    return { success: result.changes > 0 };
  }

  // 재정 지출 수정
  updateExpense(id, data) {
    const db = this.getDb();
    const stmt = db.prepare(`
      UPDATE expense 
      SET date = ?, main_category = ?, sub_category = ?, amount = ?, memo = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);
    
    const result = stmt.run(
      data.date,
      data.main_category,
      data.sub_category,
      data.amount,
      data.memo || null,
      id
    );
    
    return { success: result.changes > 0 };
  }

  // 재정 수입 삭제
  deleteIncome(id) {
    const db = this.getDb();
    const stmt = db.prepare("DELETE FROM income WHERE id = ?");
    const result = stmt.run(id);
    return { success: result.changes > 0 };
  }

  // 재정 지출 삭제
  deleteExpense(id) {
    const db = this.getDb();
    const stmt = db.prepare("DELETE FROM expense WHERE id = ?");
    const result = stmt.run(id);
    return { success: result.changes > 0 };
  }
}

module.exports = new FinanceService();
