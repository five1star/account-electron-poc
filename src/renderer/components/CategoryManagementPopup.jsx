import React, { useState, useEffect } from "react";
import "./CategoryManagementPopup.css";

function CategoryManagementPopup({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("수입"); // "수입", "지출", 또는 "결제라인"
  const [categories, setCategories] = useState([]);
  const [paymentLines, setPaymentLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingMainCategory, setEditingMainCategory] = useState(null);
  const [editingSubCategory, setEditingSubCategory] = useState(null);
  const [editingPaymentLine, setEditingPaymentLine] = useState(null);
  const [newMainCategoryName, setNewMainCategoryName] = useState("");
  const [newSubCategoryName, setNewSubCategoryName] = useState("");
  const [selectedMainCategory, setSelectedMainCategory] = useState(null);
  const [newPaymentLineName, setNewPaymentLineName] = useState("");
  const [newPaymentLineOrder, setNewPaymentLineOrder] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (activeTab === "결제라인") {
        loadPaymentLines();
      } else {
        loadCategories();
      }
    }
  }, [isOpen, activeTab]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.category.getHierarchy(activeTab);
      if (result.success) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error("항목 로드 실패:", error);
      alert("항목을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentLines = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.paymentLine.getAll();
      if (result.success) {
        setPaymentLines(result.data);
      }
    } catch (error) {
      console.error("결제라인 로드 실패:", error);
      alert("결제라인을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMainCategory = async () => {
    if (!newMainCategoryName.trim()) {
      alert("항 이름을 입력해주세요.");
      return;
    }

    try {
      const result = await window.electronAPI.category.add({
        type: activeTab,
        main_category: newMainCategoryName.trim(),
        sub_category: null,
      });

      if (result.success) {
        setNewMainCategoryName("");
        loadCategories();
      } else {
        alert(result.error || "항 추가에 실패했습니다.");
      }
    } catch (error) {
      console.error("항 추가 실패:", error);
      alert("항 추가에 실패했습니다.");
    }
  };

  const handleEditMainCategory = async (mainCategory) => {
    if (!newMainCategoryName.trim()) {
      alert("항 이름을 입력해주세요.");
      return;
    }

    // 기존 항의 모든 목을 찾아서 업데이트
    const subCategories = categories.find(
      (cat) => cat.main_category === mainCategory
    )?.sub_categories || [];

    try {
      // 기존 항목 삭제 후 새로 추가 (간단한 방법)
      // 실제로는 더 정교한 업데이트 로직이 필요할 수 있음
      const result = await window.electronAPI.category.getAll(activeTab);
      if (!result.success) {
        alert(result.error || "항목을 불러오는데 실패했습니다.");
        return;
      }
      const allCategories = result.data || [];
      const toUpdate = allCategories.filter(
        (cat) => cat.main_category === mainCategory
      );

      let hasError = false;
      for (const cat of toUpdate) {
        const result = await window.electronAPI.category.update(cat.id, {
          type: activeTab,
          main_category: newMainCategoryName.trim(),
          sub_category: cat.sub_category,
        });
        if (!result.success) {
          hasError = true;
          alert(result.error || "항 수정에 실패했습니다.");
          break;
        }
      }

      if (!hasError) {
        setEditingMainCategory(null);
        setNewMainCategoryName("");
        loadCategories();
      }
    } catch (error) {
      console.error("항 수정 실패:", error);
      alert("항 수정에 실패했습니다: " + (error.message || error));
    }
  };

  const handleDeleteMainCategory = async (mainCategory) => {
    if (!confirm(`"${mainCategory}" 항를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const result = await window.electronAPI.category.getAll(activeTab);
      if (!result.success) {
        alert(result.error || "항목을 불러오는데 실패했습니다.");
        return;
      }
      const allCategories = result.data || [];
      const toDelete = allCategories.filter(
        (cat) => cat.main_category === mainCategory
      );

      let hasError = false;
      for (const cat of toDelete) {
        const result = await window.electronAPI.category.delete(cat.id);
        if (!result.success) {
          hasError = true;
          alert(result.error || "항 삭제에 실패했습니다.");
          break;
        }
      }

      if (!hasError) {
        loadCategories();
      }
    } catch (error) {
      console.error("항 삭제 실패:", error);
      alert("항 삭제에 실패했습니다: " + (error.message || error));
    }
  };

  const handleAddSubCategory = async (mainCategory) => {
    if (!newSubCategoryName.trim()) {
      alert("목 이름을 입력해주세요.");
      return;
    }

    try {
      const result = await window.electronAPI.category.add({
        type: activeTab,
        main_category: mainCategory,
        sub_category: newSubCategoryName.trim(),
      });

      if (result.success) {
        setNewSubCategoryName("");
        setSelectedMainCategory(null);
        loadCategories();
      } else {
        alert(result.error || "목 추가에 실패했습니다.");
      }
    } catch (error) {
      console.error("목 추가 실패:", error);
      alert("목 추가에 실패했습니다.");
    }
  };

  const handleEditSubCategory = async (mainCategory, oldSubCategory) => {
    if (!newSubCategoryName.trim()) {
      alert("목 이름을 입력해주세요.");
      return;
    }

    try {
      const result = await window.electronAPI.category.getAll(activeTab);
      if (!result.success) {
        alert(result.error || "항목을 불러오는데 실패했습니다.");
        return;
      }
      const allCategories = result.data || [];
      const toUpdate = allCategories.find(
        (cat) =>
          cat.main_category === mainCategory &&
          cat.sub_category === oldSubCategory
      );

      if (toUpdate) {
        const result = await window.electronAPI.category.update(toUpdate.id, {
          type: activeTab,
          main_category: mainCategory,
          sub_category: newSubCategoryName.trim(),
        });

        if (result.success) {
          setEditingSubCategory(null);
          setNewSubCategoryName("");
          loadCategories();
        } else {
          alert(result.error || "목 수정에 실패했습니다.");
        }
      } else {
        alert("수정할 목을 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("목 수정 실패:", error);
      alert("목 수정에 실패했습니다: " + (error.message || error));
    }
  };

  const handleDeleteSubCategory = async (mainCategory, subCategory) => {
    if (!confirm(`"${subCategory}" 목을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const result = await window.electronAPI.category.getAll(activeTab);
      if (!result.success) {
        alert(result.error || "항목을 불러오는데 실패했습니다.");
        return;
      }
      const allCategories = result.data || [];
      const toDelete = allCategories.find(
        (cat) =>
          cat.main_category === mainCategory &&
          cat.sub_category === subCategory
      );

      if (toDelete) {
        const result = await window.electronAPI.category.delete(toDelete.id);
        if (result.success) {
          loadCategories();
        } else {
          alert(result.error || "목 삭제에 실패했습니다.");
        }
      } else {
        alert("삭제할 목을 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("목 삭제 실패:", error);
      alert("목 삭제에 실패했습니다: " + (error.message || error));
    }
  };

  const handleAddPaymentLine = async () => {
    if (!newPaymentLineName.trim()) {
      alert("결제라인명을 입력해주세요.");
      return;
    }

    const order = parseInt(newPaymentLineOrder) || 0;

    try {
      if (editingPaymentLine) {
        // 수정 모드
        const result = await window.electronAPI.paymentLine.update(editingPaymentLine.id, {
          name: newPaymentLineName.trim(),
          order_index: order,
        });

        if (result.success) {
          setEditingPaymentLine(null);
          setNewPaymentLineName("");
          setNewPaymentLineOrder("");
          loadPaymentLines();
        } else {
          alert(result.error || "결제라인 수정에 실패했습니다.");
        }
      } else {
        // 추가 모드
        const result = await window.electronAPI.paymentLine.add({
          name: newPaymentLineName.trim(),
          order_index: order,
        });

        if (result.success) {
          setNewPaymentLineName("");
          setNewPaymentLineOrder("");
          loadPaymentLines();
        } else {
          alert(result.error || "결제라인 추가에 실패했습니다.");
        }
      }
    } catch (error) {
      console.error("결제라인 처리 실패:", error);
      alert(editingPaymentLine ? "결제라인 수정에 실패했습니다." : "결제라인 추가에 실패했습니다.");
    }
  };

  const handleEditPaymentLineClick = (paymentLine) => {
    setEditingPaymentLine(paymentLine);
    setNewPaymentLineName(paymentLine.name);
    setNewPaymentLineOrder(paymentLine.order_index.toString());
  };

  const handleCancelEdit = () => {
    setEditingPaymentLine(null);
    setNewPaymentLineName("");
    setNewPaymentLineOrder("");
  };

  const handleDeletePaymentLine = async (id) => {
    if (!confirm("이 결제라인을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const result = await window.electronAPI.paymentLine.delete(id);
      if (result.success) {
        loadPaymentLines();
      } else {
        alert(result.error || "결제라인 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("결제라인 삭제 실패:", error);
      alert("결제라인 삭제에 실패했습니다: " + (error.message || error));
    }
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

  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h2>항목 관리</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="tab-container">
          <button
            className={`tab-button ${activeTab === "수입" ? "active" : ""}`}
            onClick={() => setActiveTab("수입")}
          >
            수입항목 관리
          </button>
          <button
            className={`tab-button ${activeTab === "지출" ? "active" : ""}`}
            onClick={() => setActiveTab("지출")}
          >
            지출항목 관리
          </button>
          <button
            className={`tab-button ${activeTab === "결제라인" ? "active" : ""}`}
            onClick={() => setActiveTab("결제라인")}
          >
            결제라인 관리
          </button>
        </div>

        <div className="category-management">
          {activeTab === "결제라인" ? (
            <>
              <div className="add-main-category">
                <input
                  type="text"
                  value={newPaymentLineName}
                  onChange={(e) => setNewPaymentLineName(e.target.value)}
                  placeholder="결제라인명"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddPaymentLine();
                    }
                  }}
                />
                <input
                  type="number"
                  value={newPaymentLineOrder}
                  onChange={(e) => setNewPaymentLineOrder(e.target.value)}
                  placeholder="순서"
                  style={{ width: "100px" }}
                />
                <button onClick={handleAddPaymentLine}>
                  {editingPaymentLine ? "수정 저장" : "결제라인 추가"}
                </button>
                {editingPaymentLine && (
                  <button onClick={handleCancelEdit}>취소</button>
                )}
              </div>

              {loading ? (
                <div className="loading">로딩 중...</div>
              ) : (
                <div className="payment-line-list-container">
                  <table className="payment-line-list-table">
                    <thead>
                      <tr>
                        <th>결제라인명</th>
                        <th>순서</th>
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedPaymentLines().map((line) => (
                        <tr key={line.id}>
                          <td>{line.name}</td>
                          <td>{line.order_index}</td>
                          <td>
                            <div className="button-group">
                              <button
                                onClick={() => handleEditPaymentLineClick(line)}
                              >
                                수정
                              </button>
                              <button
                                onClick={() =>
                                  handleDeletePaymentLine(line.id)
                                }
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {paymentLines.length === 0 && (
                        <tr>
                          <td colSpan="3" className="empty-state">
                            등록된 결제라인이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="add-main-category">
                <input
                  type="text"
                  value={newMainCategoryName}
                  onChange={(e) => setNewMainCategoryName(e.target.value)}
                  placeholder="항 이름"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !editingMainCategory) {
                      handleAddMainCategory();
                    }
                  }}
                />
                <button onClick={handleAddMainCategory}>항 추가</button>
              </div>

          {loading ? (
            <div className="loading">로딩 중...</div>
          ) : (
            <div className="category-list">
              {categories.length === 0 ? (
                <div className="empty-state">
                  등록된 항목이 없습니다.
                </div>
              ) : (
                categories.map((category, index) => (
                  <div key={index} className="category-item">
                    <div className="main-category-header">
                      {editingMainCategory === category.main_category ? (
                        <div className="edit-form">
                          <input
                            type="text"
                            value={newMainCategoryName}
                            onChange={(e) =>
                              setNewMainCategoryName(e.target.value)
                            }
                            placeholder="항 이름"
                            autoFocus
                          />
                          <button
                            onClick={() =>
                              handleEditMainCategory(category.main_category)
                            }
                          >
                            저장
                          </button>
                          <button
                            onClick={() => {
                              setEditingMainCategory(null);
                              setNewMainCategoryName("");
                            }}
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <div className="main-category-controls">
                          <h3>{category.main_category}</h3>
                          <div className="button-group">
                            <button
                              onClick={() => {
                                setEditingMainCategory(category.main_category);
                                setNewMainCategoryName(category.main_category);
                              }}
                            >
                              수정
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteMainCategory(category.main_category)
                              }
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="sub-categories">
                      {category.sub_categories.map((subCategory, subIndex) => (
                        <div key={subIndex} className="sub-category-item">
                          {editingSubCategory ===
                          `${category.main_category}-${subCategory}` ? (
                            <div className="edit-form">
                              <input
                                type="text"
                                value={newSubCategoryName}
                                onChange={(e) =>
                                  setNewSubCategoryName(e.target.value)
                                }
                                placeholder="목 이름"
                                autoFocus
                              />
                              <button
                                onClick={() =>
                                  handleEditSubCategory(
                                    category.main_category,
                                    subCategory
                                  )
                                }
                              >
                                저장
                              </button>
                              <button
                                onClick={() => {
                                  setEditingSubCategory(null);
                                  setNewSubCategoryName("");
                                }}
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <div className="sub-category-controls">
                              <span>{subCategory}</span>
                              <div className="button-group">
                                <button
                                  onClick={() => {
                                    setEditingSubCategory(
                                      `${category.main_category}-${subCategory}`
                                    );
                                    setNewSubCategoryName(subCategory);
                                  }}
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteSubCategory(
                                      category.main_category,
                                      subCategory
                                    )
                                  }
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {selectedMainCategory === category.main_category ? (
                        <div className="add-sub-category-form">
                          <input
                            type="text"
                            value={newSubCategoryName}
                            onChange={(e) =>
                              setNewSubCategoryName(e.target.value)
                            }
                            placeholder="목 이름"
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                handleAddSubCategory(category.main_category);
                              }
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() =>
                              handleAddSubCategory(category.main_category)
                            }
                          >
                            추가
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMainCategory(null);
                              setNewSubCategoryName("");
                            }}
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          className="add-sub-category-button"
                          onClick={() =>
                            setSelectedMainCategory(category.main_category)
                          }
                        >
                          + 목 추가
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CategoryManagementPopup;
