import React, { useState } from 'react';
import MainScreen from './components/MainScreen';
import SettingsPopup from './components/SettingsPopup';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="app">
      <MainScreen />
      <div className="version-section">
        <button 
          className="settings-button"
          onClick={() => setIsSettingsOpen(true)}
          title="설정"
        >
          ⚙️
        </button>
        <div className="version-text">
          원주순복음중앙교회 재정관리 v1.0
        </div>
      </div>
      <SettingsPopup
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
