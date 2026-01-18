import React, { useState, useEffect, useRef } from "react";
import "./FinanceInputPopup.css";
import { formatCurrency } from "../utils/formatCurrency";

function FinanceInputPopup({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("수입"); // "수입" 또는 "지출"
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [records, setRecords] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mainCategoryDailyTotal, setMainCategoryDailyTotal] = useState(0); // 항의 금일 합계
  const [mainCategoryYearlyTotal, setMainCategoryYearlyTotal] = useState(0); // 항의 총합계
  const [subCategoryDailyTotal, setSubCategoryDailyTotal] = useState(0); // 목의 금일 합계
  const [subCategoryYearlyTotal, setSubCategoryYearlyTotal] = useState(0); // 목의 총합계
  const [dailyIncomeTotal, setDailyIncomeTotal] = useState(0); // 금일 수입 총액
  const [dailyExpenseTotal, setDailyExpenseTotal] = useState(0); // 금일 지출 총액
  const [yearlyIncomeTotal, setYearlyIncomeTotal] = useState(0); // 총 수입금액
  const [yearlyExpenseTotal, setYearlyExpenseTotal] = useState(0); // 총 지출금액
  const [previousDayIncomeTotal, setPreviousDayIncomeTotal] = useState(0); // 전일까지 수입 총액
  const [previousDayExpenseTotal, setPreviousDayExpenseTotal] = useState(0); // 전일까지 지출 총액
  const name1InputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadMainCategories();
      loadRecords();
      loadAllTotals();
    }
  }, [isOpen, activeTab, date]);

  useEffect(() => {
    if (selectedMainCategory) {
      loadSubCategories();
    } else {
      setSubCategories([]);
      setSelectedSubCategory("");
    }
  }, [selectedMainCategory, activeTab]);

  useEffect(() => {
    if (selectedMainCategory) {
      loadMainCategoryTotals();
    } else {
      setMainCategoryDailyTotal(0);
      setMainCategoryYearlyTotal(0);
    }
  }, [selectedMainCategory, date, activeTab]);

  useEffect(() => {
    if (selectedMainCategory && selectedSubCategory) {
      loadSubCategoryTotals();
    } else {
      setSubCategoryDailyTotal(0);
      setSubCategoryYearlyTotal(0);
    }
  }, [selectedMainCategory, selectedSubCategory, date, activeTab]);

  const loadMainCategories = async () => {
    try {
      const result = await window.electronAPI.category.getMainCategories(activeTab);
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
        activeTab,
        selectedMainCategory
      );
      if (result.success) {
        setSubCategories(result.data.map(cat => cat.sub_category).filter(Boolean));
      }
    } catch (error) {
      console.error("목 로드 실패:", error);
    }
  };

  const loadRecords = async () => {
    setLoading(true);
    try {
      const filters = { startDate: date, endDate: date };
      let result;
      if (activeTab === "수입") {
        result = await window.electronAPI.finance.getIncomeList(filters);
      } else {
        result = await window.electronAPI.finance.getExpenseList(filters);
      }
      if (result.success) {
        setRecords(result.data);
        // 기록 로드 후 합계도 업데이트
        await loadAllTotals();
        if (selectedMainCategory) {
          await loadMainCategoryTotals();
        }
        if (selectedMainCategory && selectedSubCategory) {
          await loadSubCategoryTotals();
        }
      }
    } catch (error) {
      console.error("기록 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 항의 합계 계산 (해당 항 하위의 모든 목들의 합계)
  const loadMainCategoryTotals = async () => {
    if (!selectedMainCategory) {
      setMainCategoryDailyTotal(0);
      setMainCategoryYearlyTotal(0);
      return;
    }

    try {
      // 금일 합계: 해당 날짜의 항 하위 모든 목들의 합계
      const dailyFilters = { 
        startDate: date, 
        endDate: date,
        main_category: selectedMainCategory
      };
      
      // 총합계: 해당 년도 1월 1일부터 해당 날짜까지의 항 하위 모든 목들의 합계
      const year = new Date(date).getFullYear();
      const yearlyFilters = {
        startDate: `${year}-01-01`,
        endDate: date,
        main_category: selectedMainCategory
      };

      let dailyResult, yearlyResult;
      if (activeTab === "수입") {
        dailyResult = await window.electronAPI.finance.getIncomeList(dailyFilters);
        yearlyResult = await window.electronAPI.finance.getIncomeList(yearlyFilters);
      } else {
        dailyResult = await window.electronAPI.finance.getExpenseList(dailyFilters);
        yearlyResult = await window.electronAPI.finance.getExpenseList(yearlyFilters);
      }

      if (dailyResult.success) {
        const dailySum = dailyResult.data.reduce((sum, record) => sum + record.amount, 0);
        setMainCategoryDailyTotal(dailySum);
      }

      if (yearlyResult.success) {
        const yearlySum = yearlyResult.data.reduce((sum, record) => sum + record.amount, 0);
        setMainCategoryYearlyTotal(yearlySum);
      }
    } catch (error) {
      console.error("항 합계 계산 실패:", error);
    }
  };

  // 모든 합계 계산 (금일 수입/지출, 총 수입/지출, 전일까지 수입/지출)
  const loadAllTotals = async () => {
    try {
      const year = new Date(date).getFullYear();
      const yearStart = `${year}-01-01`;
      
      // 전일 날짜 계산
      const selectedDate = new Date(date);
      selectedDate.setDate(selectedDate.getDate() - 1);
      const previousDate = selectedDate.toISOString().split("T")[0];
      
      // 금일 수입/지출
      const dailyIncomeFilters = { startDate: date, endDate: date };
      const dailyExpenseFilters = { startDate: date, endDate: date };
      
      // 총 수입/지출 (1월 1일부터 선택 날짜까지)
      const yearlyIncomeFilters = { startDate: yearStart, endDate: date };
      const yearlyExpenseFilters = { startDate: yearStart, endDate: date };
      
      // 전일까지 수입/지출 (1월 1일부터 전일까지)
      const previousIncomeFilters = { startDate: yearStart, endDate: previousDate };
      const previousExpenseFilters = { startDate: yearStart, endDate: previousDate };
      
      const [
        dailyIncomeResult,
        dailyExpenseResult,
        yearlyIncomeResult,
        yearlyExpenseResult,
        previousIncomeResult,
        previousExpenseResult
      ] = await Promise.all([
        window.electronAPI.finance.getIncomeList(dailyIncomeFilters),
        window.electronAPI.finance.getExpenseList(dailyExpenseFilters),
        window.electronAPI.finance.getIncomeList(yearlyIncomeFilters),
        window.electronAPI.finance.getExpenseList(yearlyExpenseFilters),
        window.electronAPI.finance.getIncomeList(previousIncomeFilters),
        window.electronAPI.finance.getExpenseList(previousExpenseFilters)
      ]);
      
      if (dailyIncomeResult.success) {
        const total = dailyIncomeResult.data.reduce((sum, record) => sum + record.amount, 0);
        setDailyIncomeTotal(total);
      }
      
      if (dailyExpenseResult.success) {
        const total = dailyExpenseResult.data.reduce((sum, record) => sum + record.amount, 0);
        setDailyExpenseTotal(total);
      }
      
      if (yearlyIncomeResult.success) {
        const total = yearlyIncomeResult.data.reduce((sum, record) => sum + record.amount, 0);
        setYearlyIncomeTotal(total);
      }
      
      if (yearlyExpenseResult.success) {
        const total = yearlyExpenseResult.data.reduce((sum, record) => sum + record.amount, 0);
        setYearlyExpenseTotal(total);
      }
      
      if (previousIncomeResult.success) {
        const total = previousIncomeResult.data.reduce((sum, record) => sum + record.amount, 0);
        setPreviousDayIncomeTotal(total);
      }
      
      if (previousExpenseResult.success) {
        const total = previousExpenseResult.data.reduce((sum, record) => sum + record.amount, 0);
        setPreviousDayExpenseTotal(total);
      }
    } catch (error) {
      console.error("전체 합계 계산 실패:", error);
    }
  };

  // 목의 합계 계산 (해당 목의 합계)
  const loadSubCategoryTotals = async () => {
    if (!selectedMainCategory || !selectedSubCategory) {
      setSubCategoryDailyTotal(0);
      setSubCategoryYearlyTotal(0);
      return;
    }

    try {
      // 금일 합계: 해당 날짜의 목 합계
      const dailyFilters = { 
        startDate: date, 
        endDate: date,
        main_category: selectedMainCategory,
        sub_category: selectedSubCategory
      };
      
      // 총합계: 해당 년도 1월 1일부터 해당 날짜까지의 목 합계
      const year = new Date(date).getFullYear();
      const yearlyFilters = {
        startDate: `${year}-01-01`,
        endDate: date,
        main_category: selectedMainCategory,
        sub_category: selectedSubCategory
      };

      let dailyResult, yearlyResult;
      if (activeTab === "수입") {
        dailyResult = await window.electronAPI.finance.getIncomeList(dailyFilters);
        yearlyResult = await window.electronAPI.finance.getIncomeList(yearlyFilters);
      } else {
        dailyResult = await window.electronAPI.finance.getExpenseList(dailyFilters);
        yearlyResult = await window.electronAPI.finance.getExpenseList(yearlyFilters);
      }

      if (dailyResult.success) {
        const dailySum = dailyResult.data.reduce((sum, record) => sum + record.amount, 0);
        setSubCategoryDailyTotal(dailySum);
      }

      if (yearlyResult.success) {
        const yearlySum = yearlyResult.data.reduce((sum, record) => sum + record.amount, 0);
        setSubCategoryYearlyTotal(yearlySum);
      }
    } catch (error) {
      console.error("목 합계 계산 실패:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 유효성 검사
    if (!selectedMainCategory) {
      alert("항를 선택해주세요.");
      return;
    }
    if (!selectedSubCategory) {
      alert("목을 선택해주세요.");
      return;
    }
    // 수입일 때만 이름1 검증
    if (activeTab === "수입" && !isAnonymous && !name1.trim()) {
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

      if (activeTab === "수입") {
        data.name1 = isAnonymous ? "무명" : name1.trim();
        data.name2 = isAnonymous ? null : (name2.trim() || null);
        const result = await window.electronAPI.finance.addIncome(data);
        if (result.success) {
          resetFormPartial();
          await loadRecords();
          await loadAllTotals();
          // 이름1 필드에 포커스
          setTimeout(() => {
            if (name1InputRef.current) {
              name1InputRef.current.focus();
            }
          }, 100);
        } else {
          alert(result.error || "수입 추가에 실패했습니다.");
        }
      } else {
        const result = await window.electronAPI.finance.addExpense(data);
        if (result.success) {
          resetFormPartial();
          await loadRecords();
          await loadAllTotals();
        } else {
          alert(result.error || "지출 추가에 실패했습니다.");
        }
      }
    } catch (error) {
      console.error("추가 실패:", error);
      alert("추가에 실패했습니다.");
    }
  };

  const resetForm = () => {
    setSelectedMainCategory("");
    setSelectedSubCategory("");
    setIsAnonymous(false);
    setName1("");
    setName2("");
    setAmount("");
    setMemo("");
  };

  const resetFormPartial = () => {
    // 항, 하위항목은 유지
    // 이름 필드만 리셋 (무명 체크 해제)
    setIsAnonymous(false);
    setName1("");
    setName2("");
    setAmount("");
    setMemo("");
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
  };

  const handleDelete = async (id) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      let result;
      if (activeTab === "수입") {
        result = await window.electronAPI.finance.deleteIncome(id);
      } else {
        result = await window.electronAPI.finance.deleteExpense(id);
      }
      if (result.success) {
        await loadRecords();
        await loadAllTotals();
        if (selectedMainCategory) {
          await loadMainCategoryTotals();
        }
        if (selectedMainCategory && selectedSubCategory) {
          await loadSubCategoryTotals();
        }
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제에 실패했습니다.");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };


  // 총계 계산 (수입만)
  const calculateSummary = () => {
    if (activeTab !== "수입") return null;

    const total = records.reduce((sum, record) => sum + record.amount, 0);
    
    // 목별 합계 (모든 항목 포함, sub_category가 없는 경우도 처리)
    const subCategoryTotals = {};
    records.forEach(record => {
      // sub_category가 null이거나 빈 문자열인 경우 처리
      const subCategory = record.sub_category || "(미분류)";
      const key = `${record.main_category} - ${subCategory}`;
      
      if (!subCategoryTotals[key]) {
        subCategoryTotals[key] = {
          main_category: record.main_category,
          sub_category: subCategory,
          amount: 0
        };
      }
      subCategoryTotals[key].amount += record.amount;
    });

    // 모든 항목을 배열로 변환 (입력이 있는 것만, 금액 순으로 정렬)
    const subCategoryList = Object.values(subCategoryTotals)
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount); // 금액이 큰 순서대로 정렬

    return {
      total,
      subCategoryList
    };
  };

  const summary = calculateSummary();

  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content finance-popup" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <div className="header-left">
            <h2>재정 입력</h2>
            <div className="tab-container-inline">
              <button
                className={`tab-button-inline ${activeTab === "수입" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("수입");
                  resetForm();
                }}
              >
                수입
              </button>
              <button
                className={`tab-button-inline ${activeTab === "지출" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("지출");
                  resetForm();
                }}
              >
                지출
              </button>
            </div>
          </div>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="finance-form">
          <div className="form-row">
            <div className="form-group">
              <label>날짜</label>
              <div className="date-input-wrapper">
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
            </div>

            <div className="form-group">
              <label>
                항
                {selectedMainCategory && (
                  <span className="total-info">
                    금일 합계: {formatCurrency(mainCategoryDailyTotal)}원 / 총합계: {formatCurrency(mainCategoryYearlyTotal)}원
                  </span>
                )}
              </label>
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
              <label>
                목
                {selectedMainCategory && selectedSubCategory && (
                  <span className="total-info">
                    금일 합계: {formatCurrency(subCategoryDailyTotal)}원 / 총합계: {formatCurrency(subCategoryYearlyTotal)}원
                  </span>
                )}
              </label>
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

          <div className="form-row-compact">
            {activeTab === "수입" && (
              <>
                <div className="form-group-compact">
                  <label>
                    이름1 {!isAnonymous && <span className="required">*</span>}
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
                      style={{ marginLeft: "0.5rem" }}
                    />
                    <span style={{ marginLeft: "0.25rem", fontWeight: "normal" }}>무명</span>
                  </label>
                  <input
                    ref={name1InputRef}
                    type="text"
                    value={name1}
                    onChange={(e) => setName1(e.target.value)}
                    disabled={isAnonymous}
                    required={!isAnonymous}
                  />
                </div>
                <div className="form-group-compact">
                  <label>이름2</label>
                  <input
                    type="text"
                    value={name2}
                    onChange={(e) => setName2(e.target.value)}
                    disabled={isAnonymous}
                  />
                </div>
              </>
            )}
            <div className="form-group-compact">
              <label>금액 <span className="required">*</span></label>
              <input
                type="text"
                value={amount ? formatCurrency(parseInt(amount.replace(/,/g, ''))) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "");
                  setAmount(value);
                }}
                required
                className="amount-input"
              />
            </div>
          </div>

          <div className="form-row-compact">
            <div className="form-group-compact full-width">
              <label>메모</label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>
            <button type="submit" className="submit-button-inline">
              추가
            </button>
          </div>
        </form>

        <div className="records-section">
          {loading ? (
            <div className="loading">로딩 중...</div>
          ) : records.length === 0 ? (
            <div className="empty-state">등록된 기록이 없습니다.</div>
          ) : (
            <table className="records-table">
              <thead>
                <tr>
                  <th>항</th>
                  <th>목</th>
                  {activeTab === "수입" && <th>이름1</th>}
                  {activeTab === "수입" && <th>이름2</th>}
                  <th>금액</th>
                  <th>메모</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} onClick={() => handleEdit(record)}>
                    <td>{record.main_category}</td>
                    <td>{record.sub_category}</td>
                    {activeTab === "수입" && <td>{record.name1}</td>}
                    {activeTab === "수입" && <td>{record.name2 || "-"}</td>}
                    <td>{formatCurrency(record.amount)}원</td>
                    <td>{record.memo || "-"}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className="delete-button"
                        onClick={() => handleDelete(record.id)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="summary-section">
          <div className="summary-left">
            <div className="summary-item">
              <span className="summary-label">전월 이월금액:</span>
              <span className="summary-value">{formatCurrency(previousDayIncomeTotal - previousDayExpenseTotal)}원</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">금일 수입금액:</span>
              <span className="summary-value">{formatCurrency(dailyIncomeTotal)}원</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">금일 지출금액:</span>
              <span className="summary-value">{formatCurrency(dailyExpenseTotal)}원</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">금일 차액:</span>
              <span className="summary-value">{formatCurrency(dailyIncomeTotal - dailyExpenseTotal)}원</span>
            </div>
          </div>
          <div className="summary-right">
            <div className="summary-item">
              <span className="summary-label">총 수입금액:</span>
              <span className="summary-value">{formatCurrency(yearlyIncomeTotal)}원</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">총 지출금액:</span>
              <span className="summary-value">{formatCurrency(yearlyExpenseTotal)}원</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">현잔액:</span>
              <span className="summary-value">{formatCurrency(yearlyIncomeTotal - yearlyExpenseTotal)}원</span>
            </div>
          </div>
        </div>

        {editingRecord && (
          <FinanceEditPopup
            record={editingRecord}
            type={activeTab}
            onClose={async () => {
              setEditingRecord(null);
              await loadRecords();
              await loadAllTotals();
              if (selectedMainCategory) {
                await loadMainCategoryTotals();
              }
              if (selectedMainCategory && selectedSubCategory) {
                await loadSubCategoryTotals();
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

// 수정 팝업 컴포넌트
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
                value={amount ? formatCurrency(parseInt(amount.replace(/,/g, ''))) : ''}
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

export default FinanceInputPopup;
