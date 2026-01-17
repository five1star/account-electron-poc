import React, { useState, useEffect } from "react";
import "./FinanceHistoryPopup.css";
import "./FinanceInputPopup.css";
import { formatCurrency } from "../utils/formatCurrency";

function PersonSearchPopup({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("개인 검색"); // "개인 검색" 또는 "인물 종합"
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchName, setSearchName] = useState("");
  const [records, setRecords] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [isDetailed, setIsDetailed] = useState(true);
  const [sortColumn, setSortColumn] = useState(null); // "name" 또는 "total"
  const [sortDirection, setSortDirection] = useState("asc"); // "asc" 또는 "desc"
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === "인물 종합" && startDate && endDate) {
      loadSummaryData();
    }
  }, [isOpen, activeTab, startDate, endDate, isDetailed]);

  const handleSearch = async () => {
    if (!searchName.trim()) {
      alert("이름을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const filters = { 
        startDate, 
        endDate,
        name1: searchName.trim()
      };
      const result = await window.electronAPI.finance.getIncomeList(filters);
      if (result.success) {
        setRecords(result.data);
      }
    } catch (error) {
      console.error("검색 실패:", error);
      alert("검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadSummaryData = async () => {
    setLoading(true);
    try {
      const filters = { 
        startDate, 
        endDate
      };
      const result = await window.electronAPI.finance.getIncomeList(filters);
      if (result.success) {
        const grouped = {};
        
        if (isDetailed) {
          // 상세 모드: 이름별로 그룹화하고, 대분류/하위항목별로 집계
          result.data.forEach((record) => {
            const name = record.name1 || "(미분류)";
            const key = `${name}|||${record.main_category}|||${record.sub_category || "(미분류)"}`;
            
            if (!grouped[key]) {
              grouped[key] = {
                name: name,
                main_category: record.main_category,
                sub_category: record.sub_category || "(미분류)",
                total: 0,
                count: 0
              };
            }
            grouped[key].total += record.amount;
            grouped[key].count += 1;
          });
          
          // 배열로 변환
          const summary = Object.values(grouped);
          
          // 정렬 적용
          if (!sortColumn) {
            summary.sort((a, b) => {
              if (a.name !== b.name) {
                return a.name.localeCompare(b.name);
              }
              if (a.main_category !== b.main_category) {
                return a.main_category.localeCompare(b.main_category);
              }
              return b.total - a.total;
            });
          } else {
            summary.sort((a, b) => {
              if (sortColumn === "name") {
                const result = a.name.localeCompare(b.name);
                return sortDirection === "asc" ? result : -result;
              } else if (sortColumn === "total") {
                const result = a.total - b.total;
                return sortDirection === "asc" ? result : -result;
              }
              return 0;
            });
          }
          
          setSummaryData(summary);
        } else {
          // 간단 모드: 이름별로만 집계
          result.data.forEach((record) => {
            const name = record.name1 || "(미분류)";
            
            if (!grouped[name]) {
              grouped[name] = {
                name: name,
                total: 0,
                count: 0
              };
            }
            grouped[name].total += record.amount;
            grouped[name].count += 1;
          });
          
          // 배열로 변환
          const summary = Object.values(grouped);
          
          // 정렬 적용
          if (!sortColumn) {
            summary.sort((a, b) => {
              return a.name.localeCompare(b.name);
            });
          } else {
            summary.sort((a, b) => {
              if (sortColumn === "name") {
                const result = a.name.localeCompare(b.name);
                return sortDirection === "asc" ? result : -result;
              } else if (sortColumn === "total") {
                const result = a.total - b.total;
                return sortDirection === "asc" ? result : -result;
              }
              return 0;
            });
          }
          
          setSummaryData(summary);
        }
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
      alert("데이터를 불러오는데 실패했습니다.");
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


  const applySorting = (data) => {
    if (!sortColumn) {
      // 기본 정렬: 이름별, 대분류별
      if (isDetailed) {
        data.sort((a, b) => {
          if (a.name !== b.name) {
            return a.name.localeCompare(b.name);
          }
          if (a.main_category !== b.main_category) {
            return a.main_category.localeCompare(b.main_category);
          }
          return b.total - a.total;
        });
      } else {
        data.sort((a, b) => {
          return a.name.localeCompare(b.name);
        });
      }
      return;
    }

    data.sort((a, b) => {
      if (sortColumn === "name") {
        const result = a.name.localeCompare(b.name);
        return sortDirection === "asc" ? result : -result;
      } else if (sortColumn === "total") {
        const result = a.total - b.total;
        return sortDirection === "asc" ? result : -result;
      }
      return 0;
    });
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      // 같은 컬럼 클릭 시 정렬 방향 토글
      const newDirection = sortDirection === "asc" ? "desc" : "asc";
      setSortDirection(newDirection);
      
      // 즉시 정렬 적용
      const sorted = [...summaryData];
      sorted.sort((a, b) => {
        if (column === "name") {
          const result = a.name.localeCompare(b.name);
          return newDirection === "asc" ? result : -result;
        } else if (column === "total") {
          const result = a.total - b.total;
          return newDirection === "asc" ? result : -result;
        }
        return 0;
      });
      setSummaryData(sorted);
    } else {
      // 다른 컬럼 클릭 시 해당 컬럼으로 정렬 (기본 오름차순)
      setSortColumn(column);
      setSortDirection("asc");
      
      // 즉시 정렬 적용
      const sorted = [...summaryData];
      sorted.sort((a, b) => {
        if (column === "name") {
          return a.name.localeCompare(b.name);
        } else if (column === "total") {
          return a.total - b.total;
        }
        return 0;
      });
      setSummaryData(sorted);
    }
  };

  const handleSaveCSV = async () => {
    if (summaryData.length === 0) {
      alert("저장할 데이터가 없습니다.");
      return;
    }

    try {
      // 날짜 범위 문자열 생성
      const dateRange = `${formatDate(startDate)}_${formatDate(endDate)}`;
      const defaultFileName = `인물종합_${dateRange}.csv`;

      // CSV 헤더 생성
      const headers = ["이름"];
      if (isDetailed) {
        headers.push("대분류", "하위 항목");
      }
      headers.push("총액", "건수");

      // CSV 데이터 생성
      const csvRows = [headers.join(",")];
      
      summaryData.forEach((item) => {
        const row = [];
        row.push(`"${item.name}"`);
        if (isDetailed) {
          row.push(`"${item.main_category}"`);
          row.push(`"${item.sub_category}"`);
        }
        row.push(item.total); // CSV에서는 쉼표 없이 숫자만 저장
        row.push(item.count);
        csvRows.push(row.join(","));
      });

      // CSV 내용 생성 (UTF-8 BOM 추가하여 Excel에서 한글 깨짐 방지)
      const csvContent = "\uFEFF" + csvRows.join("\n");

      // UTF-8로 인코딩
      const encoder = new TextEncoder();
      const csvBuffer = encoder.encode(csvContent);
      const fileData = Array.from(csvBuffer);

      // 파일 저장 다이얼로그를 통해 저장
      const saveResult = await window.electronAPI.saveFile(defaultFileName, [
        { name: "CSV Files", extensions: ["csv"] },
        { name: "All Files", extensions: ["*"] },
      ], fileData);

      if (!saveResult.canceled) {
        alert("CSV 파일이 성공적으로 저장되었습니다.");
      }
    } catch (error) {
      console.error("CSV 저장 실패:", error);
      alert("CSV 저장에 실패했습니다: " + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content history-popup" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <div className="header-left">
            <h2>인물 검색</h2>
            <div className="tab-container-inline">
              <button
                className={`tab-button-inline ${activeTab === "개인 검색" ? "active" : ""}`}
                onClick={() => setActiveTab("개인 검색")}
              >
                개인 검색
              </button>
              <button
                className={`tab-button-inline ${activeTab === "인물 종합" ? "active" : ""}`}
                onClick={() => setActiveTab("인물 종합")}
              >
                인물 종합
              </button>
            </div>
          </div>
          <div className="header-right">
            {activeTab === "인물 종합" && summaryData.length > 0 && (
              <button className="csv-save-button" onClick={handleSaveCSV}>
                CSV 저장
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
                  if (e.key !== 'Tab' && e.key !== 'Enter' && !e.key.startsWith('Arrow')) {
                    e.preventDefault();
                  }
                }}
                className="date-input-styled"
              />
            </div>
            {activeTab === "인물 종합" && (
              <div className="filter-group">
                <label>
                  <input
                    type="checkbox"
                    checked={isDetailed}
                    onChange={(e) => setIsDetailed(e.target.checked)}
                    style={{ marginRight: "0.5rem" }}
                  />
                  상세
                </label>
              </div>
            )}
            {activeTab === "개인 검색" && (
              <div className="filter-group">
                <label>이름</label>
                <div className="name-search-group">
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                      }
                    }}
                    placeholder="이름 입력"
                    className="name-input"
                  />
                  <button className="search-button" onClick={handleSearch}>
                    검색
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="records-section-history">
          {loading ? (
            <div className="loading">로딩 중...</div>
          ) : activeTab === "개인 검색" ? (
            records.length === 0 ? (
              <div className="empty-state">
                {searchName ? "검색 결과가 없습니다." : "이름을 입력하고 검색해주세요."}
              </div>
            ) : (
              <table className="records-table-history">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>대분류</th>
                    <th>하위 항목</th>
                    <th>이름1</th>
                    <th>이름2</th>
                    <th>금액</th>
                    <th>메모</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>{formatDate(record.date)}</td>
                      <td>{record.main_category}</td>
                      <td>{record.sub_category || "-"}</td>
                      <td>{record.name1 || "-"}</td>
                      <td>{record.name2 || "-"}</td>
                      <td>{formatCurrency(record.amount)}원</td>
                      <td>{record.memo || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            summaryData.length === 0 ? (
              <div className="empty-state">등록된 기록이 없습니다.</div>
            ) : (
              <table className="records-table-history">
                <thead>
                  <tr>
                    <th>
                      이름
                      <button 
                        className="sort-button"
                        onClick={() => handleSort("name")}
                        title="정렬"
                      >
                        {sortColumn === "name" ? (sortDirection === "asc" ? "↑" : "↓") : "⇅"}
                      </button>
                    </th>
                    {isDetailed && <th>대분류</th>}
                    {isDetailed && <th>하위 항목</th>}
                    <th>
                      총액
                      <button 
                        className="sort-button"
                        onClick={() => handleSort("total")}
                        title="정렬"
                      >
                        {sortColumn === "total" ? (sortDirection === "asc" ? "↑" : "↓") : "⇅"}
                      </button>
                    </th>
                    <th>건수</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      {isDetailed && <td>{item.main_category}</td>}
                      {isDetailed && <td>{item.sub_category}</td>}
                      <td>{formatCurrency(item.total)}원</td>
                      <td>{item.count}건</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default PersonSearchPopup;
