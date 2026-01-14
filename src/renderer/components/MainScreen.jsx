import React, { useState } from 'react';
import CategoryManagementPopup from './CategoryManagementPopup';
import FinanceInputPopup from './FinanceInputPopup';
import FinanceHistoryPopup from './FinanceHistoryPopup';

function MainScreen() {
  const [isCategoryPopupOpen, setIsCategoryPopupOpen] = useState(false);
  const [isFinancePopupOpen, setIsFinancePopupOpen] = useState(false);
  const [isHistoryPopupOpen, setIsHistoryPopupOpen] = useState(false);

  const handleButtonClick = (buttonName) => {
    if (buttonName === '항목 관리') {
      setIsCategoryPopupOpen(true);
    } else if (buttonName === '재정 입력') {
      setIsFinancePopupOpen(true);
    } else if (buttonName === '입력 내역 확인') {
      setIsHistoryPopupOpen(true);
    } else {
      console.log(`${buttonName} 버튼이 클릭되었습니다.`);
      // 추후 각 기능 구현 예정
    }
  };

  return (
    <div className="main-screen">
      <h1 className="title">재정 입력 & 관리 프로그램</h1>
      <div className="button-container">
        <button 
          className="menu-button"
          onClick={() => handleButtonClick('재정 입력')}
        >
          재정 입력
        </button>
        <button 
          className="menu-button"
          onClick={() => handleButtonClick('항목 관리')}
        >
          항목 관리
        </button>
        <button 
          className="menu-button"
          onClick={() => handleButtonClick('입력 내역 확인')}
        >
          입력 내역 확인
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
    </div>
  );
}

export default MainScreen;
