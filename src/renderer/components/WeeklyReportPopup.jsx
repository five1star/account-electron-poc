import React, { useState, useEffect } from "react";
import "./FinanceHistoryPopup.css";
import "./FinanceInputPopup.css";
import { formatCurrency } from "../utils/formatCurrency";

function WeeklyReportPopup({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("수입"); // "수입" 또는 "지출"
  const [selectedSunday, setSelectedSunday] = useState("");
  const [records, setRecords] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentLines, setPaymentLines] = useState([]);
  const [summaryTotals, setSummaryTotals] = useState({
    carryOver: 0,      // 이월금액
    incomeTotal: 0,    // 수입금액
    expenseTotal: 0,  // 지출금액
    difference: 0,     // 차액
    closingBalance: 0  // 마감잔액 (차액 + 이월금액)
  });
  const [cumulativeData, setCumulativeData] = useState({}); // 누계 데이터

  useEffect(() => {
    if (isOpen) {
      loadPaymentLines();
      if (selectedSunday) {
        loadRecords();
      }
    }
  }, [isOpen, activeTab, selectedSunday]);

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

  // 일요일인지 확인하는 함수
  const isSunday = (dateString) => {
    const date = new Date(dateString);
    return date.getDay() === 0; // 0은 일요일
  };

  // 가장 가까운 일요일 찾기
  const getNearestSunday = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDay();
    const diff = day === 0 ? 0 : 7 - day; // 일요일이면 0, 아니면 다음 일요일까지의 차이
    const sunday = new Date(date);
    sunday.setDate(date.getDate() + diff);
    return sunday.toISOString().split("T")[0];
  };

  // 일요일로부터 월요일(day - 6)과 일요일 날짜 계산
  const calculateWeekRange = (sundayDateString) => {
    const sunday = new Date(sundayDateString);
    const monday = new Date(sunday);
    monday.setDate(sunday.getDate() - 6);
    
    return {
      startDate: monday.toISOString().split("T")[0],
      endDate: sunday.toISOString().split("T")[0]
    };
  };

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    
    if (!selectedDate) {
      setSelectedSunday("");
      setStartDate("");
      setEndDate("");
      setRecords([]);
      return;
    }

    if (!isSunday(selectedDate)) {
      const nearestSunday = getNearestSunday(selectedDate);
      alert(`일요일만 선택 가능합니다. 가장 가까운 일요일(${formatDate(nearestSunday)})로 설정합니다.`);
      setSelectedSunday(nearestSunday);
      const range = calculateWeekRange(nearestSunday);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    } else {
      setSelectedSunday(selectedDate);
      const range = calculateWeekRange(selectedDate);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    }
  };

  const loadRecords = async () => {
    if (!selectedSunday) return;
    
    setLoading(true);
    try {
      const currentYear = new Date(startDate).getFullYear();
      const yearStartDate = `${currentYear}-01-01`;
      
      // 전날 날짜 계산 (시간대 문제 방지를 위해 문자열 직접 파싱)
      const [year, month, day] = startDate.split('-').map(Number);
      const dayBeforeStartDate = new Date(year, month - 1, day - 1);
      const dayBeforeStartStr = `${dayBeforeStartDate.getFullYear()}-${String(dayBeforeStartDate.getMonth() + 1).padStart(2, '0')}-${String(dayBeforeStartDate.getDate()).padStart(2, '0')}`;

      // 기간 내 데이터 조회
      const filters = { startDate, endDate };
      let periodResult;
      if (activeTab === "수입") {
        periodResult = await window.electronAPI.finance.getIncomeList(filters);
      } else {
        periodResult = await window.electronAPI.finance.getExpenseList(filters);
      }

      // 누계 데이터 조회 (해당 연도 1월 1일부터 주간 종료일까지)
      const cumulativeFilters = { startDate: yearStartDate, endDate };
      let cumulativeResult;
      if (activeTab === "수입") {
        cumulativeResult = await window.electronAPI.finance.getIncomeList(cumulativeFilters);
      } else {
        cumulativeResult = await window.electronAPI.finance.getExpenseList(cumulativeFilters);
      }

      // 이월금액 계산을 위한 데이터 조회 (해당 연도 1월 1일부터 전날까지)
      const carryOverFilters = { startDate: yearStartDate, endDate: dayBeforeStartStr };
      const incomeCarryOverResult = await window.electronAPI.finance.getIncomeList(carryOverFilters);
      const expenseCarryOverResult = await window.electronAPI.finance.getExpenseList(carryOverFilters);

      if (periodResult.success && cumulativeResult.success && incomeCarryOverResult.success && expenseCarryOverResult.success) {
        setRecords(periodResult.data);
        
        // 기간 내 항/하위항목별로 그룹화하여 합계 계산
        const grouped = {};
        periodResult.data.forEach((record) => {
          const key = `${record.main_category}|||${record.sub_category || "(미분류)"}`;
          if (!grouped[key]) {
            grouped[key] = {
              main_category: record.main_category,
              sub_category: record.sub_category || "(미분류)",
              total: 0,
              cumulative: 0
            };
          }
          grouped[key].total += record.amount;
        });

        // 누계 데이터 계산
        const cumulativeGrouped = {};
        cumulativeResult.data.forEach((record) => {
          const key = `${record.main_category}|||${record.sub_category || "(미분류)"}`;
          if (!cumulativeGrouped[key]) {
            cumulativeGrouped[key] = 0;
          }
          cumulativeGrouped[key] += record.amount;
        });

        // 누계 데이터를 기간 데이터에 추가
        Object.keys(grouped).forEach((key) => {
          grouped[key].cumulative = cumulativeGrouped[key] || 0;
        });

        // 배열로 변환하고 항별로 그룹화한 후 총액 순으로 정렬
        const summary = Object.values(grouped);
        summary.sort((a, b) => {
          if (a.main_category !== b.main_category) {
            return a.main_category.localeCompare(b.main_category);
          }
          return b.total - a.total;
        });
        setSummaryData(summary);

        // 종합 테이블 데이터 계산
        const incomeCarryOver = incomeCarryOverResult.data.reduce((sum, r) => sum + r.amount, 0);
        const expenseCarryOver = expenseCarryOverResult.data.reduce((sum, r) => sum + r.amount, 0);
        const carryOver = incomeCarryOver - expenseCarryOver;

        // 기간 내 수입/지출 총액 (항상 둘 다 계산)
        const periodIncomeResult = await window.electronAPI.finance.getIncomeList(filters);
        const periodExpenseResult = await window.electronAPI.finance.getExpenseList(filters);
        
        const incomeTotal = periodIncomeResult.success
          ? periodIncomeResult.data.reduce((sum, r) => sum + r.amount, 0)
          : 0;
        const expenseTotal = periodExpenseResult.success
          ? periodExpenseResult.data.reduce((sum, r) => sum + r.amount, 0)
          : 0;

        const difference = incomeTotal - expenseTotal;
        setSummaryTotals({
          carryOver,
          incomeTotal,
          expenseTotal,
          difference,
          closingBalance: difference + carryOver
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
      const dateRange = `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
      
      // 출력 일자 (오늘 날짜)
      const today = new Date();
      const outputDate = formatDate(today.toISOString().split("T")[0]);

      // 기본 파일명 생성
      const defaultFileName = `주간_${activeTab}_보고서_${dateRange.replace(/[~ ]/g, "_")}.pdf`;

      // 결제라인 테이블 생성 (한 행에 가로로 나열)
      const sortedPaymentLines = getSortedPaymentLines();
      const cellWidth = sortedPaymentLines.length > 0 ? `${100 / sortedPaymentLines.length}%` : 'auto';
      const paymentLineLabels = sortedPaymentLines.map((line) => 
        `<td class="approval-label" style="width: ${cellWidth};">${line.name}</td>`
      ).join("");
      const paymentLineSignatures = sortedPaymentLines.map(() => 
        `<td style="height: 60px; width: ${cellWidth};"></td>`
      ).join("");
      const paymentLineTable = `
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tbody>
            <tr>
              ${paymentLineLabels}
            </tr>
            <tr>
              ${paymentLineSignatures}
            </tr>
          </tbody>
        </table>`;

      // 종합 테이블 생성 (좌측)
      const summaryTable = `
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="padding: 10px; background-color: #f5f5f5; font-weight: bold; text-align: center; border: 1px solid #ddd;">이월금액</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${formatCurrency(summaryTotals.carryOver)}원</td>
            </tr>
            <tr>
              <td style="padding: 10px; background-color: #f5f5f5; font-weight: bold; text-align: center; border: 1px solid #ddd;">수입금액</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${formatCurrency(summaryTotals.incomeTotal)}원</td>
            </tr>
            <tr>
              <td style="padding: 10px; background-color: #f5f5f5; font-weight: bold; text-align: center; border: 1px solid #ddd;">지출금액</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${formatCurrency(summaryTotals.expenseTotal)}원</td>
            </tr>
            <tr>
              <td style="padding: 10px; background-color: #f5f5f5; font-weight: bold; text-align: center; border: 1px solid #ddd;">차액</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${formatCurrency(summaryTotals.difference)}원</td>
            </tr>
            <tr>
              <td style="padding: 10px; background-color: #f5f5f5; font-weight: bold; text-align: center; border: 1px solid #ddd;">마감잔액</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #ddd; font-weight: bold;">${formatCurrency(summaryTotals.closingBalance)}원</td>
            </tr>
          </tbody>
        </table>`;

      // HTML 테이블 생성 (항/하위항목/총액/누계) - 항 소계 포함
      let tableRows = "";
      let currentCategory = null;
      let categoryTotal = 0;
      let categoryCumulative = 0;

      summaryData.forEach((item, index) => {
        const isNewCategory = currentCategory === null || currentCategory !== item.main_category;

        if (isNewCategory && currentCategory !== null) {
          // 이전 항의 소계 추가
          tableRows += `
            <tr style="background-color: #f0f0f0; font-weight: bold;">
              <td colspan="2" style="text-align: right;">${currentCategory} 소계</td>
              <td>${formatCurrency(categoryTotal)}원</td>
              <td>${formatCurrency(categoryCumulative)}원</td>
            </tr>`;
          categoryTotal = 0;
          categoryCumulative = 0;
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
            <td>${formatCurrency(item.cumulative)}원</td>
          </tr>`;

        categoryTotal += item.total;
        categoryCumulative += item.cumulative;
      });

      // 마지막 항의 소계 추가
      if (currentCategory !== null) {
        tableRows += `
          <tr style="background-color: #f0f0f0; font-weight: bold;">
            <td colspan="2" style="text-align: right;">${currentCategory} 소계</td>
            <td>${formatCurrency(categoryTotal)}원</td>
            <td>${formatCurrency(categoryCumulative)}원</td>
          </tr>`;
      }

      // 합계 행 추가
      const totalAmount = summaryData.reduce((sum, item) => sum + item.total, 0);
      const cumulativeTotal = summaryData.reduce((sum, item) => sum + item.cumulative, 0);
      const totalRow = `
        <tr style="background-color: #e8f5e9; font-weight: bold;">
          <td colspan="2" style="text-align: right;">합계</td>
          <td>${formatCurrency(totalAmount)}원</td>
          <td>${formatCurrency(cumulativeTotal)}원</td>
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
      margin-bottom: 15px;
      text-align: center;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      font-size: 10pt;
    }
    .info-left {
      text-align: left;
    }
    .info-right {
      text-align: right;
    }
    .top-section {
      display: flex;
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-section {
      flex: 1;
    }
    .payment-line-section {
      flex: 1;
    }
    .approval-table {
      width: 100%;
      border-collapse: collapse;
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
  <h1>주간 ${activeTab === "수입" ? "수입" : "지출"} 보고서</h1>
  <div class="info-row">
    <div class="info-left">검색 기간: ${dateRange}</div>
    <div class="info-right">출력 일자: ${outputDate}</div>
  </div>
  
  <div class="top-section">
    <div class="summary-section">
      ${summaryTable}
    </div>
    <div class="payment-line-section">
      ${paymentLineTable}
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>항</th>
        <th>목</th>
        <th>총액</th>
        <th>누계</th>
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
            <h2>주간 보고서</h2>
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
              <label>주간 선택</label>
              <input
                type="date"
                value={selectedSunday}
                onChange={handleDateChange}
                onKeyDown={(e) => {
                  if (e.key !== 'Tab' && e.key !== 'Enter' && !e.key.startsWith('Arrow')) {
                    e.preventDefault();
                  }
                }}
                className="date-input-styled"
              />
            </div>
            {selectedSunday && (
              <div className="week-range-info">
                <span>
                  {formatDate(startDate)} ~ {formatDate(endDate)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="records-section-history">
          {loading ? (
            <div className="loading">로딩 중...</div>
          ) : !selectedSunday ? (
            <div className="empty-state">주간을 선택해주세요.</div>
          ) : (
            <>
              {/* 종합 테이블 */}
              {summaryData.length > 0 && (
                <table className="summary-totals-table">
                  <tbody>
                    <tr>
                      <td className="summary-label">이월금액</td>
                      <td className="summary-value">{formatCurrency(summaryTotals.carryOver)}원</td>
                      <td className="summary-label">수입금액</td>
                      <td className="summary-value">{formatCurrency(summaryTotals.incomeTotal)}원</td>
                    </tr>
                    <tr>
                      <td className="summary-label">지출금액</td>
                      <td className="summary-value">{formatCurrency(summaryTotals.expenseTotal)}원</td>
                      <td className="summary-label">차액</td>
                      <td className="summary-value">{formatCurrency(summaryTotals.difference)}원</td>
                    </tr>
                    <tr>
                      <td className="summary-label">마감잔액</td>
                      <td className="summary-value" colSpan="3" style={{ fontWeight: "bold" }}>{formatCurrency(summaryTotals.closingBalance)}원</td>
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
                      <th>누계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rows = [];
                      let currentCategory = null;
                      let categoryItems = [];
                      let categoryTotal = 0;
                      let categoryCumulative = 0;

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
                              <td style={{ fontWeight: 600 }}>
                                {formatCurrency(categoryCumulative)}원
                              </td>
                            </tr>
                          );
                          categoryTotal = 0;
                          categoryCumulative = 0;
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
                            <td>{formatCurrency(item.cumulative)}원</td>
                          </tr>
                        );

                        categoryTotal += item.total;
                        categoryCumulative += item.cumulative;
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
                            <td style={{ fontWeight: 600 }}>
                              {formatCurrency(categoryCumulative)}원
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
                          <td style={{ fontWeight: 600 }}>
                            {formatCurrency(summaryData.reduce((sum, item) => sum + item.cumulative, 0))}원
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

export default WeeklyReportPopup;
