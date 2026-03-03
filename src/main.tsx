import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'
import './index.css'

// Global error listener to help debug on mobile or when console is not available
window.onerror = function(message, source, lineno, colno) {
  const errorMsg = document.createElement('div');
  errorMsg.style.position = 'fixed';
  errorMsg.style.top = '0';
  errorMsg.style.left = '0';
  errorMsg.style.width = '100%';
  errorMsg.style.padding = '10px';
  errorMsg.style.background = 'red';
  errorMsg.style.color = 'white';
  errorMsg.style.zIndex = '9999';
  errorMsg.innerHTML = `Runtime Error: ${message} at ${source}:${lineno}:${colno}`;
  document.body.appendChild(errorMsg);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
