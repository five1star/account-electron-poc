import React, { useState, useEffect } from "react";
import "./CategoryManagementPopup.css";

function CategoryManagementPopup({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("수입"); // "수입" 또는 "지출"
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingMainCategory, setEditingMainCategory] = useState(null);
  const [editingSubCategory, setEditingSubCategory] = useState(null);
  const [newMainCategoryName, setNewMainCategoryName] = useState("");
  const [newSubCategoryName, setNewSubCategoryName] = useState("");
  const [selectedMainCategory, setSelectedMainCategory] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
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

  const handleAddMainCategory = async () => {
    if (!newMainCategoryName.trim()) {
      alert("대분류 이름을 입력해주세요.");
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
        alert(result.error || "대분류 추가에 실패했습니다.");
      }
    } catch (error) {
      console.error("대분류 추가 실패:", error);
      alert("대분류 추가에 실패했습니다.");
    }
  };

  const handleEditMainCategory = async (mainCategory) => {
    if (!newMainCategoryName.trim()) {
      alert("대분류 이름을 입력해주세요.");
      return;
    }

    // 기존 대분류의 모든 하위 항목을 찾아서 업데이트
    const subCategories = categories.find(
      (cat) => cat.main_category === mainCategory
    )?.sub_categories || [];

    try {
      // 기존 항목 삭제 후 새로 추가 (간단한 방법)
      // 실제로는 더 정교한 업데이트 로직이 필요할 수 있음
      const allCategories = await window.electronAPI.category.getAll(activeTab);
      const toUpdate = allCategories.filter(
        (cat) => cat.main_category === mainCategory
      );

      for (const cat of toUpdate) {
        await window.electronAPI.category.update(cat.id, {
          type: activeTab,
          main_category: newMainCategoryName.trim(),
          sub_category: cat.sub_category,
        });
      }

      setEditingMainCategory(null);
      setNewMainCategoryName("");
      loadCategories();
    } catch (error) {
      console.error("대분류 수정 실패:", error);
      alert("대분류 수정에 실패했습니다.");
    }
  };

  const handleDeleteMainCategory = async (mainCategory) => {
    if (!confirm(`"${mainCategory}" 대분류를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const allCategories = await window.electronAPI.category.getAll(activeTab);
      const toDelete = allCategories.filter(
        (cat) => cat.main_category === mainCategory
      );

      for (const cat of toDelete) {
        await window.electronAPI.category.delete(cat.id);
      }

      loadCategories();
    } catch (error) {
      console.error("대분류 삭제 실패:", error);
      alert("대분류 삭제에 실패했습니다.");
    }
  };

  const handleAddSubCategory = async (mainCategory) => {
    if (!newSubCategoryName.trim()) {
      alert("하위 항목 이름을 입력해주세요.");
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
        alert(result.error || "하위 항목 추가에 실패했습니다.");
      }
    } catch (error) {
      console.error("하위 항목 추가 실패:", error);
      alert("하위 항목 추가에 실패했습니다.");
    }
  };

  const handleEditSubCategory = async (mainCategory, oldSubCategory) => {
    if (!newSubCategoryName.trim()) {
      alert("하위 항목 이름을 입력해주세요.");
      return;
    }

    try {
      const allCategories = await window.electronAPI.category.getAll(activeTab);
      const toUpdate = allCategories.find(
        (cat) =>
          cat.main_category === mainCategory &&
          cat.sub_category === oldSubCategory
      );

      if (toUpdate) {
        await window.electronAPI.category.update(toUpdate.id, {
          type: activeTab,
          main_category: mainCategory,
          sub_category: newSubCategoryName.trim(),
        });

        setEditingSubCategory(null);
        setNewSubCategoryName("");
        loadCategories();
      }
    } catch (error) {
      console.error("하위 항목 수정 실패:", error);
      alert("하위 항목 수정에 실패했습니다.");
    }
  };

  const handleDeleteSubCategory = async (mainCategory, subCategory) => {
    if (!confirm(`"${subCategory}" 하위 항목을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const allCategories = await window.electronAPI.category.getAll(activeTab);
      const toDelete = allCategories.find(
        (cat) =>
          cat.main_category === mainCategory &&
          cat.sub_category === subCategory
      );

      if (toDelete) {
        await window.electronAPI.category.delete(toDelete.id);
        loadCategories();
      }
    } catch (error) {
      console.error("하위 항목 삭제 실패:", error);
      alert("하위 항목 삭제에 실패했습니다.");
    }
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
        </div>

        <div className="category-management">
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
                            placeholder="대분류 이름"
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
                                placeholder="하위 항목 이름"
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
                            placeholder="하위 항목 이름"
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
                          + 하위 항목 추가
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="add-main-category">
            <input
              type="text"
              value={newMainCategoryName}
              onChange={(e) => setNewMainCategoryName(e.target.value)}
              placeholder="대분류 이름"
              onKeyPress={(e) => {
                if (e.key === "Enter" && !editingMainCategory) {
                  handleAddMainCategory();
                }
              }}
            />
            <button onClick={handleAddMainCategory}>대분류 추가</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CategoryManagementPopup;
