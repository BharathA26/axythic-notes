import React, { useState, useEffect } from 'react';

function Popup() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState('Ready');

  useEffect(() => {
    // Check current capture status
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATUS' }, (response) => {
          if (response?.isCapturing) {
            setIsCapturing(true);
            setStatus('Capturing...');
          }
        });
      }
    });
  }, []);

  const toggleCapture = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        const messageType = isCapturing ? 'STOP_CAPTURE' : 'START_CAPTURE';
        chrome.tabs.sendMessage(tabs[0].id, { type: messageType }, () => {
          setIsCapturing(!isCapturing);
          setStatus(isCapturing ? 'Stopped' : 'Capturing...');
        });
      }
    });
  };

  return (
    <div style={{ width: 300, padding: 16, fontFamily: 'sans-serif' }}>
      <h2 style={{ margin: '0 0 12px' }}>Axythic Notes</h2>
      <p style={{ color: '#666', fontSize: 14 }}>Status: {status}</p>
      <button
        onClick={toggleCapture}
        style={{
          width: '100%',
          padding: '10px 16px',
          fontSize: 14,
          color: '#fff',
          backgroundColor: isCapturing ? '#d32f2f' : '#1976d2',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        {isCapturing ? 'Stop Capture' : 'Start Capture'}
      </button>
    </div>
  );
}

export default Popup;
