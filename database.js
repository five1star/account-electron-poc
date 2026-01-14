const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

let db = null;

function initDatabase() {
  try {
    const userDataPath = app.getPath("userData");

    // userData 디렉토리가 없으면 생성
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    const dbPath = path.join(userDataPath, "finance.db");

    // 데이터베이스 파일이 존재하는지 확인하고, 손상되었는지 검사
    let dbExists = fs.existsSync(dbPath);
    let dbCorrupted = false;

    if (dbExists) {
      try {
        // 데이터베이스 파일이 손상되었는지 확인
        const testDb = new Database(dbPath, { readonly: true });
        testDb.pragma("integrity_check");
        testDb.close();
      } catch (error) {
        console.warn(
          "Database file is corrupted, will recreate:",
          error.message
        );
        dbCorrupted = true;
        // 손상된 파일을 백업
        try {
          const backupPath = `${dbPath}.backup.${Date.now()}`;
          fs.copyFileSync(dbPath, backupPath);
          console.log("Corrupted database backed up to:", backupPath);
        } catch (backupError) {
          console.warn(
            "Failed to backup corrupted database:",
            backupError.message
          );
        }
        // 손상된 파일 삭제
        try {
          fs.unlinkSync(dbPath);
        } catch (unlinkError) {
          console.warn(
            "Failed to delete corrupted database:",
            unlinkError.message
          );
        }
      }
    }

    // 데이터베이스 연결 (파일이 없으면 자동 생성됨)
    db = new Database(dbPath);

    // 데이터베이스 무결성 검사
    try {
      const integrityCheck = db.pragma("integrity_check");
      if (integrityCheck[0].integrity_check !== "ok") {
        throw new Error("Database integrity check failed");
      }
    } catch (error) {
      console.warn(
        "Database integrity check failed, recreating:",
        error.message
      );
      db.close();
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
      db = new Database(dbPath);
    }

    // 테이블 생성
    createTables();

    console.log("Database initialized at:", dbPath);
    return db;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    // 최후의 수단: 데이터베이스 파일을 삭제하고 재생성 시도
    try {
      const userDataPath = app.getPath("userData");
      const dbPath = path.join(userDataPath, "finance.db");
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
      db = new Database(dbPath);
      createTables();
      console.log("Database recreated successfully");
      return db;
    } catch (recreateError) {
      console.error("Failed to recreate database:", recreateError);
      throw recreateError;
    }
  }
}

function createTables() {
  try {
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
  } catch (error) {
    console.error("Failed to create tables:", error);
    throw error;
  }
}

function getDatabase() {
  if (!db) {
    return initDatabase();
  }

  // 데이터베이스 연결이 유효한지 확인
  try {
    db.prepare("SELECT 1").get();
  } catch (error) {
    console.warn("Database connection lost, reinitializing:", error.message);
    if (db) {
      try {
        db.close();
      } catch (closeError) {
        // 무시
      }
    }
    db = null;
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
