// Between Us — Design System v3 (Option 3)
// Import: import { C, INP, BTN_P, BTN_S, CARD } from '../lib/design'

export const C = {
  bg:         '#0A141A',
  surface:    '#102129',
  elevated:   '#172C36',
  border:     '#1E3340',
  primary:    '#B8A7FF',
  primaryDim: 'rgba(184,167,255,0.12)',
  primaryBorder: 'rgba(184,167,255,0.3)',
  text:       '#F5F7FA',
  text2:      '#AAB6C2',
  muted:      '#7E8FA3',
  success:    '#4ADE80',
  successDim: 'rgba(74,222,128,0.12)',
  warning:    '#FBBF24',
  danger:     '#F87171',
  dangerDim:  'rgba(248,113,113,0.1)',
  teal:       '#1D9E75',
}

export const INP = {
  width: '100%',
  background: '#0F1E26',
  border: '1.5px solid #1E3340',
  borderRadius: 12,
  padding: '13px 16px',
  color: '#F5F7FA',
  fontSize: 15,
  marginBottom: 12,
  display: 'block',
  WebkitAppearance: 'none',
  outline: 'none',
  fontFamily: 'inherit',
}

export const BTN_P = {
  background: '#B8A7FF',
  border: 'none',
  borderRadius: 50,
  padding: '13px',
  fontSize: 15,
  fontWeight: 500,
  color: '#0A141A',
  cursor: 'pointer',
  minHeight: 50,
  width: '100%',
  fontFamily: 'inherit',
}

export const BTN_S = {
  background: 'none',
  border: '1px solid #1E3340',
  borderRadius: 50,
  padding: '12px',
  fontSize: 14,
  color: '#7E8FA3',
  cursor: 'pointer',
  minHeight: 48,
  fontFamily: 'inherit',
}

export const CARD = {
  background: '#102129',
  border: '1px solid #1E3340',
  borderRadius: 20,
  padding: 24,
}

export const PAGE = {
  minHeight: '100vh',
  background: '#0A141A',
  padding: 'calc(20px + env(safe-area-inset-top)) 16px calc(32px + env(safe-area-inset-bottom))',
}

export const SECTION_LABEL = {
  fontSize: 11,
  color: '#7E8FA3',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  padding: '10px 0 4px',
  display: 'block',
}

export const ROW = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '13px 0',
  borderBottom: '1px solid #1E3340',
}

// Logo SVG component helper — the two-ring symbol is the single official
// BetweenUs mark. Source of truth: brand/logo/betweenus-symbol.svg. Every
// screen that needs branding should import Logo/LogoHorizontal from here
// rather than inlining the circles again, so the mark can never drift.
export const Logo = ({ size = 32 }) => (
  <svg width={size} height={size / 2} viewBox="0 0 56 28" style={{ display: 'block' }}>
    <circle cx="18" cy="14" r="13" fill="none" stroke="#4A6B7A" strokeWidth="3.5"/>
    <circle cx="34" cy="14" r="13" fill="none" stroke="#B8A7FF" strokeWidth="2.5" opacity="0.75"/>
  </svg>
)

// Horizontal lockup: symbol + "BetweenUs" wordmark, Manrope 700.
// variant="light" -> light text, for dark backgrounds (default, matches app bg).
// variant="dark"  -> dark text, for light backgrounds.
export const LogoHorizontal = ({ height = 32, variant = 'light' }) => {
  const textColor = variant === 'dark' ? '#0A141A' : '#F5F7FA'
  return (
    <svg height={height} viewBox="0 0 230 40" style={{ display: 'block' }}>
      <g transform="translate(0,4) scale(1.1429)">
        <circle cx="18" cy="14" r="13" fill="none" stroke="#4A6B7A" strokeWidth="3.5"/>
        <circle cx="34" cy="14" r="13" fill="none" stroke="#B8A7FF" strokeWidth="2.5" opacity="0.75"/>
      </g>
      <text x="82" y="27" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="26" fill={textColor}>BetweenUs</text>
    </svg>
  )
}

export const PageHeader = ({ title, onBack, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
    {onBack && (
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#7E8FA3', fontSize: 22, cursor: 'pointer', padding: 4, minWidth: 44, minHeight: 44 }}>
        ←
      </button>
    )}
    <h1 style={{ flex: 1, fontSize: 20, fontWeight: 500, color: '#F5F7FA', margin: 0 }}>{title}</h1>
    {action}
  </div>
)

export const ErrorBanner = ({ msg }) => msg ? (
  <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 12, padding: '11px 14px', marginBottom: 14, color: '#F87171', fontSize: 14, lineHeight: 1.5 }}>
    {msg}
  </div>
) : null

export const SuccessBanner = ({ msg }) => msg ? (
  <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 12, padding: '11px 14px', marginBottom: 14, color: '#4ADE80', fontSize: 14 }}>
    {msg}
  </div>
) : null
