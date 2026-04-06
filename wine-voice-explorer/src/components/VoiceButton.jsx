import React from 'react';

export default function VoiceButton({ isListening, onClick, disabled }) {
  return (
    <button
      className={`voice-btn ${isListening ? 'voice-btn-active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={isListening ? 'Stop listening' : 'Start listening'}
      title={isListening ? 'Listening... click to stop' : 'Click to ask a question'}
    >
      {isListening && (
        <div className="voice-rings">
          <div className="voice-ring voice-ring-1" />
          <div className="voice-ring voice-ring-2" />
          <div className="voice-ring voice-ring-3" />
        </div>
      )}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    </button>
  );
}
