import React, { useState, useEffect } from "react";
import CategoryManagementPopup from "./CategoryManagementPopup";
import FinanceInputPopup from "./FinanceInputPopup";
import FinanceHistoryPopup from "./FinanceHistoryPopup";
import WeeklyReportPopup from "./WeeklyReportPopup";
import YearlyReportPopup from "./YearlyReportPopup";
import PersonSearchPopup from "./PersonSearchPopup";
import { formatCurrency } from "../utils/formatCurrency";
import "./FinanceHistoryPopup.css";
import "./MainScreen.css";
import longLogo from "../image/long_logo.png";

function MainScreen() {
  const [isCategoryPopupOpen, setIsCategoryPopupOpen] = useState(false);
  const [isFinancePopupOpen, setIsFinancePopupOpen] = useState(false);
  const [isHistoryPopupOpen, setIsHistoryPopupOpen] = useState(false);
  const [isWeeklyReportOpen, setIsWeeklyReportOpen] = useState(false);
  const [isYearlyReportOpen, setIsYearlyReportOpen] = useState(false);
  const [isPersonSearchOpen, setIsPersonSearchOpen] = useState(false);
  const [isWeeklyDonationCopyOpen, setIsWeeklyDonationCopyOpen] = useState(false);

  const handleButtonClick = (buttonName) => {
    if (buttonName === "항목 관리") {
      setIsCategoryPopupOpen(true);
    } else if (buttonName === "재정 입력") {
      setIsFinancePopupOpen(true);
    } else if (buttonName === "입력 목록") {
      setIsHistoryPopupOpen(true);
    } else if (buttonName === "주간 보고서") {
      setIsWeeklyReportOpen(true);
    } else if (buttonName === "연간 보고서") {
      setIsYearlyReportOpen(true);
    } else if (buttonName === "인물 검색") {
      setIsPersonSearchOpen(true);
    } else {
      console.log(`${buttonName} 버튼이 클릭되었습니다.`);
      // 추후 각 기능 구현 예정
    }
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleCopyWeeklyDonationList = () => {
    setIsWeeklyDonationCopyOpen(true);
  };

  return (
    <div className="main-screen">
      <div className="logo-top-section">
        <img src={longLogo} alt="로고" className="main-logo-full" />
      </div>
      <div className="button-container">
        <button
          className="menu-button"
          onClick={() => handleButtonClick("재정 입력")}
        >
          재정 입력
        </button>
        <button
          className="menu-button"
          onClick={() => handleButtonClick("입력 목록")}
        >
          입력 목록
        </button>
        <button
          className="menu-button"
          onClick={() => handleButtonClick("주간 보고서")}
        >
          주간 보고서
        </button>
        <button
          className="menu-button"
          onClick={() => handleButtonClick("연간 보고서")}
        >
          연간 보고서
        </button>
        <button
          className="menu-button"
          onClick={() => handleButtonClick("인물 검색")}
        >
          인물 검색
        </button>
        <button
          className="menu-button"
          onClick={() => handleButtonClick("항목 관리")}
        >
          항목 관리
        </button>
        <button
          className="menu-button"
          onClick={handleCopyWeeklyDonationList}
        >
          주간 헌금 목록 복사하기
        </button>
      </div>

      <CategoryManagementPopup
        isOpen={isCategoryPopupOpen}
        onClose={() => setIsCategoryPopupOpen(false)}
      />

      <FinanceInputPopup
        isOpen={isFinancePopupOpen}
        onClose={() => setIsFinancePopupOpen(false)}
      />

      <FinanceHistoryPopup
        isOpen={isHistoryPopupOpen}
        onClose={() => setIsHistoryPopupOpen(false)}
      />

      <WeeklyReportPopup
        isOpen={isWeeklyReportOpen}
        onClose={() => setIsWeeklyReportOpen(false)}
      />

      <YearlyReportPopup
        isOpen={isYearlyReportOpen}
        onClose={() => setIsYearlyReportOpen(false)}
      />

      <PersonSearchPopup
        isOpen={isPersonSearchOpen}
        onClose={() => setIsPersonSearchOpen(false)}
      />

      {/* 주간 헌금 목록 복사 팝업 */}
      {isWeeklyDonationCopyOpen && (
        <WeeklyDonationCopyPopup
          isOpen={isWeeklyDonationCopyOpen}
          onClose={() => setIsWeeklyDonationCopyOpen(false)}
        />
      )}
    </div>
  );
}

// 주간 헌금 목록 복사 팝업 컴포넌트
function WeeklyDonationCopyPopup({ isOpen, onClose }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [donationData, setDonationData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && selectedDate) {
      loadDonationData();
    }
  }, [isOpen, selectedDate]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const loadDonationData = async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    setError(null);
    try {
      // 선택한 날짜의 수입 데이터 조회
      const filters = { startDate: selectedDate, endDate: selectedDate };
      const result = await window.electronAPI.finance.getIncomeList(filters);
      
      if (!result.success || result.data.length === 0) {
        setError("해당 날짜에 등록된 헌금 내역이 없습니다.");
        setLoading(false);
        return;
      }

      // 무명 제외하고 목별로 그룹화
      const groupedBySubCategory = {};
      result.data.forEach((record) => {
        // 무명 제외
        if (!record.name1 || record.name1 === "무명") {
          return;
        }

        const subCategory = record.sub_category || "(미분류)";
        if (!groupedBySubCategory[subCategory]) {
          groupedBySubCategory[subCategory] = [];
        }

        // 이름 형식: 이름2가 있으면 이름1(이름2), 없으면 이름1만
        let nameDisplay = record.name1;
        if (record.name2 && record.name2.trim()) {
          nameDisplay = `${record.name1}(${record.name2})`;
        }

        groupedBySubCategory[subCategory].push({
          name1: record.name1,
          name2: record.name2,
          nameDisplay: nameDisplay
        });
      });

      // 목 우선순위 정의
      const categoryPriority = {
        '주일헌금': 1,
        '감사헌금': 2,
        '십일조': 3
      };

      // 이름 우선순위 정의
      const namePriority = {
        '오황동': 1,
        '최경숙': 2,
        '오한별': 3
      };

      // 목별로 이름 중복 제거 및 정렬
      const processedData = {};
      Object.keys(groupedBySubCategory).forEach((subCategory) => {
        const nameSet = new Set();
        groupedBySubCategory[subCategory].forEach((item) => {
          nameSet.add(item.nameDisplay);
        });
        
        // 이름 정렬: 우선순위가 있는 이름 먼저, 그 다음 알파벳 순
        const nameArray = Array.from(nameSet).sort((a, b) => {
          // 이름1 추출 (괄호 앞부분)
          const name1A = a.split('(')[0];
          const name1B = b.split('(')[0];
          
          const priorityA = namePriority[name1A] || 999;
          const priorityB = namePriority[name1B] || 999;
          
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }
          
          // 우선순위가 같으면 알파벳 순
          return a.localeCompare(b);
        });
        
        processedData[subCategory] = nameArray;
      });

      // 목 정렬: 우선순위가 있는 목 먼저, 그 다음 알파벳 순
      const sortedCategories = Object.keys(processedData).sort((a, b) => {
        const priorityA = categoryPriority[a] || 999;
        const priorityB = categoryPriority[b] || 999;
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        // 우선순위가 같으면 알파벳 순
        return a.localeCompare(b);
      });

      // 텍스트 형식으로 포맷팅
      let text = "";
      
      sortedCategories.forEach((subCategory) => {
        text += `[${subCategory}]\n`;
        text += processedData[subCategory].join(", ") + "\n\n";
      });

      setDonationData({
        text: text.trim(),
        processedData,
        sortedCategories
      });
    } catch (error) {
      console.error("헌금 목록 로드 실패:", error);
      setError("헌금 목록을 불러오는데 실패했습니다: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!donationData) return;
    
    try {
      await navigator.clipboard.writeText(donationData.text);
      alert("헌금 목록이 클립보드에 복사되었습니다.");
      onClose();
    } catch (error) {
      console.error("클립보드 복사 실패:", error);
      alert("클립보드 복사에 실패했습니다: " + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content history-popup" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h2>주간 헌금 목록 복사하기</h2>
          <div className="header-right">
            {donationData && (
              <button className="csv-save-button" onClick={handleCopy}>
                클립보드에 복사
              </button>
            )}
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="filter-section">
          <div className="filter-row">
            <div className="filter-group">
              <label>날짜 선택</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Tab' && e.key !== 'Enter' && !e.key.startsWith('Arrow')) {
                    e.preventDefault();
                  }
                }}
                className="weekly-donation-date-input"
              />
            </div>
          </div>
        </div>

        <div className="records-section-history">
          {loading ? (
            <div className="loading">로딩 중...</div>
          ) : error ? (
            <div className="empty-state">{error}</div>
          ) : donationData ? (
            <div style={{ padding: "1rem" }}>
              <div style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "0.875rem", lineHeight: "1.8" }}>
                {donationData.text}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default MainScreen;
