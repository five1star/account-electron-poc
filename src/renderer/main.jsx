import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// 전역 에러 핸들러 설정
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  if (window.electronAPI && window.electronAPI.logError) {
    const error = event.error || new Error(event.message);
    window.electronAPI.logError({
      message: error.message || event.message,
      stack: error.stack || 'No stack trace',
      name: error.name || 'Error',
    }, 'Global Error Handler');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  if (window.electronAPI && window.electronAPI.logError) {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    window.electronAPI.logError({
      message: error.message || String(event.reason),
      stack: error.stack || 'No stack trace',
      name: error.name || 'UnhandledRejection',
    }, 'Unhandled Promise Rejection');
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
