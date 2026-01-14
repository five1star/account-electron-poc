const { getDatabase } = require("../../../database");

class CategoryService {
  constructor() {
    this.db = null;
  }

  getDb() {
    if (!this.db) {
      this.db = getDatabase();
    }
    return this.db;
  }

  // 항목 목록 조회 (타입별)
  getAllCategories(type = null) {
    const db = this.getDb();
    let query = "SELECT * FROM category";
    const params = [];

    if (type) {
      query += " WHERE type = ?";
      params.push(type);
    }

    query += " ORDER BY type, main_category, sub_category";

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  // 대항목 목록 조회 (타입별)
  getMainCategories(type) {
    const db = this.getDb();
    const stmt = db.prepare(`
      SELECT DISTINCT main_category 
      FROM category 
      WHERE type = ? 
      ORDER BY main_category
    `);
    return stmt.all(type);
  }

  // 분류 목록 조회 (대항목별)
  getSubCategories(type, main_category) {
    const db = this.getDb();
    const stmt = db.prepare(`
      SELECT DISTINCT sub_category 
      FROM category 
      WHERE type = ? AND main_category = ? 
      ORDER BY sub_category
    `);
    return stmt.all(type, main_category);
  }

  // 항목 추가
  addCategory(data) {
    const db = this.getDb();
    const stmt = db.prepare(`
      INSERT INTO category (type, main_category, sub_category)
      VALUES (?, ?, ?)
    `);
    
    try {
      const result = stmt.run(
        data.type,
        data.main_category,
        data.sub_category || null
      );
      return { id: result.lastInsertRowid, ...data };
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new Error("이미 존재하는 항목입니다.");
      }
      throw error;
    }
  }

  // 항목 수정
  updateCategory(id, data) {
    const db = this.getDb();
    const stmt = db.prepare(`
      UPDATE category 
      SET type = ?, main_category = ?, sub_category = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);
    
    try {
      const result = stmt.run(
        data.type,
        data.main_category,
        data.sub_category || null,
        id
      );
      return { success: result.changes > 0 };
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new Error("이미 존재하는 항목입니다.");
      }
      throw error;
    }
  }

  // 항목 삭제
  deleteCategory(id) {
    const db = this.getDb();
    const stmt = db.prepare("DELETE FROM category WHERE id = ?");
    const result = stmt.run(id);
    return { success: result.changes > 0 };
  }

  // 계층 구조로 항목 조회 (대항목별 분류 그룹화)
  getCategoriesHierarchy(type = null) {
    const db = this.getDb();
    let query = `
      SELECT 
        type,
        main_category,
        GROUP_CONCAT(DISTINCT sub_category) as sub_categories
      FROM category
    `;
    const params = [];

    if (type) {
      query += " WHERE type = ?";
      params.push(type);
    }

    query += " GROUP BY type, main_category ORDER BY type, main_category";

    const stmt = db.prepare(query);
    const results = stmt.all(...params);
    
    // sub_categories를 배열로 변환
    return results.map(row => ({
      type: row.type,
      main_category: row.main_category,
      sub_categories: row.sub_categories 
        ? row.sub_categories.split(',').filter(s => s) 
        : []
    }));
  }
}

module.exports = new CategoryService();
