import React, { useState, useEffect } from "react";
import "./FinanceHistoryPopup.css";
import "./FinanceInputPopup.css";
import { formatCurrency } from "../utils/formatCurrency";

// 한글 폰트 추가를 위한 유틸리티
// 실제로는 Noto Sans KR 폰트를 base64로 변환하여 추가해야 합니다.
// 여기서는 간단한 방법으로 처리합니다.

function FinanceHistoryPopup({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("수입"); // "수입" 또는 "지출"
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRecords();
    }
  }, [isOpen, activeTab, startDate, endDate]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const filters = { startDate, endDate };
      let result;
      if (activeTab === "수입") {
        result = await window.electronAPI.finance.getIncomeList(filters);
      } else {
        result = await window.electronAPI.finance.getExpenseList(filters);
      }
      if (result.success) {
        setRecords(result.data);
      }
    } catch (error) {
      console.error("기록 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
  };

  const handleSavePDF = async () => {
    if (records.length === 0) {
      alert("저장할 데이터가 없습니다.");
      return;
    }

    try {
      // 날짜 범위 문자열 생성
      const dateRange = startDate === endDate 
        ? formatDate(startDate)
        : `${formatDate(startDate)} ~ ${formatDate(endDate)}`;

      // 기본 파일명 생성
      const defaultFileName = `${activeTab}_${dateRange.replace(/[~ ]/g, "_")}.pdf`;

      // 항, 목 순서로 정렬된 데이터 생성
      const sortedRecords = [...records].sort((a, b) => {
        if (a.main_category !== b.main_category) {
          return a.main_category.localeCompare(b.main_category);
        }
        if ((a.sub_category || "") !== (b.sub_category || "")) {
          return (a.sub_category || "").localeCompare(b.sub_category || "");
        }
        return new Date(a.date) - new Date(b.date);
      });

      // HTML 테이블 생성 (항, 목 중복 제거 및 소계 추가)
      const tableRows = [];
      let prevMainCategory = null;
      let prevSubCategory = null;
      let currentSubCategoryTotal = 0;
      let currentSubCategoryCount = 0;

      sortedRecords.forEach((record, index) => {
        const isFirstInGroup = prevMainCategory !== record.main_category || prevSubCategory !== (record.sub_category || "");
        
        // 목이 바뀌면 이전 목의 소계 추가
        if (isFirstInGroup && prevSubCategory !== null) {
          const colspan = activeTab === "수입" ? 5 : 3;
          tableRows.push(
            `<tr class="subtotal-row">
              <td colspan="${colspan}" style="text-align: right; font-weight: bold; padding-right: 20px; background-color: #fff3e0;">
                소계: ${formatCurrency(currentSubCategoryTotal)}원 / 입력 건수: ${currentSubCategoryCount}건
              </td>
              <td style="text-align: right; font-weight: bold; background-color: #fff3e0;">${formatCurrency(currentSubCategoryTotal)}원</td>
            </tr>`
          );
          currentSubCategoryTotal = 0;
          currentSubCategoryCount = 0;
        }

        // 현재 행 추가
        const cells = [
          `<td>${formatDate(record.date)}</td>`,
          `<td>${isFirstInGroup ? record.main_category : ""}</td>`,
          `<td>${isFirstInGroup ? (record.sub_category || "-") : ""}</td>`,
        ];
        if (activeTab === "수입") {
          cells.push(`<td>${record.name1 || "-"}</td>`, `<td>${record.name2 || "-"}</td>`);
        }
        cells.push(`<td>${formatCurrency(record.amount)}원</td>`);
        tableRows.push(`<tr>${cells.join("")}</tr>`);

        // 소계 계산
        if (isFirstInGroup) {
          currentSubCategoryTotal = record.amount;
          currentSubCategoryCount = 1;
        } else {
          currentSubCategoryTotal += record.amount;
          currentSubCategoryCount += 1;
        }

        prevMainCategory = record.main_category;
        prevSubCategory = record.sub_category || "";
      });

      // 마지막 목의 소계 추가
      if (sortedRecords.length > 0) {
        const colspan = activeTab === "수입" ? 5 : 3;
        tableRows.push(
          `<tr class="subtotal-row">
            <td colspan="${colspan}" style="text-align: right; font-weight: bold; padding-right: 20px; background-color: #fff3e0;">
              소계: ${formatCurrency(currentSubCategoryTotal)}원 / 입력 건수: ${currentSubCategoryCount}건
            </td>
            <td style="text-align: right; font-weight: bold; background-color: #fff3e0;">${formatCurrency(currentSubCategoryTotal)}원</td>
          </tr>`
        );
      }

      // 총합계 계산
      const grandTotal = sortedRecords.reduce((sum, record) => sum + record.amount, 0);
      const grandTotalCount = sortedRecords.length;

      // 총합계 행 추가
      if (sortedRecords.length > 0) {
        const colspan = activeTab === "수입" ? 5 : 3;
        tableRows.push(
          `<tr class="grand-total-row">
            <td colspan="${colspan}" style="text-align: right; font-weight: bold; padding-right: 20px; background-color: #e8f5e9; font-size: 11pt;">
              총합계: ${formatCurrency(grandTotal)}원 / 총 건수: ${grandTotalCount}건
            </td>
            <td style="text-align: right; font-weight: bold; background-color: #e8f5e9; font-size: 11pt;">${formatCurrency(grandTotal)}원</td>
          </tr>`
        );
      }

      const tableRowsHtml = tableRows.join("");

      const tableHeaders = [
        "<th>날짜</th>",
        "<th>항</th>",
        "<th>목</th>",
      ];
      if (activeTab === "수입") {
        tableHeaders.push("<th>이름1</th>", "<th>이름2</th>");
      }
      tableHeaders.push("<th>금액</th>");

      // 출력일자 (오늘 날짜)
      const today = new Date();
      const outputDate = formatDate(today.toISOString().split("T")[0]);

      const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }
    body {
      font-family: "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif;
      font-size: 10pt;
      padding: 20px;
    }
    h1 {
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 20px;
      text-align: center;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      font-size: 10pt;
    }
    .info-left {
      text-align: left;
    }
    .info-right {
      text-align: right;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background-color: #4caf50;
      color: white;
      padding: 8px;
      text-align: center;
      border: 1px solid #ddd;
      font-weight: bold;
    }
    td {
      padding: 6px;
      text-align: center;
      border: 1px solid #ddd;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .subtotal-row {
      background-color: #fff3e0;
      border-top: 2px solid #ff9800;
    }
    .grand-total-row {
      background-color: #e8f5e9;
      border-top: 3px solid #4caf50;
    }
  </style>
</head>
<body>
  <h1>${activeTab} 목록</h1>
  <div class="info-row">
    <div class="info-left">검색기간: ${dateRange}</div>
    <div class="info-right">출력일자: ${outputDate}</div>
  </div>
  <table>
    <thead>
      <tr>${tableHeaders.join("")}</tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>
</body>
</html>`;

      // Electron의 printToPDF를 사용하여 PDF 생성
      const pdfResult = await window.electronAPI.generatePDF(htmlContent, {
        pageSize: "A4",
        printBackground: true,
        margins: {
          marginType: "custom",
          top: 0.4,
          bottom: 0.4,
          left: 0.4,
          right: 0.4,
        },
      });

      if (!pdfResult.success) {
        throw new Error(pdfResult.error || "PDF 생성 실패");
      }

      // PDF 데이터를 배열로 변환
      const pdfBuffer = pdfResult.data;
      const uint8Array = new Uint8Array(pdfBuffer);
      const fileData = Array.from(uint8Array);

      // 파일 저장 다이얼로그를 통해 저장
      const saveResult = await window.electronAPI.saveFile(defaultFileName, [
        { name: "PDF Files", extensions: ["pdf"] },
        { name: "All Files", extensions: ["*"] },
      ], fileData);

      if (!saveResult.canceled) {
        alert("PDF가 성공적으로 저장되었습니다.");
      }
    } catch (error) {
      console.error("PDF 저장 실패:", error);
      alert("PDF 저장에 실패했습니다: " + error.message);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content history-popup" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <div className="header-left">
            <h2>입력 목록</h2>
            <div className="tab-container-inline">
              <button
                className={`tab-button-inline ${activeTab === "수입" ? "active" : ""}`}
                onClick={() => setActiveTab("수입")}
              >
                수입
              </button>
              <button
                className={`tab-button-inline ${activeTab === "지출" ? "active" : ""}`}
                onClick={() => setActiveTab("지출")}
              >
                지출
              </button>
            </div>
          </div>
          <div className="header-right">
            {records.length > 0 && (
              <button className="pdf-save-button" onClick={handleSavePDF}>
                PDF 저장
              </button>
            )}
            <button className="close-button" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-row">
            <div className="filter-group">
              <label>시작 날짜</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onKeyDown={(e) => {
                  // 키보드 입력 차단 (화살표 키, Tab, Enter는 허용)
                  if (e.key !== 'Tab' && e.key !== 'Enter' && !e.key.startsWith('Arrow')) {
                    e.preventDefault();
                  }
                }}
                className="date-input-styled"
              />
            </div>
            <div className="filter-group">
              <label>종료 날짜</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onKeyDown={(e) => {
                  // 키보드 입력 차단 (화살표 키, Tab, Enter는 허용)
                  if (e.key !== 'Tab' && e.key !== 'Enter' && !e.key.startsWith('Arrow')) {
                    e.preventDefault();
                  }
                }}
                className="date-input-styled"
              />
            </div>
            <button className="refresh-button" onClick={loadRecords}>
              조회
            </button>
          </div>
        </div>

        <div className="records-section-history">
          {loading ? (
            <div className="loading">로딩 중...</div>
          ) : records.length === 0 ? (
            <div className="empty-state">등록된 기록이 없습니다.</div>
          ) : (
            <table className="records-table-history">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>항</th>
                  <th>목</th>
                  {activeTab === "수입" && <th>이름1</th>}
                  {activeTab === "수입" && <th>이름2</th>}
                  <th>금액</th>
                  <th>메모</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // 항, 목 순서로 정렬된 데이터 생성
                  const sortedRecords = [...records].sort((a, b) => {
                    if (a.main_category !== b.main_category) {
                      return a.main_category.localeCompare(b.main_category);
                    }
                    if ((a.sub_category || "") !== (b.sub_category || "")) {
                      return (a.sub_category || "").localeCompare(b.sub_category || "");
                    }
                    return new Date(a.date) - new Date(b.date);
                  });

                  const rows = [];
                  let prevMainCategory = null;
                  let prevSubCategory = null;
                  let currentSubCategoryTotal = 0;
                  let currentSubCategoryCount = 0;

                  sortedRecords.forEach((record, index) => {
                    const isFirstInGroup = prevMainCategory !== record.main_category || prevSubCategory !== (record.sub_category || "");
                    
                    // 목이 바뀌면 이전 목의 소계 추가
                    if (isFirstInGroup && prevSubCategory !== null) {
                      const colspan = activeTab === "수입" ? 5 : 3;
                      rows.push(
                        <tr key={`subtotal-${prevSubCategory}-${index}`} className="subtotal-row">
                          <td colSpan={colspan} style={{ textAlign: "right", fontWeight: "bold", paddingRight: "20px" }}>
                            소계: {formatCurrency(currentSubCategoryTotal)}원 / 입력 건수: {currentSubCategoryCount}건
                          </td>
                          <td style={{ textAlign: "right", fontWeight: "bold" }}>{formatCurrency(currentSubCategoryTotal)}원</td>
                          <td></td>
                        </tr>
                      );
                      currentSubCategoryTotal = 0;
                      currentSubCategoryCount = 0;
                    }

                    // 현재 행 추가
                    rows.push(
                      <tr key={record.id} onDoubleClick={() => handleEdit(record)}>
                        <td>{formatDate(record.date)}</td>
                        <td>{isFirstInGroup ? record.main_category : ""}</td>
                        <td>{isFirstInGroup ? (record.sub_category || "-") : ""}</td>
                        {activeTab === "수입" && <td>{record.name1}</td>}
                        {activeTab === "수입" && <td>{record.name2 || "-"}</td>}
                        <td>{formatCurrency(record.amount)}원</td>
                        <td>{record.memo || "-"}</td>
                      </tr>
                    );

                    // 소계 계산
                    if (isFirstInGroup) {
                      currentSubCategoryTotal = record.amount;
                      currentSubCategoryCount = 1;
                    } else {
                      currentSubCategoryTotal += record.amount;
                      currentSubCategoryCount += 1;
                    }

                    prevMainCategory = record.main_category;
                    prevSubCategory = record.sub_category || "";
                  });

                  // 마지막 목의 소계 추가
                  if (sortedRecords.length > 0) {
                    const colspan = activeTab === "수입" ? 5 : 3;
                    rows.push(
                      <tr key="subtotal-final" className="subtotal-row">
                        <td colSpan={colspan} style={{ textAlign: "right", fontWeight: "bold", paddingRight: "20px" }}>
                          소계: {formatCurrency(currentSubCategoryTotal)}원 / 입력 건수: {currentSubCategoryCount}건
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "bold" }}>{formatCurrency(currentSubCategoryTotal)}원</td>
                        <td></td>
                      </tr>
                    );
                  }

                  // 총합계 계산
                  const grandTotal = sortedRecords.reduce((sum, record) => sum + record.amount, 0);
                  const grandTotalCount = sortedRecords.length;

                  // 총합계 행 추가
                  if (sortedRecords.length > 0) {
                    const colspan = activeTab === "수입" ? 5 : 3;
                    rows.push(
                      <tr key="grand-total" className="grand-total-row">
                        <td colSpan={colspan} style={{ textAlign: "right", fontWeight: "bold", paddingRight: "20px", fontSize: "11pt" }}>
                          총합계: {formatCurrency(grandTotal)}원 / 총 건수: {grandTotalCount}건
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "bold", fontSize: "11pt" }}>{formatCurrency(grandTotal)}원</td>
                        <td></td>
                      </tr>
                    );
                  }

                  return rows;
                })()}
              </tbody>
            </table>
          )}
        </div>

        {editingRecord && (
          <FinanceEditPopup
            record={editingRecord}
            type={activeTab}
            onClose={() => {
              setEditingRecord(null);
              loadRecords();
            }}
          />
        )}
      </div>
    </div>
  );
}

// 수정 팝업 컴포넌트 (FinanceInputPopup에서 가져옴)
function FinanceEditPopup({ record, type, onClose }) {
  const [date, setDate] = useState(record.date);
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState(record.main_category);
  const [selectedSubCategory, setSelectedSubCategory] = useState(record.sub_category);
  const [isAnonymous, setIsAnonymous] = useState(type === "수입" && record.name1 === "무명");
  const [name1, setName1] = useState(type === "수입" ? record.name1 : "");
  const [name2, setName2] = useState(type === "수입" ? (record.name2 || "") : "");
  const [amount, setAmount] = useState(record.amount.toString());
  const [memo, setMemo] = useState(record.memo || "");

  useEffect(() => {
    loadMainCategories();
  }, []);

  useEffect(() => {
    if (selectedMainCategory) {
      loadSubCategories();
    }
  }, [selectedMainCategory]);

  const loadMainCategories = async () => {
    try {
      const result = await window.electronAPI.category.getMainCategories(type);
      if (result.success) {
        setMainCategories(result.data.map(cat => cat.main_category));
      }
    } catch (error) {
      console.error("항 로드 실패:", error);
    }
  };

  const loadSubCategories = async () => {
    if (!selectedMainCategory) return;
    try {
      const result = await window.electronAPI.category.getSubCategories(
        type,
        selectedMainCategory
      );
      if (result.success) {
        setSubCategories(result.data.map(cat => cat.sub_category).filter(Boolean));
      }
    } catch (error) {
      console.error("목 로드 실패:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedMainCategory || !selectedSubCategory) {
      alert("항와 목을 선택해주세요.");
      return;
    }
    if (type === "수입" && !isAnonymous && !name1.trim()) {
      alert("이름1을 입력하거나 무명을 체크해주세요.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert("금액을 입력해주세요.");
      return;
    }

    try {
      const data = {
        date,
        main_category: selectedMainCategory,
        sub_category: selectedSubCategory,
        amount: parseInt(amount),
        memo: memo.trim() || null,
      };

      if (type === "수입") {
        data.name1 = isAnonymous ? "무명" : name1.trim();
        data.name2 = isAnonymous ? null : (name2.trim() || null);
        const result = await window.electronAPI.finance.updateIncome(record.id, data);
        if (result.success) {
          onClose();
        } else {
          alert(result.error || "수정에 실패했습니다.");
        }
      } else {
        const result = await window.electronAPI.finance.updateExpense(record.id, data);
        if (result.success) {
          onClose();
        } else {
          alert(result.error || "수정에 실패했습니다.");
        }
      }
    } catch (error) {
      console.error("수정 실패:", error);
      alert("수정에 실패했습니다.");
    }
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content edit-popup" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h2>재정 수정</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="finance-form">
          <div className="form-row">
            <div className="form-group">
              <label>날짜</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onKeyDown={(e) => {
                  // 키보드 입력 차단 (화살표 키, Tab, Enter는 허용)
                  if (e.key !== 'Tab' && e.key !== 'Enter' && !e.key.startsWith('Arrow')) {
                    e.preventDefault();
                  }
                }}
                className="date-input-styled"
                required
              />
            </div>

            <div className="form-group">
              <label>항</label>
              <select
                value={selectedMainCategory}
                onChange={(e) => {
                  setSelectedMainCategory(e.target.value);
                  setSelectedSubCategory("");
                }}
                required
              >
                <option value="">선택하세요</option>
                {mainCategories.map((cat, index) => (
                  <option key={index} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>목</label>
              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                required
                disabled={!selectedMainCategory}
              >
                <option value="">선택하세요</option>
                {subCategories.map((cat, index) => (
                  <option key={index} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {type === "수입" && (
            <div className="form-row">
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => {
                      setIsAnonymous(e.target.checked);
                      if (e.target.checked) {
                        setName1("");
                        setName2("");
                      }
                    }}
                  />
                  무명
                </label>
              </div>
              <div className="form-group">
                <label>이름1 {!isAnonymous && <span className="required">*</span>}</label>
                <input
                  type="text"
                  value={name1}
                  onChange={(e) => setName1(e.target.value)}
                  disabled={isAnonymous}
                  required={!isAnonymous}
                />
              </div>
              <div className="form-group">
                <label>이름2</label>
                <input
                  type="text"
                  value={name2}
                  onChange={(e) => setName2(e.target.value)}
                  disabled={isAnonymous}
                />
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>금액 <span className="required">*</span></label>
              <input
                type="text"
                value={formatCurrency(amount)}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "");
                  setAmount(value);
                }}
                required
                className="amount-input"
              />
            </div>
            <div className="form-group full-width">
              <label>메모</label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-button">
              수정
            </button>
            <button type="button" className="cancel-button" onClick={onClose}>
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FinanceHistoryPopup;
