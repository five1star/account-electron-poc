import React, { useState, useEffect } from "react";
import "./SettingsPopup.css";

function SettingsPopup({ isOpen, onClose }) {
  const [dbInfo, setDbInfo] = useState({ fileName: "", filePath: "", lastUpdated: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDbInfo();
    }
  }, [isOpen]);

  const loadDbInfo = async () => {
    try {
      const result = await window.electronAPI.settings.getDbInfo();
      if (result.success) {
        setDbInfo(result.data);
      }
    } catch (error) {
      console.error("DB 정보 로드 실패:", error);
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
            <label>Last updated:</label>
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

          <div className="settings-actions">
            <button 
              className="backup-button" 
              onClick={handleBackup}
              disabled={loading}
            >
              백업
            </button>
            <button 
              className="restore-button" 
              onClick={handleRestore}
              disabled={loading}
            >
              DB 복구
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPopup;
