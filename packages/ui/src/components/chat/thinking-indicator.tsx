export function ThinkingIndicator() {
    return (
      <>
        <style>
          {`
            @keyframes thinking-dots {
              0%, 20% { opacity: 0; }
              50% { opacity: 1; }
              100% { opacity: 0; }
            }
            .thinking-dot:nth-child(1) { animation-delay: 0s; }
            .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
            .thinking-dot:nth-child(3) { animation-delay: 0.4s; }
            .thinking-dot {
              animation: thinking-dots 1.2s infinite;
              display: inline-block;
            }
          `}
        </style>
        <div style={{ color: "rgb(115 115 115)", fontSize: "0.875rem", padding: "0 0 8px 0" }}>
          <span>Thinking</span>
          <span className="thinking-dot">.</span>
          <span className="thinking-dot">.</span>
          <span className="thinking-dot">.</span>
        </div>
      </>
    );
  }