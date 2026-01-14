const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");

let db = null;

function initDatabase() {
  const userDataPath = app.getPath("userData");
  const dbPath = path.join(userDataPath, "finance.db");

  db = new Database(dbPath);

  // 테이블 생성
  createTables();

  console.log("Database initialized at:", dbPath);
  return db;
}

function createTables() {
  // 재정 수입 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      main_category TEXT NOT NULL,
      sub_category TEXT NOT NULL,
      name1 TEXT NOT NULL,
      name2 TEXT,
      amount INTEGER NOT NULL,
      memo TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 재정 지출 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      main_category TEXT NOT NULL,
      sub_category TEXT NOT NULL,
      amount INTEGER NOT NULL,
      memo TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // 항목관리 테이블 (대항목과 분류의 계층 구조)
  db.exec(`
    CREATE TABLE IF NOT EXISTS category (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('수입', '지출')),
      main_category TEXT NOT NULL,
      sub_category TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(type, main_category, sub_category)
    )
  `);

  // 인덱스 생성 (조회 성능 향상)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
    CREATE INDEX IF NOT EXISTS idx_income_category ON income(main_category, sub_category);
    CREATE INDEX IF NOT EXISTS idx_expense_date ON expense(date);
    CREATE INDEX IF NOT EXISTS idx_expense_category ON expense(main_category, sub_category);
    CREATE INDEX IF NOT EXISTS idx_category_type ON category(type);
    CREATE INDEX IF NOT EXISTS idx_category_main ON category(main_category);
  `);

  console.log("Database tables created successfully");
}

function getDatabase() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
};
