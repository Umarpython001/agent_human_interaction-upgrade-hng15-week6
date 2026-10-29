// Top navigation, mirroring the header in the Ziki screenshots.
// Presentational only — no state, no routing (single-page demo).

function ZikiMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#2563EB" />
      <path d="M9 8h14v3.4L15.8 20H23v3.6H9v-3.4L16.2 12H9z" fill="#fff" />
    </svg>
  );
}

export default function TopNav() {
  return (
    <header className="topnav">
      <div className="topnav-left">
        <span className="brand">
          <span className="brand-mark">
            <ZikiMark />
          </span>
          ziki
        </span>
        <span className="topnav-divider" aria-hidden="true" />
        <button type="button" className="workspace-btn">
          Zedu <span aria-hidden="true">▾</span>
        </button>
      </div>

      <nav className="topnav-center" aria-label="Sections">
        <button type="button" className="nav-item active" aria-current="page">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="3.5" fill="currentColor" />
          </svg>
          Product
        </button>
        <button type="button" className="nav-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 9v6h4l5 4V5L8 9H4z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d="M17 9c1 1 1 5 0 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Marketing
        </button>
        <button type="button" className="nav-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 19.3 5 15.4 5 11V6l7-3z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
          Security
        </button>
      </nav>

      <div className="topnav-right">
        <button type="button" className="agents-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="7" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
            <circle cx="9.5" cy="13" r="1.4" fill="currentColor" />
            <circle cx="14.5" cy="13" r="1.4" fill="currentColor" />
            <path d="M12 7V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Agents <span aria-hidden="true">▾</span>
        </button>
        <button type="button" className="user-chip">
          <span className="avatar avatar-user" aria-hidden="true">
            UO
          </span>
          <span className="user-name">Umar Olowonyo</span> <span aria-hidden="true">▾</span>
        </button>
        <span className="points-pill">
          <span aria-hidden="true">🏆</span> 1147.26 pts
        </span>
        <button type="button" className="bell" aria-label="Notifications, 27 unread">
          <span aria-hidden="true">🔔</span>
          <span className="bell-badge" aria-hidden="true">
            27
          </span>
        </button>
      </div>
    </header>
  );
}
