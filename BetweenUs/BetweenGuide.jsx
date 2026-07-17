"use client";

import { useState } from "react";
import guidesData from "./guides.json";

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function ArrowLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

// ─── Category color mapping ───────────────────────────────────────────────────

const CATEGORY_COLORS = {
  "relações":   { bg: "#3a2a4a", text: "#c084fc" },
  "intimidade": { bg: "#2a1a2a", text: "#e879f9" },
  "segurança":  { bg: "#2a3a1a", text: "#86efac" },
  "privacidade":{ bg: "#1a2a3a", text: "#67e8f9" },
  "educação":   { bg: "#2a2a4a", text: "#a5b4fc" },
  "plataforma": { bg: "#3a2a1a", text: "#fcd34d" },
};

function categoryStyle(category) {
  return CATEGORY_COLORS[category] || { bg: "#2a2a2a", text: "#aaa" };
}

// ─── Parse body text (bold with **text**) into JSX ───────────────────────────

function ParsedBody({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} style={{ color: "#fff", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
        }
        // Handle newlines
        return part.split("\n").map((line, j, arr) => (
          <span key={`${i}-${j}`}>
            {line}
            {j < arr.length - 1 && <br />}
          </span>
        ));
      })}
    </>
  );
}

// ─── Guide List Screen ────────────────────────────────────────────────────────

function GuideList({ guides, onSelect }) {
  return (
    <div style={styles.screen}>
      {/* Header */}
      <div style={styles.listHeader}>
        <h1 style={styles.listTitle}>Between Guide</h1>
        <p style={styles.listSubtitle}>Aprende, explora com segurança.</p>
      </div>

      {/* Cards */}
      <div style={styles.cardList}>
        {guides.map((guide) => {
          const cat = categoryStyle(guide.category);
          return (
            <button
              key={guide.id}
              style={styles.card}
              onClick={() => onSelect(guide)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#1e1e2e";
                e.currentTarget.style.borderColor = "#6c3fc5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#141420";
                e.currentTarget.style.borderColor = "#2a2a3a";
              }}
            >
              {/* Emoji */}
              <div style={styles.cardEmoji}>
                <span style={{ fontSize: 22 }}>{guide.emoji}</span>
              </div>

              {/* Content */}
              <div style={styles.cardContent}>
                <p style={styles.cardTitle}>{guide.title}</p>
                <div style={styles.cardMeta}>
                  <ClockIcon />
                  <span style={styles.cardTime}>{guide.reading_time_minutes} min leitura</span>
                </div>
              </div>

              {/* Arrow */}
              <div style={{ color: "#555", flexShrink: 0 }}>
                <ChevronRight />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Guide Detail Screen ──────────────────────────────────────────────────────

function GuideDetail({ guide, onBack }) {
  const cat = categoryStyle(guide.category);

  return (
    <div style={styles.screen}>
      {/* Top bar */}
      <div style={styles.detailTopBar}>
        <button
          style={styles.backButton}
          onClick={onBack}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#c084fc"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#888"; }}
        >
          <ArrowLeft />
        </button>
        <span style={styles.backLabel}>Guias</span>
      </div>

      {/* Hero */}
      <div style={styles.detailHero}>
        <div style={styles.detailEmoji}>{guide.emoji}</div>

        {/* Category badge */}
        <span style={{ ...styles.categoryBadge, background: cat.bg, color: cat.text }}>
          {guide.category}
        </span>

        <h1 style={styles.detailTitle}>{guide.title}</h1>

        <div style={styles.detailMeta}>
          <ClockIcon />
          <span style={styles.detailTime}>{guide.reading_time_minutes} min leitura</span>
        </div>

        <p style={styles.detailSummary}>{guide.summary}</p>

        {/* Divider */}
        <div style={styles.divider} />
      </div>

      {/* Sections */}
      <div style={styles.sectionsContainer}>
        {guide.sections.map((section, i) => (
          <div key={i} style={styles.section}>
            <h2 style={styles.sectionHeading}>{section.heading}</h2>
            <p style={styles.sectionBody}>
              <ParsedBody text={section.body} />
            </p>
          </div>
        ))}
      </div>

      {/* Tags */}
      <div style={styles.tagsContainer}>
        {guide.tags.map((tag) => (
          <span key={tag} style={styles.tag}>#{tag}</span>
        ))}
      </div>

      {/* Bottom padding */}
      <div style={{ height: 48 }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BetweenGuide() {
  const [selected, setSelected] = useState(null);

  return (
    <div style={styles.root}>
      {selected ? (
        <GuideDetail guide={selected} onBack={() => setSelected(null)} />
      ) : (
        <GuideList guides={guidesData} onSelect={setSelected} />
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0d0d18",
    color: "#e5e5f0",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    maxWidth: 600,
    margin: "0 auto",
  },

  // List
  screen: {
    display: "flex",
    flexDirection: "column",
  },
  listHeader: {
    padding: "48px 24px 24px",
  },
  listTitle: {
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
    background: "linear-gradient(135deg, #c084fc, #f59e0b)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  listSubtitle: {
    fontSize: 14,
    color: "#7c6a9a",
    margin: "6px 0 0",
    fontStyle: "italic",
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "0 16px 32px",
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "#141420",
    border: "1px solid #2a2a3a",
    borderRadius: 14,
    padding: "16px 18px",
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.15s, border-color 0.15s",
    width: "100%",
  },
  cardEmoji: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "#1e1a2e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#e5e5f0",
    margin: 0,
    lineHeight: 1.35,
  },
  cardMeta: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
    color: "#7c6a9a",
  },
  cardTime: {
    fontSize: 12,
    color: "#7c6a9a",
  },

  // Detail
  detailTopBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "20px 20px 0",
  },
  backButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#888",
    padding: 4,
    display: "flex",
    alignItems: "center",
    transition: "color 0.15s",
  },
  backLabel: {
    fontSize: 14,
    color: "#888",
  },
  detailHero: {
    padding: "28px 24px 0",
  },
  detailEmoji: {
    fontSize: 42,
    marginBottom: 14,
  },
  categoryBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "3px 10px",
    borderRadius: 20,
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#f0eeff",
    margin: 0,
    lineHeight: 1.3,
  },
  detailMeta: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    color: "#7c6a9a",
  },
  detailTime: {
    fontSize: 13,
    color: "#7c6a9a",
  },
  detailSummary: {
    fontSize: 15,
    color: "#b8b0d0",
    lineHeight: 1.65,
    marginTop: 16,
  },
  divider: {
    height: 1,
    background: "linear-gradient(90deg, #3a2a5a, transparent)",
    marginTop: 28,
  },
  sectionsContainer: {
    padding: "28px 24px 0",
    display: "flex",
    flexDirection: "column",
    gap: 32,
  },
  section: {},
  sectionHeading: {
    fontSize: 17,
    fontWeight: 700,
    color: "#c084fc",
    margin: "0 0 12px",
    lineHeight: 1.3,
  },
  sectionBody: {
    fontSize: 15,
    color: "#c5bedd",
    lineHeight: 1.75,
    margin: 0,
    whiteSpace: "pre-line",
  },
  tagsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: "32px 24px 0",
  },
  tag: {
    fontSize: 12,
    color: "#6c5a8a",
    background: "#1a1428",
    border: "1px solid #2a2040",
    borderRadius: 20,
    padding: "3px 10px",
  },
};
