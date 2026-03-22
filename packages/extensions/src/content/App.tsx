import { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, X, ChevronDown, Activity, List, Settings, Search, Trash2, CheckCircle2, Star, Upload, LogIn, User } from 'lucide-react';
import { setupCaptionObserver, Segment } from './observer';

interface AppProps {
  platform: { id: string; name: string };
}

export default function App({ platform }: AppProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [tab, setTab] = useState<'live'|'highlights'|'settings'>('live');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isInvalidated, setIsInvalidated] = useState(false);
  const [, setParticipants] = useState<string[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<{name: string, isTyping: boolean} | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Auth & Save state ─────────────────────────────────────────────────────
  const [authUser, setAuthUser]     = useState<{ email: string; displayName: string | null } | null>(null);
  const [isSaving, setIsSaving]     = useState(false);
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null);

  // Helper to check context
  const checkContext = () => {
    if (!chrome.runtime?.id) {
      setIsInvalidated(true);
      return false;
    }
    return true;
  };

  // ── Check auth status on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!checkContext()) return;
    chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res?.user) setAuthUser(res.user);
    });
  }, []);

  // Load persistence
  useEffect(() => {
    if (checkContext()) {
      chrome.storage.local.get(['axy_segments', 'axy_starred', 'axy_autoscroll'], (result) => {
        if (chrome.runtime?.lastError) return;
        if (result.axy_segments) setSegments(result.axy_segments);
        if (result.axy_starred) setStarredIds(result.axy_starred);
        if (result.axy_autoscroll !== undefined) setAutoScroll(result.axy_autoscroll);
      });
    }
  }, []);

  // Save persistence
  useEffect(() => {
    if (checkContext() && segments.length > 0) {
      chrome.storage.local.set({
        axy_segments: segments,
        axy_starred: starredIds,
        axy_autoscroll: autoScroll
      }, () => {
        if (chrome.runtime?.lastError) {
          console.warn('[AxythicNote] Failed to save segments: Context invalidated');
          setIsInvalidated(true);
        }
      });
    }
  }, [segments, starredIds, autoScroll]);

  // Handle Context Invalidation on click/interaction
  useEffect(() => {
    const handleAction = () => checkContext();
    window.addEventListener('mousedown', handleAction);
    return () => window.removeEventListener('mousedown', handleAction);
  }, []);

  // Mount Observer
  useEffect(() => {
    if (platform.name === 'Google Meet') {
       const cleanup = setupCaptionObserver({
         onSegment: (seg) => setSegments(prev => {
           // Guard against duplicate IDs from rapid re-emissions.
           if (prev.length > 0 && prev[prev.length - 1].id === seg.id) return prev;
           return [...prev, seg];
         }),
         onParticipantsActive: (list) => setParticipants(list),
         onSpeakerChange: (name) => setActiveSpeaker({ name, isTyping: true })
       });
       return cleanup;
    }
  }, [platform.name]);

  // Handle Auto-Scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments, autoScroll]);

  // Turn off typing after delay
  useEffect(() => {
    if (activeSpeaker?.isTyping) {
      const t = setTimeout(() => {
        setActiveSpeaker(p => p ? { ...p, isTyping: false } : null);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [activeSpeaker]);

  // Clear save result after 4 seconds
  useEffect(() => {
    if (saveResult) {
      const t = setTimeout(() => setSaveResult(null), 4000);
      return () => clearTimeout(t);
    }
  }, [saveResult]);

  const [copySuccess, setCopySuccess] = useState(false);

  const toggleStar = (id: string) => {
    setStarredIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCopyAll = () => {
    if (segments.length === 0) return;
    const text = segments.map(s => `${s.speaker} [${s.timestamp}]: ${s.text}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleDownload = () => {
    if (segments.length === 0) return;
    const text = segments.map(s => `${s.speaker} [${s.timestamp}]: ${s.text}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axythic-transcript-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Save Meeting to Backend ───────────────────────────────────────────────
  const handleSaveMeeting = () => {
    if (segments.length === 0 || isSaving) return;
    if (!checkContext()) return;

    setIsSaving(true);
    setSaveResult(null);

    // Build the transcript text from segments
    const transcript = segments
      .map(s => `${s.speaker} [${s.timestamp}]: ${s.text}`)
      .join('\n');

    // Collect unique participant names
    const participants = [...new Set(segments.map(s => s.speaker))];

    chrome.runtime.sendMessage({
      type: 'SAVE_MEETING',
      transcript,
      participants,
      title: `${platform.name} Meeting — ${new Date().toLocaleString()}`,
    }, (res) => {
      setIsSaving(false);
      if (chrome.runtime.lastError) {
        setSaveResult('error');
        return;
      }
      if (res?.success) {
        setSaveResult('success');
      } else {
        setSaveResult('error');
      }
    });
  };

  // ── Open popup for sign-in ────────────────────────────────────────────────
  const handleSignInClick = () => {
    if (!checkContext()) return;
    // Trigger Google sign-in from the background
    chrome.runtime.sendMessage({ type: 'SIGN_IN_GOOGLE' }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res?.success && res.user) {
        setAuthUser(res.user);
      }
    });
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all transcript segments?')) {
      setSegments([]);
      setStarredIds([]);
    }
  };

  const filteredSegments = useMemo(() => {
    if (!searchTerm) return segments;
    const low = searchTerm.toLowerCase();
    return segments.filter(s =>
      s.text.toLowerCase().includes(low) || s.speaker.toLowerCase().includes(low)
    );
  }, [segments, searchTerm]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-0 right-0 w-12 h-12 rounded-full bg-an-bg2 border border-an-border2 shadow-2xl flex items-center justify-center text-an-text hover:scale-110 transition-transform hover:border-an-accent"
        title="Show Axythic Note"
      >
        <Mic size={24} className="text-an-accent" />
      </button>
    );
  }

  return (
    <div className="flex flex-col w-[360px] h-[560px] bg-an-bg rounded-2xl border border-an-border2 shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden font-sans text-[13px] text-an-text">

      {/* HEADER */}
      <header className="shrink-0 bg-an-bg2 border-b border-an-border px-3.5 pt-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6.5 h-6.5 bg-an-accentbg rounded-md flex items-center justify-center text-an-accent2 text-[13px]">🎙</div>
            <span className="font-bold tracking-tight text-[14px]">Axythic Note</span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Auth indicator */}
            {authUser ? (
              <div
                className="flex items-center gap-1.5 bg-an-greenbg border border-an-green/20 px-2 py-0.5 rounded-md text-[10px] font-semibold text-an-green"
                title={authUser.email}
              >
                <User size={10} />
                <span className="max-w-[80px] truncate">{authUser.displayName || authUser.email}</span>
              </div>
            ) : (
              <button
                onClick={handleSignInClick}
                className="flex items-center gap-1 bg-an-accentbg border border-an-accent/30 px-2 py-0.5 rounded-md text-[10px] font-semibold text-an-accent2 hover:bg-an-accent/20 transition-colors"
                title="Sign in to save meetings"
              >
                <LogIn size={10} />
                Sign In
              </button>
            )}
            <button
              onClick={() => setIsVisible(false)}
              className="w-[26px] h-[26px] flex items-center justify-center rounded-md text-an-text3 hover:bg-an-bg3 hover:text-an-text transition-colors"
              title="Minimize"
            >
              <ChevronDown size={16} />
            </button>
            <button
              onClick={handleClearAll}
              className="w-[26px] h-[26px] flex items-center justify-center rounded-md text-an-text3 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              title="Clear Transcript"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 bg-an-bg3 border border-an-border px-2 py-1 rounded-md text-[11px] font-semibold text-an-text2">
            <span>🟢</span> <span>{platform.name}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-an-greenbg border border-an-green/20 px-2 py-1 rounded-md text-[11px] font-semibold text-an-green">
            <span className="w-1.5 h-1.5 bg-an-green rounded-full animate-pulse"></span>
            <span>Recording</span>
          </div>
        </div>

        {/* INVALIDATED NOTICE */}
        {isInvalidated && (
          <div className="bg-red-500/20 border border-red-500/30 p-2 mx-3.5 mb-2.5 rounded-lg flex items-center gap-2.5 animate-pulse">
            <X size={14} className="text-red-400 shrink-0" />
            <div className="text-[10px] text-red-100 font-bold uppercase leading-tight">
              Extension Updated. <button onClick={() => window.location.reload()} className="underline hover:text-white">Refresh page</button> to continue capturing.
            </div>
          </div>
        )}

        {/* SAVE RESULT BANNER */}
        {saveResult === 'success' && (
          <div className="bg-an-greenbg border border-an-green/30 p-2 mb-2.5 rounded-lg flex items-center gap-2.5">
            <CheckCircle2 size={14} className="text-an-green shrink-0" />
            <div className="text-[11px] text-an-green font-bold">
              Meeting saved! View it in your <button onClick={() => window.open('http://localhost:3000', '_blank')} className="underline hover:text-white">Dashboard</button>.
            </div>
          </div>
        )}
        {saveResult === 'error' && (
          <div className="bg-red-500/20 border border-red-500/30 p-2 mb-2.5 rounded-lg flex items-center gap-2.5">
            <X size={14} className="text-red-400 shrink-0" />
            <div className="text-[11px] text-red-300 font-bold">
              Failed to save. {!authUser ? 'Please sign in first.' : 'Check server connection.'}
            </div>
          </div>
        )}

        {/* TABS */}
        <div className="flex border-b border-an-border -mx-3.5 px-3.5">
          {[
            { id: 'live', icon: Activity, label: 'Live' },
            { id: 'highlights', icon: List, label: 'Highlights' },
            { id: 'settings', icon: Settings, label: 'Settings' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-[11px] font-semibold border-b-2 -mb-[1px] transition-colors ${
                tab === t.id ? 'text-an-accent2 border-an-accent' : 'text-an-text3 border-transparent hover:text-an-text2'
              }`}
            >
              <t.icon size={12} strokeWidth={2.5} />
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* CONTENT */}
      {tab === 'live' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="shrink-0 p-3 pt-2.5 pb-2 relative">
            <Search size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-an-text3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search transcript..."
              className="w-full bg-an-bg3 border border-an-border rounded-lg py-1.5 px-2.5 pl-8 text-[12px] text-an-text outline-none focus:border-an-accent transition-colors placeholder:text-an-text3"
            />
          </div>

          <div
            ref={scrollRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 40;
              setAutoScroll(isAtBottom);
            }}
            className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1 an-scrollbar scroll-smooth"
          >
            {filteredSegments.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center gap-2.5 p-8 text-center uppercase tracking-widest opacity-40">
                 {searchTerm ? (
                   <>
                    <Search size={24} />
                    <div className="text-[10px] font-bold">No matches found</div>
                   </>
                 ) : (
                   <>
                    <Mic size={32} />
                    <div className="text-[10px] font-bold">Waiting for audio…</div>
                   </>
                 )}
               </div>
            ) : (
              filteredSegments.map((seg, idx) => {
                const prev = filteredSegments[idx - 1];
                const showSpeaker = !prev || prev.speaker !== seg.speaker;
                const isStarred = starredIds.includes(seg.id);

                return (
                  <div key={seg.id} className={`p-2 px-3 rounded-xl transition-all animate-an-fade-in group hover:bg-an-bg3/20 ${showSpeaker ? 'mt-2' : 'mt-0.5'}`}>
                    {showSpeaker && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-5 h-5 rounded-full bg-an-accentbg text-an-accent2 text-[9px] font-black flex items-center justify-center shadow-sm">
                          {seg.speaker.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[11px] font-bold text-an-text flex-1 uppercase tracking-tight">{seg.speaker}</span>
                        <span className="font-mono text-[9px] text-an-text3 opacity-0 group-hover:opacity-100 transition-opacity">{seg.timestamp}</span>
                      </div>
                    )}
                    <div className="relative">
                      <div className={`text-[13px] leading-[1.6] text-an-text2 font-medium pr-6 ${showSpeaker ? 'pl-7' : 'pl-7'}`}>
                        {seg.text}
                      </div>
                      <button
                        onClick={() => toggleStar(seg.id)}
                        className={`absolute right-0 top-0 p-1 rounded-md transition-opacity ${isStarred ? 'text-yellow-400 opacity-100' : 'text-an-text3 opacity-0 group-hover:opacity-100 hover:text-yellow-400 hover:bg-an-bg3'}`}
                        title={isStarred ? "Remove highlight" : "Highlight"}
                      >
                        <Star size={14} fill={isStarred ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* SPEAKING INDICATOR */}
            {activeSpeaker?.isTyping && !searchTerm && (
              <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-an-accentbg/20 border border-an-accent/10 mt-1 animate-pulse">
                <Activity size={12} className="text-an-accent" />
                <span className="text-[11px] font-bold text-an-accent uppercase tracking-tighter">
                  {activeSpeaker.name} is speaking...
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'highlights' && (
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1 an-scrollbar scroll-smooth">
          {segments.filter(s => starredIds.includes(s.id)).length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-an-text3 p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-an-bg3 flex items-center justify-center mb-4">
                <Star size={20} />
              </div>
              <div className="font-bold text-[12px] uppercase tracking-widest mb-2">
                No highlights
              </div>
              <div className="text-[11px] opacity-60 leading-relaxed">
                Star important segments in the Live tab to see them here.
              </div>
            </div>
          ) : (
            segments.filter(s => starredIds.includes(s.id)).map((seg) => {
              return (
                <div key={seg.id} className="p-2 px-3 rounded-xl bg-an-bg3/30 border border-an-border transition-all group mt-2 relative">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 rounded-full bg-an-accentbg text-an-accent2 text-[9px] font-black flex items-center justify-center shadow-sm">
                      {seg.speaker.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[11px] font-bold text-an-text flex-1 uppercase tracking-tight">{seg.speaker}</span>
                    <span className="font-mono text-[9px] text-an-text3">{seg.timestamp}</span>
                  </div>
                  <div className="text-[13px] leading-[1.6] text-an-text2 font-medium pl-7 pr-6">
                    {seg.text}
                  </div>
                  <button
                    onClick={() => toggleStar(seg.id)}
                    className="absolute right-2 top-2 p-1 rounded-md text-yellow-400 hover:text-an-text3 hover:bg-an-bg3 transition-colors"
                    title="Remove highlight"
                  >
                    <Star size={14} fill="currentColor" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 an-scrollbar">
          <div className="font-bold text-[12px] uppercase tracking-widest text-an-text3 mb-2 flex items-center gap-2">
            <Settings size={14} /> Application Settings
          </div>

          {/* Auth status */}
          <div className="p-4 rounded-xl bg-an-bg3/30 border border-an-border">
            <div className="text-[13px] font-bold text-an-text mb-1">Account</div>
            {authUser ? (
              <div className="text-[11px] text-an-green">
                Signed in as <strong>{authUser.email}</strong>
              </div>
            ) : (
              <div className="text-[11px] text-an-text3">
                Not signed in. Click <strong>Sign In</strong> in the header to connect your account.
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-an-bg3/30 border border-an-border flex items-center justify-between">
            <div>
              <div className="text-[13px] font-bold text-an-text mb-1">Auto-scroll Transcript</div>
              <div className="text-[11px] text-an-text3">Automatically scroll to the newest messages</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-an-bg3 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-an-text after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-an-accent"></div>
            </label>
          </div>

          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-bold text-red-500 mb-1">Clear Data</div>
              <div className="text-[11px] text-an-text3">Erase all saved transcripts and highlights</div>
            </div>
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[11px] font-bold tracking-tight transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="shrink-0 bg-an-bg2 border-t border-an-border px-3.5 py-3 flex items-center justify-between shadow-[0_-8px_16px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-2 text-[10px] text-an-text3 font-bold uppercase tracking-widest">
          <span className="w-2 h-2 bg-an-green rounded-full shadow-[0_0_8px_#10b981]"></span>
          System Online
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopyAll}
            disabled={segments.length === 0}
            className={`rounded-lg px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-tight transition-all border flex items-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none ${
              copySuccess
                ? 'bg-an-greenbg border-an-green text-an-green'
                : 'bg-an-bg3 border-an-border2 text-an-text2 hover:border-an-accent hover:text-an-accent2 shadow-sm'
            }`}
          >
            {copySuccess ? <CheckCircle2 size={12} /> : null}
            {copySuccess ? 'Copied' : 'Copy All'}
          </button>
          <button
            onClick={handleDownload}
            disabled={segments.length === 0}
            className="bg-an-bg3 border border-an-border2 rounded-lg px-3.5 py-1.5 text-an-text2 text-[10px] font-bold uppercase tracking-tight hover:border-an-accent hover:text-an-accent2 transition-all shadow-sm disabled:opacity-30 disabled:pointer-events-none"
          >
            Export TXT
          </button>
          {/* SAVE MEETING button — the key new feature */}
          <button
            onClick={handleSaveMeeting}
            disabled={segments.length === 0 || isSaving}
            className={`rounded-lg px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-tight transition-all border flex items-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none ${
              isSaving
                ? 'bg-an-accentbg border-an-accent/40 text-an-accent2 animate-pulse'
                : 'bg-an-accent border-an-accent text-white hover:bg-an-accent2 shadow-sm'
            }`}
            title={!authUser ? 'Sign in first to save meetings' : 'Save meeting transcript to your dashboard'}
          >
            <Upload size={12} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </footer>
    </div>
  );
}
