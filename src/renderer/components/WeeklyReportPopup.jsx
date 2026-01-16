import React, { useState, useEffect } from "react";
import "./FinanceHistoryPopup.css";
import "./FinanceInputPopup.css";

function WeeklyReportPopup({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("수입"); // "수입" 또는 "지출"
  const [selectedSunday, setSelectedSunday] = useState("");
  const [records, setRecords] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (isOpen && selectedSunday) {
      loadRecords();
    }
  }, [isOpen, activeTab, selectedSunday]);

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
      const filters = { startDate, endDate };
      let result;
      if (activeTab === "수입") {
        result = await window.electronAPI.finance.getIncomeList(filters);
      } else {
        result = await window.electronAPI.finance.getExpenseList(filters);
      }
      if (result.success) {
        setRecords(result.data);
        // 대분류/하위항목별로 그룹화하여 합계 계산
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
        
        // 배열로 변환하고 대분류별로 그룹화한 후 총액 순으로 정렬
        const summary = Object.values(grouped);
        // 대분류별로 먼저 정렬, 그 다음 총액 순으로 정렬
        summary.sort((a, b) => {
          if (a.main_category !== b.main_category) {
            return a.main_category.localeCompare(b.main_category);
          }
          return b.total - a.total;
        });
        setSummaryData(summary);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

  const handleSavePDF = async () => {
    if (summaryData.length === 0) {
      alert("저장할 데이터가 없습니다.");
      return;
    }

    try {
      // 날짜 범위 문자열 생성
      const dateRange = `${formatDate(startDate)} ~ ${formatDate(endDate)}`;

      // 기본 파일명 생성
      const defaultFileName = `주간_${activeTab}_보고서_${dateRange.replace(/[~ ]/g, "_")}.pdf`;

      // HTML 테이블 생성 (대분류/하위항목/총액)
      const tableRows = summaryData.map((item) => {
        return `
          <tr>
            <td>${item.main_category}</td>
            <td>${item.sub_category}</td>
            <td>${formatCurrency(item.total)}원</td>
          </tr>`;
      }).join("");

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
      width: 50%;
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
  <p style="text-align: center; font-size: 12pt; margin-bottom: 30px;">(기간 ${dateRange})</p>
  
  <table class="approval-table">
    <tr>
      <td class="approval-label">재정부 담당</td>
      <td class="approval-label">당회장</td>
    </tr>
    <tr>
      <td style="height: 60px;"></td>
      <td style="height: 60px;"></td>
    </tr>
  </table>
  
  <table>
    <thead>
      <tr>
        <th>대분류</th>
        <th>하위 항목</th>
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
          ) : summaryData.length === 0 ? (
            <div className="empty-state">등록된 기록이 없습니다.</div>
          ) : (
            <table className="records-table-history">
              <thead>
                <tr>
                  <th>대분류</th>
                  <th>하위 항목</th>
                  <th>총액</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.map((item, index) => {
                  const isNewCategory = index === 0 || summaryData[index - 1].main_category !== item.main_category;
                  return (
                    <tr 
                      key={index}
                      className={isNewCategory ? "category-group-start" : ""}
                    >
                      <td>{item.main_category}</td>
                      <td>{item.sub_category}</td>
                      <td>{formatCurrency(item.total)}원</td>
                    </tr>
                  );
                })}
                <tr className="total-row">
                  <td colSpan="2" style={{ fontWeight: 600, textAlign: "right" }}>합계</td>
                  <td style={{ fontWeight: 600 }}>
                    {formatCurrency(summaryData.reduce((sum, item) => sum + item.total, 0))}원
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default WeeklyReportPopup;
