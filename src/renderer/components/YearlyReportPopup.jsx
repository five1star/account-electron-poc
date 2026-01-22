import React, { useState, useEffect } from "react";
import "./FinanceHistoryPopup.css";
import "./FinanceInputPopup.css";
import { formatCurrency } from "../utils/formatCurrency";

function YearlyReportPopup({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("수입"); // "수입" 또는 "지출"
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [records, setRecords] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentLines, setPaymentLines] = useState([]);
  const [summaryTotals, setSummaryTotals] = useState({
    incomeTotal: 0,    // 수입금액
    expenseTotal: 0,  // 지출금액
    difference: 0      // 차액
  });

  useEffect(() => {
    if (isOpen) {
      loadPaymentLines();
      // 기본값으로 올해 설정
      const range = calculateYearRange(currentYear);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
      if (selectedYear) {
        loadRecords();
      }
    }
  }, [isOpen]);

  const loadPaymentLines = async () => {
    try {
      const result = await window.electronAPI.paymentLine.getAll();
      if (result.success) {
        setPaymentLines(result.data);
      }
    } catch (error) {
      console.error("결제라인 로드 실패:", error);
    }
  };

  useEffect(() => {
    if (isOpen && selectedYear) {
      loadRecords();
    }
  }, [isOpen, activeTab, selectedYear, startDate, endDate]);

  // 연도 범위 계산 (1월 1일 ~ 12월 31일)
  const calculateYearRange = (year) => {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    };
  };

  const handleYearChange = (year) => {
    if (!year) {
      setSelectedYear("");
      setStartDate("");
      setEndDate("");
      setRecords([]);
      setSummaryData([]);
      return;
    }

    setSelectedYear(year);
    const range = calculateYearRange(year);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const handlePrevYear = () => {
    const year = parseInt(selectedYear) - 1;
    handleYearChange(year.toString());
  };

  const handleNextYear = () => {
    const year = parseInt(selectedYear) + 1;
    handleYearChange(year.toString());
  };

  const loadRecords = async () => {
    if (!selectedYear) return;
    
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
        // 항/하위항목별로 그룹화하여 합계 계산
        const grouped = {};
        result.data.forEach((record) => {
          const key = `${record.main_category}|||${record.sub_category || "(미분류)"}`;
          if (!grouped[key]) {
            grouped[key] = {
              main_category: record.main_category,
              sub_category: record.sub_category || "(미분류)",
              total: 0
            };
          }
          grouped[key].total += record.amount;
        });
        
        // 배열로 변환하고 항별로 그룹화한 후 총액 순으로 정렬
        const summary = Object.values(grouped);
        // 항별로 먼저 정렬, 그 다음 총액 순으로 정렬
        summary.sort((a, b) => {
          if (a.main_category !== b.main_category) {
            return a.main_category.localeCompare(b.main_category);
          }
          return b.total - a.total;
        });
        setSummaryData(summary);

        // 종합 테이블 데이터 계산 (해당 연도 1월 1일부터 12월 31일까지)
        const incomeResult = await window.electronAPI.finance.getIncomeList(filters);
        const expenseResult = await window.electronAPI.finance.getExpenseList(filters);
        
        const incomeTotal = incomeResult.success
          ? incomeResult.data.reduce((sum, r) => sum + r.amount, 0)
          : 0;
        const expenseTotal = expenseResult.success
          ? expenseResult.data.reduce((sum, r) => sum + r.amount, 0)
          : 0;

        setSummaryTotals({
          incomeTotal,
          expenseTotal,
          difference: incomeTotal - expenseTotal
        });
      }
    } catch (error) {
      console.error("기록 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };


  // 결제라인을 정렬하는 함수
  const getSortedPaymentLines = () => {
    return [...paymentLines].sort((a, b) => {
      if (a.order_index !== b.order_index) {
        return a.order_index - b.order_index;
      }
      return a.id - b.id;
    });
  };

  const handleSavePDF = async () => {
    if (summaryData.length === 0) {
      alert("저장할 데이터가 없습니다.");
      return;
    }

    try {
      // 날짜 범위 문자열 생성
      const dateRange = `${startDate} ~ ${endDate}`;

      // 기본 파일명 생성
      const defaultFileName = `연간_${activeTab}_보고서_${selectedYear}.pdf`;

      // 결제라인 테이블 생성 (한 행에 가로로 나열)
      const sortedPaymentLines = getSortedPaymentLines();
      const paymentLineLabels = sortedPaymentLines.map((line) => 
        `<td class="approval-label">${line.name}</td>`
      ).join("");
      const paymentLineSignatures = sortedPaymentLines.map(() => 
        `<td style="height: 60px;"></td>`
      ).join("");
      const paymentLineTableRows = `
        <tr>
          ${paymentLineLabels}
        </tr>
        <tr>
          ${paymentLineSignatures}
        </tr>`;

      // HTML 테이블 생성 (항/하위항목/총액) - 항 소계 포함
      let tableRows = "";
      let currentCategory = null;
      let categoryTotal = 0;

      summaryData.forEach((item, index) => {
        const isNewCategory = currentCategory === null || currentCategory !== item.main_category;

        if (isNewCategory && currentCategory !== null) {
          // 이전 항의 소계 추가
          tableRows += `
            <tr style="background-color: #f0f0f0; font-weight: bold;">
              <td colspan="2" style="text-align: right;">${currentCategory} 소계</td>
              <td>${formatCurrency(categoryTotal)}원</td>
            </tr>`;
          categoryTotal = 0;
        }

        if (isNewCategory) {
          currentCategory = item.main_category;
        }

        // 현재 항의 데이터 행 추가
        tableRows += `
          <tr>
            <td>${item.main_category}</td>
            <td>${item.sub_category}</td>
            <td>${formatCurrency(item.total)}원</td>
          </tr>`;

        categoryTotal += item.total;
      });

      // 마지막 항의 소계 추가
      if (currentCategory !== null) {
        tableRows += `
          <tr style="background-color: #f0f0f0; font-weight: bold;">
            <td colspan="2" style="text-align: right;">${currentCategory} 소계</td>
            <td>${formatCurrency(categoryTotal)}원</td>
          </tr>`;
      }

      // 합계 행 추가
      const totalAmount = summaryData.reduce((sum, item) => sum + item.total, 0);
      const totalRow = `
        <tr style="background-color: #e8f5e9; font-weight: bold;">
          <td colspan="2" style="text-align: right;">합계</td>
          <td>${formatCurrency(totalAmount)}원</td>
        </tr>`;

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
    .approval-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
      margin-bottom: 40px;
    }
    .approval-table td {
      padding: 10px;
      border: 1px solid #ddd;
      text-align: center;
    }
    .approval-label {
      font-weight: bold;
      background-color: #f5f5f5;
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
  </style>
</head>
<body>
  <h1>연간 ${activeTab === "수입" ? "수입" : "지출"} 보고서</h1>
  <p style="text-align: center; font-size: 12pt; margin-bottom: 30px;">(기간 ${dateRange})</p>
  
  <table class="approval-table">
    ${paymentLineTableRows}
  </table>
  
  ${summaryTable}
  
  <table>
    <thead>
      <tr>
        <th>항</th>
        <th>목</th>
        <th>총액</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      ${totalRow}
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

  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content history-popup" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <div className="header-left">
            <h2>연간 보고서</h2>
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
            {summaryData.length > 0 && (
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
              <label>연도 선택</label>
              <div className="year-selector">
                <button 
                  className="year-nav-button" 
                  onClick={handlePrevYear}
                  disabled={!selectedYear}
                >
                  ←
                </button>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={selectedYear}
                  onChange={(e) => {
                    const year = e.target.value;
                    if (year && year.length === 4) {
                      handleYearChange(year);
                    } else if (!year) {
                      handleYearChange("");
                    } else {
                      setSelectedYear(year);
                    }
                  }}
                  className="year-input"
                />
                <button 
                  className="year-nav-button" 
                  onClick={handleNextYear}
                  disabled={!selectedYear}
                >
                  →
                </button>
              </div>
            </div>
            {selectedYear && (
              <div className="week-range-info">
                <span>
                  {startDate} ~ {endDate}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="records-section-history">
          {loading ? (
            <div className="loading">로딩 중...</div>
          ) : !selectedYear ? (
            <div className="empty-state">연도를 선택해주세요.</div>
          ) : (
            <>
              {/* 종합 테이블 */}
              {summaryData.length > 0 && (
                <table className="summary-totals-table">
                  <tbody>
                    <tr>
                      <td className="summary-label">수입금액</td>
                      <td className="summary-value">{formatCurrency(summaryTotals.incomeTotal)}원</td>
                      <td className="summary-label">지출금액</td>
                      <td className="summary-value">{formatCurrency(summaryTotals.expenseTotal)}원</td>
                    </tr>
                    <tr>
                      <td className="summary-label">차액</td>
                      <td className="summary-value" colSpan="3">{formatCurrency(summaryTotals.difference)}원</td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* 내역 정리 테이블 */}
              {summaryData.length === 0 ? (
                <div className="empty-state">등록된 기록이 없습니다.</div>
              ) : (
                <table className="records-table-history">
                  <thead>
                    <tr>
                      <th>항</th>
                      <th>목</th>
                      <th>총액</th>
                    </tr>
                  </thead>
                  <tbody>
                {(() => {
                  const rows = [];
                  let currentCategory = null;
                  let categoryTotal = 0;

                  summaryData.forEach((item, index) => {
                    const isNewCategory = currentCategory === null || currentCategory !== item.main_category;

                    if (isNewCategory && currentCategory !== null) {
                      // 이전 항의 소계 추가
                      rows.push(
                        <tr key={`subtotal-${currentCategory}`} className="subtotal-row">
                          <td colSpan="2" style={{ fontWeight: 600, textAlign: "right" }}>
                            {currentCategory} 소계
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {formatCurrency(categoryTotal)}원
                          </td>
                        </tr>
                      );
                      categoryTotal = 0;
                    }

                    if (isNewCategory) {
                      currentCategory = item.main_category;
                    }

                    // 현재 항의 데이터 행 추가
                    rows.push(
                      <tr 
                        key={index}
                        className={isNewCategory ? "category-group-start" : ""}
                      >
                        <td>{item.main_category}</td>
                        <td>{item.sub_category}</td>
                        <td>{formatCurrency(item.total)}원</td>
                      </tr>
                    );

                    categoryTotal += item.total;
                  });

                  // 마지막 항의 소계 추가
                  if (currentCategory !== null) {
                    rows.push(
                      <tr key={`subtotal-${currentCategory}`} className="subtotal-row">
                        <td colSpan="2" style={{ fontWeight: 600, textAlign: "right" }}>
                          {currentCategory} 소계
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {formatCurrency(categoryTotal)}원
                        </td>
                      </tr>
                    );
                  }

                  // 전체 합계 추가
                  rows.push(
                    <tr key="total" className="total-row">
                      <td colSpan="2" style={{ fontWeight: 600, textAlign: "right" }}>합계</td>
                      <td style={{ fontWeight: 600 }}>
                        {formatCurrency(summaryData.reduce((sum, item) => sum + item.total, 0))}원
                      </td>
                    </tr>
                  );

                  return rows;
                })()}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default YearlyReportPopup;
