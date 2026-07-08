// 3.3 — shown when the user accepted an older (or no) version of a legal
// document that's since been republished with requiresReacceptance=true.
// Kept deliberately small/dismissable-per-item rather than a blocking modal —
// blocking auth entirely on this would need its own dedicated design pass.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

const C = {
  warning: '#FBBF24', warningDim: 'rgba(251,191,36,0.1)',
  text: '#F5F7FA', muted: '#7E8FA3', border: '#1E3340',
}

const PAGE_BY_CONSENT_TYPE = { TERMS: 'terms', PRIVACY_POLICY: 'privacy' }
const LABEL_BY_CONSENT_TYPE = { TERMS: 'Termos de Utilização', PRIVACY_POLICY: 'Política de Privacidade' }

export default function LegalReacceptanceBanner() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [accepting, setAccepting] = useState(null)
  const pending = user?.pendingLegalReacceptance || []

  if (pending.length === 0) return null

  const accept = async (consentType) => {
    setAccepting(consentType)
    try {
      await api.post('/auth/consents/reaccept', { consentType })
      await refreshUser()
    } finally {
      setAccepting(null)
    }
  }

  return (
    <div style={{ background: C.warningDim, borderBottom: `1px solid ${C.border}`, padding: '10px 16px' }}>
      {pending.map(item => (
        <div key={item.consentType} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12.5, color: C.text, marginBottom: 4 }}>
          <span>
            Atualizámos {LABEL_BY_CONSENT_TYPE[item.consentType] || item.consentType} (v{item.currentVersion}).{' '}
            <span onClick={() => navigate(`/legal/${PAGE_BY_CONSENT_TYPE[item.consentType] || 'terms'}`)}
              style={{ color: C.warning, textDecoration: 'underline', cursor: 'pointer' }}>
              Ler
            </span>
          </span>
          <button onClick={() => accept(item.consentType)} disabled={accepting === item.consentType}
            style={{ background: 'none', border: `1px solid ${C.warning}`, color: C.warning, borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {accepting === item.consentType ? '…' : 'Aceitar'}
          </button>
        </div>
      ))}
    </div>
  )
}
