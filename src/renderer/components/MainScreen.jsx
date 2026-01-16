import React, { useState } from 'react';
import CategoryManagementPopup from './CategoryManagementPopup';
import FinanceInputPopup from './FinanceInputPopup';
import FinanceHistoryPopup from './FinanceHistoryPopup';
import WeeklyReportPopup from './WeeklyReportPopup';
import YearlyReportPopup from './YearlyReportPopup';
import PersonSearchPopup from './PersonSearchPopup';
import longLogo from '../image/long_logo.jpg';

function MainScreen() {
  const [isCategoryPopupOpen, setIsCategoryPopupOpen] = useState(false);
  const [isFinancePopupOpen, setIsFinancePopupOpen] = useState(false);
  const [isHistoryPopupOpen, setIsHistoryPopupOpen] = useState(false);
  const [isWeeklyReportOpen, setIsWeeklyReportOpen] = useState(false);
  const [isYearlyReportOpen, setIsYearlyReportOpen] = useState(false);
  const [isPersonSearchOpen, setIsPersonSearchOpen] = useState(false);

  const handleButtonClick = (buttonName) => {
    if (buttonName === '항목 관리') {
      setIsCategoryPopupOpen(true);
    } else if (buttonName === '재정 입력') {
      setIsFinancePopupOpen(true);
    } else if (buttonName === '입력 확인') {
      setIsHistoryPopupOpen(true);
    } else if (buttonName === '주간 보고서') {
      setIsWeeklyReportOpen(true);
    } else if (buttonName === '연간 보고서') {
      setIsYearlyReportOpen(true);
    } else if (buttonName === '인물 검색') {
      setIsPersonSearchOpen(true);
    } else {
      console.log(`${buttonName} 버튼이 클릭되었습니다.`);
      // 추후 각 기능 구현 예정
    }
  };

  return (
    <div className="main-screen">
      <div className="logo-top-section">
        <img 
          src={longLogo} 
          alt="로고" 
          className="main-logo-full"
        />
      </div>
      <div className="button-container">
        <button 
          className="menu-button"
          onClick={() => handleButtonClick('재정 입력')}
        >
          재정 입력
        </button>
        <button 
          className="menu-button"
          onClick={() => handleButtonClick('입력 확인')}
        >
          입력 확인
        </button>
        <button 
          className="menu-button"
          onClick={() => handleButtonClick('주간 보고서')}
        >
          주간 보고서
        </button>
        <button 
          className="menu-button"
          onClick={() => handleButtonClick('연간 보고서')}
        >
          연간 보고서
        </button>
        <button 
          className="menu-button"
          onClick={() => handleButtonClick('인물 검색')}
        >
          인물 검색
        </button>
        <button 
          className="menu-button"
          onClick={() => handleButtonClick('항목 관리')}
        >
          항목 관리
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
    </div>
  );
}

export default MainScreen;
