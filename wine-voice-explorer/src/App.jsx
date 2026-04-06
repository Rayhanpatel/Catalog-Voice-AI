import React, { useState, useEffect, useRef, useCallback } from 'react';
import VoiceButton from './components/VoiceButton.jsx';
import WineCard from './components/WineCard.jsx';
import {
  buildRecommendationTurnResult,
  loadWines,
  normalizeWineSpeechTranscript,
  parseQuery,
  buildWineCatalog,
  retrieveRelevantWines,
  resetWineCache,
} from './utils/wineEngine.js';
import { askWineQuestionStream } from './utils/llm.js';
import {
  getSpeechInputRuntimeState,
  isHandsFreeInputSupported,
  pauseHandsFreeInput,
  startHandsFreeInput,
  stopHandsFreeInput,
  primeSpeechSynthesisVoices,
  resumeHandsFreeInput,
  createProgressiveSpeaker,
  stopSpeaking,
  subscribeSpeechInputRuntime,
} from './utils/voice.js';

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_HISTORY_TURNS = 5; // Keep last N Q/A pairs for conversation memory

// ── Helpers ────────────────────────────────────────────────────────────────

/** Strip markdown bold/italic so AI formatting doesn't appear in text or TTS. */
function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1') // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1');     // *italic* → italic
}

// ── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [voiceMode, setVoiceMode] = useState(false);
  const [interimText, setInterimText] = useState('');
  const voiceModeRef = useRef(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [speechInputRuntime, setSpeechInputRuntime] = useState(() => getSpeechInputRuntimeState());
  const [textInput, setTextInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const chatEndRef = useRef(null);
  const nextMsgIdRef = useRef(0);

  // Conversation memory
  const conversationHistoryRef = useRef([]);
  const lastFiltersRef = useRef(null);

  // Active stream abort function
  const abortStreamRef = useRef(null);
  // Active progressive speaker
  const speakerRef = useRef(null);
  // Ref mirror of isThinking for synchronous double-submit guard
  const isThinkingRef = useRef(false);
  // Ref kept in sync with handleQuestion so voice mode's onSilence callback
  // always calls the latest version even if wines/apiKey changed mid-session
  const handleQuestionRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortStreamRef.current) abortStreamRef.current();
      if (speakerRef.current) speakerRef.current.stop();
      stopHandsFreeInput();
    };
  }, []);

  useEffect(() => {
    return subscribeSpeechInputRuntime((state) => {
      setSpeechInputRuntime(state);
    });
  }, []);

  // Load wine data on mount
  useEffect(() => {
    loadWines()
      .then((data) => {
        setWines(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load wines:', err);
        setLoadError(err.message || 'Failed to load wine data');
        setLoading(false);
      });

    // Pre-load voices
    primeSpeechSynthesisVoices();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, interimText, streamingText]);

  // ── Core question handling (streaming) ────────────────────────────────

  const handleQuestion = useCallback(
    (question) => {
      if (!question.trim() || isThinkingRef.current) return;

      // Stop any ongoing speech and abort any active stream
      if (speakerRef.current) {
        speakerRef.current.stop();
          speakerRef.current = null;
        }
        stopSpeaking();
        setIsSpeakingState(false);

        if (abortStreamRef.current) {
        abortStreamRef.current();
        abortStreamRef.current = null;
      }

      // Add user message
      setMessages((prev) => [...prev, { id: nextMsgIdRef.current++, role: 'user', text: question }]);
      isThinkingRef.current = true;
      setIsThinking(true);
      setStreamingText('');

      // Parse and filter (with carry-forward from previous turn)
      const filters = parseQuery(question, lastFiltersRef.current);
      const retrieval = retrieveRelevantWines(wines, filters, 40);
      const relevant = retrieval.matches;
      const preface = retrieval.spokenPreface ? `${retrieval.spokenPreface} ` : '';
      const catalog = buildWineCatalog(relevant);

      // Save filters for next turn's carry-forward
      lastFiltersRef.current = filters;

      // Create progressive speaker for streaming TTS
      const speaker = createProgressiveSpeaker({
        onSpeakStart: () => {
          setIsSpeakingState(true);
          pauseHandsFreeInput(); // Stop mic processing while AI speaks
        },
        onEnd: () => {
          setIsSpeakingState(false);
          // Resume after short delay so echo doesn't trigger immediately
          setTimeout(() => {
            if (voiceModeRef.current) resumeHandsFreeInput();
          }, 900); // 900ms — enough for room echo to clear before mic re-activates
        },
      });
      speakerRef.current = speaker;

      if (preface) {
        speaker.feed(preface);
      }

      // Start streaming
      const abort = askWineQuestionStream(question, catalog, conversationHistoryRef.current, {
        retrievalNote: retrieval.retrievalNote,
        onChunk: (chunk, fullText) => {
          setStreamingText(`${preface}${fullText}`.trim());
          // Feed chunk to progressive speaker for sentence-by-sentence TTS
          speaker.feed(chunk);
        },
        onDone: (rawText) => {
          const fullText = `${preface}${stripMarkdown(rawText)}`.trim();
          const recommendationTurn = buildRecommendationTurnResult(fullText, retrieval, 5);
          isThinkingRef.current = false;
          setIsThinking(false);
          setStreamingText('');

          // Signal the speaker that the stream is complete
          speaker.finish();

          // Add assistant message
          setMessages((prev) => [
            ...prev,
            { id: nextMsgIdRef.current++, role: 'assistant', text: recommendationTurn.answerText, wines: recommendationTurn.cards },
          ]);

          // Update conversation history (sliding window)
          conversationHistoryRef.current = [
            ...conversationHistoryRef.current,
            { role: 'user', text: question },
            { role: 'assistant', text: fullText },
          ].slice(-MAX_HISTORY_TURNS * 2); // Keep last N turns (each turn = 2 entries)

          abortStreamRef.current = null;
        },
        onError: (err) => {
          console.error('Stream error:', err);
          isThinkingRef.current = false;
          setIsThinking(false);
          setStreamingText('');
          speaker.stop();

          const errorMsg =
            err.message.includes('401')
              ? 'The explorer could not reach Vertex AI. Check your local gcloud authentication and try again.'
              : err.message.includes('403')
              ? 'The explorer could not access the Google project. Confirm Vertex AI and Cloud TTS are enabled.'
              : `Something went wrong: ${err.message}`;
          setMessages((prev) => [
            ...prev,
            { id: nextMsgIdRef.current++, role: 'assistant', text: errorMsg, isError: true },
          ]);

          abortStreamRef.current = null;
        },
      });

      abortStreamRef.current = abort;
    },
    [wines]
  );

  // Keep ref in sync on every render so voice mode callbacks are never stale
  handleQuestionRef.current = handleQuestion;

  // ── Voice mode (GPT-style: always-on, auto-submit, interrupt) ────────

  const stopVoiceMode = useCallback(() => {
    voiceModeRef.current = false;
    setVoiceMode(false);
    setInterimText('');
    stopHandsFreeInput();
  }, []);

  const startVoiceMode = useCallback(() => {
    voiceModeRef.current = true;
    setVoiceMode(true);
    setInterimText('');

    void startHandsFreeInput({
      onSpeechStart: () => {
        // Interrupt AI immediately when user speaks
        if (speakerRef.current) {
          speakerRef.current.stop();
          speakerRef.current = null;
        }
        stopSpeaking();
        setIsSpeakingState(false);
        resumeHandsFreeInput(); // un-suppress mic so the user's words are captured
      },
      onInterim: (text) => setInterimText(text),
      onSilence: (transcript) => {
        setInterimText('');
        const normalizedTranscript = normalizeWineSpeechTranscript(transcript.trim());
        if (normalizedTranscript) handleQuestionRef.current(normalizedTranscript);
      },
      onError: (err) => console.error('Voice mode error:', err),
      languageProfile: 'auto',
    });
  }, []);

  const toggleVoiceMode = useCallback(() => {
    if (voiceModeRef.current) {
      stopVoiceMode();
    } else {
      startVoiceMode();
    }
  }, [startVoiceMode, stopVoiceMode]);

  // ── Text input handler ────────────────────────────────────────────────

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim()) {
      handleQuestion(textInput.trim());
      setTextInput('');
    }
  };

  // ── Stop speaking ─────────────────────────────────────────────────────

  const handleStopSpeaking = () => {
    if (speakerRef.current) {
      speakerRef.current.stop();
      speakerRef.current = null;
    }
    stopSpeaking();
    setIsSpeakingState(false);
  };

  // ── Retry loading wines ───────────────────────────────────────────────

  const handleRetryLoad = () => {
    setLoading(true);
    setLoadError(null);
    resetWineCache();
    loadWines()
      .then((data) => {
        setWines(data);
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(err.message || 'Failed to load wine data');
        setLoading(false);
      });
  };

  // ── Render: Loading / Error ───────────────────────────────────────────

  if (loading || loadError) {
    return (
      <div className="app">
        <div className="key-screen">
          <div className="key-screen-inner">
            <h1 className="brand">Wine Voice Explorer</h1>
            {loadError ? (
              <>
                <p className="brand-sub" style={{ color: 'var(--wine-red-light)' }}>
                  {loadError}
                </p>
                <button onClick={handleRetryLoad} className="key-submit" style={{ marginTop: '16px' }}>
                  Retry
                </button>
              </>
            ) : (
              <p className="brand-sub loading-text">Loading wine collection...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Main chat ─────────────────────────────────────────────────

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1 className="header-title">Wine Voice Explorer</h1>
        <div className="header-right">
          <span className="header-count">{wines.length} wines</span>
        </div>
      </header>

      {/* Chat area */}
      <main className="chat-area">
        {messages.length === 0 && !isThinking && (
          <div className="empty-state">
            <div className="empty-icon">🍷</div>
            <h2 className="empty-title">Ask me anything about wine</h2>
            <p className="empty-sub">
              Tap the microphone or type a question below
            </p>
            <div className="example-queries">
              {[
                'Which are the best-rated wines under $50?',
                'What do you have from Burgundy?',
                'What\'s the most expensive bottle you have?',
                'Which bottles would make a good housewarming gift?',
              ].map((q) => (
                <button
                  key={q}
                  className="example-query"
                  onClick={() => handleQuestion(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message message-${msg.role}`}>
            <div className={`bubble bubble-${msg.role} ${msg.isError ? 'bubble-error' : ''}`}>
              {msg.text}
            </div>
            {msg.wines && msg.wines.length > 0 && (
              <div className="wine-cards-row">
                {msg.wines.map((w, j) => (
                  <WineCard key={`${msg.id}-${j}`} wine={w} />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Streaming response (shows progressively as chunks arrive) */}
        {isThinking && streamingText && (
          <div className="message message-assistant">
            <div className="bubble bubble-assistant bubble-streaming">
              {streamingText}
              <span className="streaming-cursor" />
            </div>
          </div>
        )}

        {/* Thinking indicator (before first chunk arrives) */}
        {isThinking && !streamingText && (
          <div className="message message-assistant">
            <div className="bubble bubble-assistant bubble-thinking">
              <span className="dot-pulse"><span className="dot" /></span>
              Thinking...
            </div>
          </div>
        )}

        {interimText && (
          <div className="message message-user">
            <div className="bubble bubble-user bubble-interim">{interimText}</div>
          </div>
        )}

        <div ref={chatEndRef} />
      </main>

      {/* Input bar */}
      <footer className="input-bar">
        {voiceMode && (
          <div className="voice-mode-bar">
            <span className="voice-mode-dot" />
            {isThinking
              ? 'Thinking…'
              : isSpeakingState
              ? 'Speaking — say anything to interrupt'
              : speechInputRuntime.isTranscribing
              ? 'Transcribing…'
              : speechInputRuntime.isRecording
              ? 'Listening…'
              : 'Mic armed'}
          </div>
        )}
        {!voiceMode && isSpeakingState && (
          <button className="stop-speaking-btn" onClick={handleStopSpeaking}>
            Stop Speaking
          </button>
        )}
        <form onSubmit={handleTextSubmit} className="text-form">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a question about wine..."
            className="text-input"
            disabled={isThinking}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={!textInput.trim() || isThinking}
            aria-label="Send"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
        <VoiceButton
          isListening={voiceMode}
          onClick={toggleVoiceMode}
          disabled={!isHandsFreeInputSupported()}
        />
        {!isHandsFreeInputSupported() && (
          <p className="voice-unsupported">
            Voice input not supported in this browser. Use Chrome for full experience.
          </p>
        )}
      </footer>
    </div>
  );
}
