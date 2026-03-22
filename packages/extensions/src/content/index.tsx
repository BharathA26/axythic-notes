import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '../styles/index.css'; // CRXJS will inject this naturally

// Target platforms
const platformNames: Record<string, string> = {
  'meet.google.com': 'Google Meet',
  'zoom.us': 'Zoom',
  'teams.microsoft.com': 'Teams',
};

function detectPlatform() {
  const url = window.location.href;
  for (const [key, name] of Object.entries(platformNames)) {
    if (url.includes(key)) return { id: key.split('.')[0], name };
  }
  return null;
}

const platform = detectPlatform();

if (platform && !document.getElementById('axythic-note-host')) {
  // Create host element
  const host = document.createElement('div');
  host.id = 'axythic-note-host';
  host.className = 'an-root';
  // Position it absolutely out of normal flow but fixed relative to viewport
  host.style.position = 'fixed';
  host.style.top = '70px';
  host.style.right = '16px';
  host.style.zIndex = '2147483647';
  host.style.pointerEvents = 'none'; // allow clicks through the transparent host bounds

  document.body.appendChild(host);

  // Inject Fonts into document head
  const fonts = document.createElement('link');
  fonts.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
  fonts.rel = 'stylesheet';
  document.head.appendChild(fonts);

  const root = createRoot(host);
  root.render(
    <React.StrictMode>
      <div style={{ pointerEvents: 'auto' }}>
        <App platform={platform} />
      </div>
    </React.StrictMode>
  );
}
