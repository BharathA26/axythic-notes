// Isolated Observer logic from content.js translated to structured TypeScript

export interface Segment {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
}

interface ObserverCallbacks {
  onSegment: (segment: Segment) => void;
  onParticipantsActive: (participants: string[]) => void;
  onSpeakerChange: (speaker: string) => void;
}

const NAME_SELECTORS = [
  '[jsname="r4nke"]',
  '.zs7s8d',
  '[data-sender-name]',
  '.CNusmb span',
  '[jsname="V67SHe"]',
  '[jsname="WpW6ec"]',
];

const UI_NOISE_CAPS = new Set([
  'BETA', 'CAPTIONS', 'LIVE', 'MUTED', 'SETTINGS', 'MENU',
  'RAISE HAND', 'LEAVE CALL', 'SHARE SCREEN', 'MORE OPTIONS'
]);

function getLocalUserName(): string {
  const selfTile = document.querySelector('[data-self-name]');
  if (selfTile) return selfTile.getAttribute('data-self-name') || 'You';
  const profile = document.querySelector('[data-email]');
  if (profile) return profile.getAttribute('data-name') || 'You';
  return 'You';
}

function extractDomSpeaker(el: HTMLElement): string | null {
  const bubble = el.closest('[jscontroller]') || el.parentElement;
  if (!bubble) return null;

  const attr = bubble.getAttribute('data-sender-name') ||
               bubble.closest('[data-sender-name]')?.getAttribute('data-sender-name');
  if (attr && attr.trim().length > 0) return attr.trim();

  for (const sel of NAME_SELECTORS) {
    const found = bubble.querySelector(sel) ||
                  bubble.parentElement?.querySelector(sel) ||
                  bubble.parentElement?.parentElement?.querySelector(sel);
    const text = found?.textContent?.trim();
    if (text && text.length > 0 && text.length < 60 &&
        !/^(Captions|Settings|Toggle|More|Visual|Menu)/i.test(text)) {
      return text;
    }
  }
  return null;
}

function extractYouSpeaker(text: string): [string, string] | null {
  if (text.startsWith('You') && text.length > 3) {
    const rest = text.slice(3).trim();
    if (rest.length > 0 && !/^[a-z]{3,}/.test(rest)) {
      return ['You', rest];
    }
  }
  if (/^You\s*:/.test(text)) {
    return ['You', text.replace(/^You\s*:\s*/, '').trim()];
  }
  return null;
}

/**
 * Google Meet emits captions as a rolling/sliding window. Each update is the
 * current visible caption buffer, which heavily overlaps with the previous one.
 *
 * Example:
 *   t=1: "Everyone. Hello, everybody. Are now heading toward India"
 *   t=2: "olution. Are now heading toward India, with cooking gas"
 *   t=3: "cooking gas on board. And right now that cargo is"
 *
 * This function finds the longest suffix of `prev` that matches a prefix of `next`
 * (word-level, then character-level), and returns only the truly new trailing portion.
 */
function extractNewTail(prev: string, next: string): string | null {
  if (!prev) return next;

  // 1. next is fully within prev — nothing new.
  if (prev.includes(next)) return null;

  // 2. Simple extension: next starts with prev.
  if (next.startsWith(prev)) {
    const tail = next.slice(prev.length).trim();
    return tail.length >= 2 ? tail : null;
  }

  const normalise = (s: string) =>
    s.toLowerCase().replace(/[.,!?;:\s]+/g, ' ').trim();

  const prevWords = prev.split(/\s+/);
  const nextWords = next.split(/\s+/);

  // 3. Word-level overlap: find longest suffix of prevWords == prefix of nextWords.
  const maxCheck = Math.min(prevWords.length, nextWords.length, 50);
  for (let len = maxCheck; len >= 2; len--) {
    const suffix = normalise(prevWords.slice(-len).join(' '));
    const prefix = normalise(nextWords.slice(0, len).join(' '));
    if (suffix === prefix) {
      const newPart = nextWords.slice(len).join(' ').trim();
      return newPart.length >= 2 ? newPart : null;
    }
  }

  // 4. Character-level overlap for mid-word truncations like "olution.".
  const maxCharLen = Math.min(prev.length, next.length, 80);
  for (let len = maxCharLen; len >= 8; len--) {
    const suffixRaw = prev.slice(-len);
    const prefixRaw = next.slice(0, len);
    if (normalise(suffixRaw) === normalise(prefixRaw)) {
      const tail = next.slice(len).trim();
      return tail.length >= 2 ? tail : null;
    }
  }

  // 5. No significant overlap — treat next as all-new.
  return next;
}

const seenTexts = new Set<string>();
let currentObserver: MutationObserver | null = null;
let lastSpeaker = '';
let lastKnownSpeaker = 'Speaker';

// Per-speaker rolling buffer of accumulated text for the current turn.
const speakerBuffer: Map<string, string> = new Map();

export function setupCaptionObserver(callbacks: ObserverCallbacks) {
  const localUserName = getLocalUserName();

  function tryEmit(speaker: string, newText: string) {
    if (!newText || newText.length < 2) return;
    if (newText.trim().toLowerCase() === speaker.toLowerCase()) return;

    const text = newText.length > 400 ? newText.slice(-400) : newText;
    const key = text.slice(-80);

    if (seenTexts.has(key)) return;
    seenTexts.add(key);
    if (seenTexts.size > 800) seenTexts.delete(seenTexts.values().next().value as string);

    if (speaker !== lastSpeaker && !/^(Speaker|Captions|Settings)/i.test(speaker)) {
      lastSpeaker = speaker;
      lastKnownSpeaker = speaker;
      callbacks.onSpeakerChange(speaker);
    }

    callbacks.onSegment({
      id: 'seg-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      speaker,
      text,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    });
  }

  function extractSpeech(rawText: string, domSpeaker: string | null): [string, string] | null {
    if (!rawText || rawText.length < 2 || rawText.length > 3000) return null;

    const settingsPattern = /(Default|Tiny|Small|Medium|Large|Huge|Jumbo|White|Black|Blue|Green|Red|Yellow|Cyan|Magenta|Albanian|Amharic|Arabic|Armenian|Azerbaijani|Basque|Bengali|Bulgarian|Burmese|Catalan|Chinese|Czech|Dutch|English|Estonian|Filipino|Finnish|French|Galician|Georgian|German|Greek|Gujarati|Hebrew|Hindi|Hungarian|Icelandic|Indonesian|Italian|Japanese|Javanese|Kannada|Kazakh|Khmer|Korean|Lao|Latvian|Lithuanian|Malay|Malayalam|Marathi|Nepali|Norwegian|Persian|Polish|Portuguese|Romanian|Russian|Spanish|Tamil|Telugu|Thai|Turkish|Ukrainian|Urdu|Vietnamese)/i;
    if (rawText.length > 50 && settingsPattern.test(rawText)) return null;

    const noiseWords = [
      'more_vert', 'visual_effects', 'front_hand', 'back_hand', 'closed_caption',
      'meeting_room', 'infoinfo', 'chatchat', 'appsapps', 'lock_person', 'alarm',
      'volume_up', 'inventory', 'frame_person', 'devices', 'keyboard_arrow',
      'computer_arrow', 'arrow_downword', 'arrow_upward', 'format_size', 'language',
      'BETA', 'Afrikaans', 'Open caption', 'Font size', 'Font colour', 'Jump to bottom',
      'Turn off microphone', 'Turn on microphone', 'Audio settings', 'Turn off camera',
      'Turn on camera', 'Video settings', 'Share screen', 'Send a reaction', 'Leave call',
      'No one else is here', 'Speaking...', 'Camera is starting', 'MacBook Air',
      'System default', 'FaceTime HD Camera', 'Make a test recording', 'Test speakers',
      'Your camera is turned off', 'Camera is off', 'Raising your hand',
      'An add-on would work better', 'browser-extension-*-buttons',
      'Reframe', 'Backgrounds and effects', 'More options', 'full video',
      'Meeting details', 'This call is open to anyone', 'Shift+C', 'Raise hand',
      'Chat with everyone', 'Meeting tools', 'Host controls', 'Call will end soon',
      'Meeting timer', 'down arrow', 'hover tray', 'Hand raises', 'People',
      'mic', 'videocam', 'mood', 'info', 'chat', 'apps', 'circle', 'Settings',
      'Captions', 'Toggle captions'
    ];

    const trimmed = rawText.trim();
    if (noiseWords.some(n => trimmed.toLowerCase() === n.toLowerCase() || trimmed === n)) return null;
    if (trimmed.length < 3) return null;
    if (/^[a-z_]+$/.test(trimmed) && trimmed.length < 20) return null;
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) return null;
    if (/^People\d+$/.test(trimmed)) return null;
    if (trimmed.length < 25 && settingsPattern.test(trimmed)) return null;

    let cleaned = trimmed;

    const headerPattern = /^[A-Z][A-Z][a-z]+\d{1,2}:\d{2}/;
    while (headerPattern.test(cleaned)) {
      cleaned = cleaned.replace(headerPattern, '').trim();
    }

    if (cleaned.length > 10) {
      const half = Math.floor(cleaned.length / 2);
      if (cleaned.slice(0, half) === cleaned.slice(half) && /^[A-Z]/.test(cleaned.slice(0, half))) {
        cleaned = cleaned.slice(0, half);
      }
    }

    let speaker = domSpeaker || lastKnownSpeaker;

    const youResult = extractYouSpeaker(cleaned);
    if (youResult) {
      speaker = 'You';
      cleaned = youResult[1];
    }

    if (speaker && speaker !== 'Speaker') {
      const s = speaker.trim();
      for (let i = 0; i < 2; i++) {
        if (cleaned.startsWith(s)) {
          const rest = cleaned.slice(s.length).trim();
          if (rest.length === 0 || !/^[a-z]/.test(rest)) cleaned = rest;
        } else if (cleaned.toLowerCase().startsWith(s.toLowerCase())) {
          cleaned = cleaned.slice(s.length).trim();
        }
      }
    }

    if (!domSpeaker && speaker === lastKnownSpeaker) {
      if (cleaned.includes(':') && cleaned.indexOf(':') < 40 && /^[A-Z]/.test(cleaned)) {
        const parts = cleaned.split(':');
        if (parts[0].length > 2 && parts[0].length < 40) {
          speaker = parts[0].trim();
          cleaned = parts.slice(1).join(':').trim();
        }
      } else {
        const m = cleaned.match(/^([A-Z][A-Za-z\s.]{2,40}|[A-Z]{2,}\s?[A-Z]?)(?=\s+[A-Z\d\u0022\u0027])/);
        const nonNames = ['Hello', 'Hi', 'Good', 'Morning', 'Afternoon', 'Evening', 'Actually', 'Wait', 'Well', 'Maybe'];
        if (m && m[1].length > 2 && !nonNames.includes(m[1].trim())) {
          speaker = m[1].trim();
          cleaned = cleaned.slice(m[1].length).trim();
        }
      }
    }

    if (!cleaned || cleaned.length < 2) return null;
    if (speaker === 'You') speaker = localUserName;

    const lowerCleaned = cleaned.toLowerCase();
    if (lowerCleaned === speaker.toLowerCase() || lowerCleaned === 'you' || lowerCleaned === 'captions') return null;

    if (/^[A-Z\s]+$/.test(cleaned) && cleaned.length < 40) {
      const couldBeAName = /^[A-Z][A-Z]+(\s[A-Z])?$/.test(cleaned.trim());
      if (!couldBeAName && UI_NOISE_CAPS.has(cleaned.trim().toUpperCase())) return null;
    }

    const nameNoSpace = speaker.replace(/\s/g, '').toLowerCase();
    const textNoSpace = cleaned.replace(/\s/g, '').replace(/[.!?,]$/, '').toLowerCase();
    if (textNoSpace === nameNoSpace || textNoSpace === nameNoSpace + nameNoSpace.slice(-1)) return null;
    if (cleaned.length < 15 && speaker.toLowerCase().includes(lowerCleaned)) return null;

    return [speaker, cleaned];
  }

  const CAPTION_SELECTORS = [
    '[jsname="dsyhDe"]',
    '.iOzk7',
    '[jscontroller][class*="caption"]',
    '[aria-label="Captions"]',
    '.a4cQT',
    '[data-is-captions="true"]',
    '.punch-room-captions-container',
  ];

  function findCaptionContainer() {
    for (const sel of CAPTION_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    for (const el of Array.from(document.querySelectorAll('div'))) {
      if (el.textContent?.includes('Open caption settings') && el.childElementCount < 20) {
        return el;
      }
    }
    return null;
  }

  let rafPending = false;
  let pendingMutations: MutationRecord[] = [];

  // After FLUSH_DELAY_MS of silence from a speaker we reset their buffer
  // so the next utterance starts fresh (avoids buffer growing forever).
  const flushTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  const FLUSH_DELAY_MS = 2500;

  function scheduleFlush(speaker: string) {
    const existing = flushTimers.get(speaker);
    if (existing) clearTimeout(existing);
    flushTimers.set(speaker, setTimeout(() => {
      speakerBuffer.delete(speaker);
      flushTimers.delete(speaker);
    }, FLUSH_DELAY_MS));
  }

  function processCaption(el: HTMLElement) {
    const rawText = el.textContent?.trim() || '';
    if (!rawText || rawText.length < 2) return;

    const isCaptionEl =
      el.getAttribute?.('jsname') === 'tgaKEf' ||
      el.closest('[jsname="dsyhDe"]') ||
      el.closest('.a4cQT') ||
      el.classList.contains('KcIKyf');
    if (!isCaptionEl) return;

    const domSpeaker = extractDomSpeaker(el);
    console.log('[AxythicNote] domSpeaker:', domSpeaker, '| rawText:', rawText.slice(0, 60));

    const r = extractSpeech(rawText, domSpeaker);
    if (!r) return;

    const [speaker, fullCaptionText] = r;
    const prevBuffer = speakerBuffer.get(speaker) || '';
    const newTail = extractNewTail(prevBuffer, fullCaptionText);

    if (newTail && newTail.length >= 2) {
      const updatedBuffer = prevBuffer ? prevBuffer + ' ' + newTail : newTail;
      // Keep buffer bounded to last 120 words.
      const bufWords = updatedBuffer.split(/\s+/);
      speakerBuffer.set(speaker, bufWords.slice(-120).join(' '));
      tryEmit(speaker, newTail);
    }

    scheduleFlush(speaker);
  }

  function processMutations() {
    rafPending = false;
    const batch = pendingMutations.splice(0);
    batch.forEach(mutation => {
      if (mutation.type !== 'childList') return;
      mutation.addedNodes.forEach(node => {
        const el = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node) as HTMLElement | null;
        if (!el || el === document.body) return;
        processCaption(el);
      });
    });
  }

  function onMutation(mutations: MutationRecord[]) {
    pendingMutations.push(...mutations);
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(processMutations);
    }
  }

  function attachObserver() {
    const container = findCaptionContainer();
    if (!container) return;
    if (currentObserver) currentObserver.disconnect();
    currentObserver = new MutationObserver(onMutation);
    currentObserver.observe(container, { childList: true, subtree: true });
    console.log('[AxythicNote] Observing captions area.');
  }

  attachObserver();

  const interval = setInterval(() => {
    const container = findCaptionContainer();
    if (container && !currentObserver) attachObserver();
  }, 3000);

  return () => {
    clearInterval(interval);
    flushTimers.forEach(t => clearTimeout(t));
    flushTimers.clear();
    speakerBuffer.clear();
    if (currentObserver) {
      currentObserver.disconnect();
      currentObserver = null;
    }
    console.log('[AxythicNote] Observer disconnected.');
  };
}
