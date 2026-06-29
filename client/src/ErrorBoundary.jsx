import { Component } from 'react'

const colors = {
  bg: '#0E0818', accent: '#C9956B', rose: '#F2C4B8',
  white: '#FAF7F5', muted: '#7A6E88', plum: '#2D1B4E'
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 32,
            fontStyle: 'italic', marginBottom: 8,
            background: `linear-gradient(135deg,${colors.accent},${colors.rose})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Between Us
          </div>
          <div style={{ fontSize: 40, marginBottom: 16 }}>😔</div>
          <div style={{ color: colors.white, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Algo correu mal
          </div>
          <div style={{ color: colors.muted, fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
            Ocorreu um erro inesperado. Tenta recarregar a página.
          </div>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <pre style={{ background: colors.plum, borderRadius: 10, padding: 12,
              color: '#E05C7A', fontSize: 11, textAlign: 'left', overflowX: 'auto',
              marginBottom: 20, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {this.state.error.toString()}
            </pre>
          )}
          <button onClick={() => window.location.reload()}
            style={{ background: `linear-gradient(135deg,${colors.accent},${colors.rose})`,
              border: 'none', borderRadius: 50, padding: '13px 32px', fontSize: 14,
              fontWeight: 700, color: '#1A0A2E', cursor: 'pointer', width: '100%' }}>
            Recarregar
          </button>
        </div>
      </div>
    )
  }
}
