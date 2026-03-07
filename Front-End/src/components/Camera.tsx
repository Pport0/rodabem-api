interface CameraProps {
  onBack: () => void;
}

export default function Camera({ onBack }: CameraProps) {
  return (
    <div className="screen camera-screen">
      {/* Viewfinder area */}
      <div className="camera-viewfinder">
        {/* Top right flash icon */}
        <div className="camera-top-bar">
          <div className="camera-flash-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
        </div>

        {/* Document frame guide */}
        <div className="camera-frame-guide" />
      </div>

      {/* Bottom controls */}
      <div className="camera-controls">
        {/* Close button */}
        <button className="camera-ctrl-btn" onClick={onBack}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Shutter */}
        <button className="camera-shutter">
          <div className="camera-shutter-inner" />
        </button>

        {/* Rotate/flip button */}
        <button className="camera-ctrl-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>

      {/* PHOTO label */}
      <div className="camera-label">PHOTO</div>
    </div>
  );
}
