import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'
import './index.css'

// Global error listener to help debug on mobile or when console is not available.
window.onerror = function(message, source, lineno, colno) {
  const errorMsg = document.createElement('div');
  errorMsg.style.position = 'fixed';
  errorMsg.style.top = '16px';
  errorMsg.style.left = '16px';
  errorMsg.style.right = '16px';
  errorMsg.style.padding = '12px 14px';
  errorMsg.style.background = '#dc2626';
  errorMsg.style.color = 'white';
  errorMsg.style.borderRadius = '14px';
  errorMsg.style.boxShadow = '0 18px 40px rgba(15, 23, 42, 0.22)';
  errorMsg.style.fontSize = '13px';
  errorMsg.style.fontWeight = '700';
  errorMsg.style.zIndex = '9999';
  errorMsg.textContent = `実行時エラーが発生しました: ${String(message)} (${source ?? 'unknown'}:${lineno}:${colno})`;
  document.body.appendChild(errorMsg);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
