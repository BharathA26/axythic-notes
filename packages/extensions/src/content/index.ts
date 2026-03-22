/**
 * Content Script - Injected into Google Meet pages
 * Captures transcript/captions from the meeting
 */

let isCapturing = false;
let transcriptBuffer: string[] = [];

function startCapture() {
  isCapturing = true;
  transcriptBuffer = [];
  observeCaptions();
  console.log('[Axythic Notes] Transcript capture started');
}

function stopCapture() {
  isCapturing = false;
  const transcript = transcriptBuffer.join('\n');

  chrome.runtime.sendMessage({
    type: 'TRANSCRIPT_CAPTURED',
    data: {
      transcript,
      title: document.title.replace(' - Google Meet', ''),
      participants: getParticipants(),
    },
  });

  console.log('[Axythic Notes] Transcript capture stopped and sent');
}

function observeCaptions() {
  // TODO: Implement MutationObserver to watch for caption elements
  // Google Meet renders captions in specific DOM elements
  const observer = new MutationObserver((mutations) => {
    if (!isCapturing) return;

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          const text = node.textContent?.trim();
          if (text) {
            transcriptBuffer.push(text);
          }
        }
      });
    });
  });

  // Observe the document body for caption changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function getParticipants(): string[] {
  // TODO: Extract participant names from Google Meet UI
  return [];
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_CAPTURE') {
    startCapture();
    sendResponse({ success: true });
  } else if (message.type === 'STOP_CAPTURE') {
    stopCapture();
    sendResponse({ success: true });
  } else if (message.type === 'GET_STATUS') {
    sendResponse({ isCapturing });
  }
});
