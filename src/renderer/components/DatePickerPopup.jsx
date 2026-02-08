import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import "./DatePickerPopup.css";

function DatePickerPopup({ isOpen, onClose, currentDate, onConfirm }) {
  const [selectedDate, setSelectedDate] = useState(currentDate || new Date().toISOString().split("T")[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  useEffect(() => {
    if (isOpen && currentDate) {
      setSelectedDate(currentDate);
      setCurrentMonth(new Date(currentDate));
    }
  }, [isOpen, currentDate]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedDate);
    onClose();
  };

  const handleCancel = () => {
    setSelectedDate(currentDate || new Date().toISOString().split("T")[0]);
    onClose();
  };

  const handleDateClick = (day) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

    // 빈 칸 추가 (첫 날짜 전)
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // 날짜 추가
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    return (
      <div className="calendar-container">
        <div className="calendar-header">
          <button className="calendar-nav-button" onClick={prevMonth}>‹</button>
          <div className="calendar-month-year">
            {year}년 {month + 1}월
          </div>
          <button className="calendar-nav-button" onClick={nextMonth}>›</button>
        </div>
        <div className="calendar-weekdays">
          {weekDays.map((day, index) => (
            <div key={index} className="calendar-weekday">{day}</div>
          ))}
        </div>
        <div className="calendar-days">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={index} className="calendar-day empty"></div>;
            }
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === new Date().toISOString().split("T")[0];
            
            return (
              <div
                key={index}
                className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => handleDateClick(day)}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const popupContent = (
    <div className="date-picker-overlay" onClick={handleCancel}>
      <div className="date-picker-popup" onClick={(e) => e.stopPropagation()}>
        <div className="date-picker-header">
          <h3>날짜 선택</h3>
          <button className="date-picker-close" onClick={handleCancel}>×</button>
        </div>
        <div className="date-picker-body">
          {renderCalendar()}
        </div>
        <div className="date-picker-footer">
          <div className="selected-date-display">
            선택된 날짜: {selectedDate}
          </div>
          <div className="date-picker-buttons">
            <button className="date-picker-button cancel" onClick={handleCancel}>
              취소
            </button>
            <button className="date-picker-button confirm" onClick={handleConfirm}>
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(popupContent, document.body);
}

export default DatePickerPopup;
