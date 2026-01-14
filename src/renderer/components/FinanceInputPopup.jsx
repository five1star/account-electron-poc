import React, { useState, useEffect } from "react";
import "./FinanceInputPopup.css";

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

  useEffect(() => {
    if (isOpen) {
      loadMainCategories();
      loadRecords();
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

  const loadMainCategories = async () => {
    try {
      const result = await window.electronAPI.category.getMainCategories(activeTab);
      if (result.success) {
        setMainCategories(result.data.map(cat => cat.main_category));
      }
    } catch (error) {
      console.error("대분류 로드 실패:", error);
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
      console.error("하위 항목 로드 실패:", error);
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
      }
    } catch (error) {
      console.error("기록 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 유효성 검사
    if (!selectedMainCategory) {
      alert("대분류를 선택해주세요.");
      return;
    }
    if (!selectedSubCategory) {
      alert("하위 항목을 선택해주세요.");
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
          resetForm();
          loadRecords();
        } else {
          alert(result.error || "수입 추가에 실패했습니다.");
        }
      } else {
        const result = await window.electronAPI.finance.addExpense(data);
        if (result.success) {
          resetForm();
          loadRecords();
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
        loadRecords();
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

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
                    // 키보드 입력 차단 (화살표 키와 Tab은 허용)
                    if (e.key !== 'Tab' && !e.key.startsWith('Arrow')) {
                      e.preventDefault();
                    }
                  }}
                  onInput={(e) => {
                    // 직접 입력 차단
                    e.target.value = date;
                  }}
                  className="date-input-styled"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>대분류</label>
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
              <label>하위 항목</label>
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
                <div className="form-group checkbox-group-compact">
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
                <div className="form-group-compact">
                  <label>이름1 {!isAnonymous && <span className="required">*</span>}</label>
                  <input
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
                type="number"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "");
                  setAmount(value);
                }}
                required
                min="1"
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
                  <th>대분류</th>
                  <th>하위 항목</th>
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
      console.error("대분류 로드 실패:", error);
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
      console.error("하위 항목 로드 실패:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedMainCategory || !selectedSubCategory) {
      alert("대분류와 하위 항목을 선택해주세요.");
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
                  // 키보드 입력 차단 (화살표 키와 Tab은 허용)
                  if (e.key !== 'Tab' && !e.key.startsWith('Arrow')) {
                    e.preventDefault();
                  }
                }}
                onInput={(e) => {
                  // 직접 입력 차단
                  e.target.value = date;
                }}
                className="date-input-styled"
                required
              />
            </div>

            <div className="form-group">
              <label>대분류</label>
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
              <label>하위 항목</label>
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
                type="number"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "");
                  setAmount(value);
                }}
                required
                min="1"
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
