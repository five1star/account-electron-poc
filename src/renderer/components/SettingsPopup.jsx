import React, { useState, useEffect } from "react";
import "./SettingsPopup.css";

function SettingsPopup({ isOpen, onClose }) {
  const [dbInfo, setDbInfo] = useState({ 
    fileName: "", 
    filePath: "", 
    lastUpdated: null,
    latestIncomeDate: null,
    latestExpenseDate: null
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDbInfo();
    }
  }, [isOpen]);

  const loadDbInfo = async () => {
    try {
      console.log("설정 팝업 - DB 정보 로드 시작");
      const result = await window.electronAPI.settings.getDbInfo();
      console.log("설정 팝업 - DB 정보 로드 결과:", result);
      console.log("설정 팝업 - result.success:", result.success);
      console.log("설정 팝업 - result.data:", result.data);
      console.log("설정 팝업 - result.error:", result.error);
      
      if (result.success) {
        console.log("설정 팝업 - DB 정보 데이터:", result.data);
        console.log("설정 팝업 - latestIncomeDate:", result.data?.latestIncomeDate);
        console.log("설정 팝업 - latestExpenseDate:", result.data?.latestExpenseDate);
        console.log("설정 팝업 - latestIncomeDate 타입:", typeof result.data?.latestIncomeDate);
        console.log("설정 팝업 - latestExpenseDate 타입:", typeof result.data?.latestExpenseDate);
        
        const dbInfoData = {
          fileName: result.data?.fileName || "",
          filePath: result.data?.filePath || "",
          lastUpdated: result.data?.lastUpdated || null,
          latestIncomeDate: result.data?.latestIncomeDate || null,
          latestExpenseDate: result.data?.latestExpenseDate || null
        };
        
        console.log("설정 팝업 - 설정할 dbInfoData:", dbInfoData);
        setDbInfo(dbInfoData);
      } else {
        console.error("설정 팝업 - DB 정보 로드 실패:", result.error);
        alert("DB 정보를 불러오는데 실패했습니다: " + (result.error || "알 수 없는 오류"));
      }
    } catch (error) {
      console.error("DB 정보 로드 실패:", error);
      console.error("에러 스택:", error.stack);
      alert("DB 정보를 불러오는데 실패했습니다: " + error.message);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.settings.backupDatabase();
      if (result.success) {
        alert(`백업이 완료되었습니다.\n경로: ${result.data}`);
        // DB 정보 새로고침 (lastUpdated 업데이트)
        await loadDbInfo();
      } else {
        alert(result.error || "백업에 실패했습니다.");
      }
    } catch (error) {
      console.error("백업 실패:", error);
      alert("백업에 실패했습니다: " + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!confirm("DB를 복구하시겠습니까? 현재 데이터는 모두 삭제되고 선택한 백업 파일의 데이터로 대체됩니다.")) {
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.settings.restoreDatabase();
      if (result.success) {
        alert("DB 복구가 완료되었습니다. 애플리케이션을 재시작해주세요.");
        // 애플리케이션 재시작은 사용자가 수동으로 해야 함
      } else {
        alert(result.error || "DB 복구에 실패했습니다.");
      }
    } catch (error) {
      console.error("DB 복구 실패:", error);
      alert("DB 복구에 실패했습니다: " + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  const handleResetAll = async () => {
    if (!confirm("데이터베이스를 전체 초기화하시겠습니까? 모든 데이터(수입, 지출, 항목, 결제라인)가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    if (!confirm("정말로 전체 초기화를 진행하시겠습니까? 모든 데이터가 영구적으로 삭제됩니다.")) {
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.settings.resetAll();
      if (result.success) {
        alert("전체 초기화가 완료되었습니다. 애플리케이션을 재시작해주세요.");
        await loadDbInfo();
      } else {
        alert(result.error || "전체 초기화에 실패했습니다.");
      }
    } catch (error) {
      console.error("전체 초기화 실패:", error);
      alert("전체 초기화에 실패했습니다: " + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  const handleResetIncomeExpense = async () => {
    if (!confirm("입출력 데이터를 초기화하시겠습니까? 수입과 지출 데이터만 삭제되고 항목과 결제라인은 유지됩니다. 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.settings.resetIncomeExpense();
      if (result.success) {
        alert("입출력 초기화가 완료되었습니다.");
        await loadDbInfo();
      } else {
        alert(result.error || "입출력 초기화에 실패했습니다.");
      }
    } catch (error) {
      console.error("입출력 초기화 실패:", error);
      alert("입출력 초기화에 실패했습니다: " + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content settings-popup" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h2>설정</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          <div className="setting-item">
            <label>DB 파일:</label>
            <div className="setting-value">{dbInfo.fileName || "-"}</div>
          </div>

          <div className="setting-item">
            <label>DB 파일 경로:</label>
            <div className="setting-value path-value">{dbInfo.filePath || "-"}</div>
          </div>

          <div className="setting-item">
            <label>최근 수정일:</label>
            <div className="setting-value">
              {dbInfo.lastUpdated 
                ? new Date(dbInfo.lastUpdated).toLocaleString("ko-KR", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "-"}
            </div>
          </div>

          <div className="setting-item">
            <label>마지막 저장일:</label>
            <div className="setting-value" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div>
                수입: {dbInfo.latestIncomeDate && dbInfo.latestIncomeDate !== null && dbInfo.latestIncomeDate !== undefined 
                  ? dbInfo.latestIncomeDate 
                  : "-"}
              </div>
              <div>
                지출: {dbInfo.latestExpenseDate && dbInfo.latestExpenseDate !== null && dbInfo.latestExpenseDate !== undefined 
                  ? dbInfo.latestExpenseDate 
                  : "-"}
              </div>
            </div>
          </div>

          <div className="settings-actions">
            <button 
              className="backup-button" 
              onClick={handleBackup}
              disabled={loading}
            >
              DB 백업하기
            </button>
            <button 
              className="restore-button" 
              onClick={handleRestore}
              disabled={loading}
            >
              DB 불러오기
            </button>
            <button 
              className="reset-all-button" 
              onClick={handleResetAll}
              disabled={loading}
            >
              전체 초기화
            </button>
            <button 
              className="reset-income-expense-button" 
              onClick={handleResetIncomeExpense}
              disabled={loading}
            >
              입출력 초기화
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPopup;
