"use client";

export default function PrintActions() {
  return (
    <div className="no-print" style={{ position: "fixed", top: 16, left: 16, display: "flex", gap: 8, zIndex: 100 }}>
      <button
        onClick={() => window.print()}
        style={{
          background: "#DD9933", color: "white", border: "none", padding: "10px 20px",
          borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
        }}
      >
        📄 הורד/הדפס PDF
      </button>
      <button
        onClick={() => window.close()}
        style={{
          background: "#e5e7eb", color: "#374151", border: "none", padding: "10px 20px",
          borderRadius: 8, cursor: "pointer", fontSize: 14, fontFamily: "inherit",
        }}
      >
        ✕ סגור
      </button>
    </div>
  );
}
