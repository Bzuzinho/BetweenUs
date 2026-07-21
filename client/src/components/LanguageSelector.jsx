import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { LANGUAGE_OPTIONS } from '../i18n/translations'
import api from '../lib/api'

export default function LanguageSelector({ persistAccount = false, compact = false, style = {} }) {
  const { language, setLanguage, t } = useI18n()
  const [saving, setSaving] = useState(false)

  const changeLanguage = async event => {
    const nextLanguage = event.target.value
    setLanguage(nextLanguage)
    if (!persistAccount) return

    setSaving(true)
    try {
      await api.put('/push/language', { preferredLanguage:nextLanguage })
    } finally {
      setSaving(false)
    }
  }

  return (
    <label style={{ display:'inline-flex', alignItems:'center', gap:6, color:'#7E8FA3', fontSize:12, ...style }}>
      <span aria-hidden="true">◎</span>
      <span style={{ position:'absolute', width:1, height:1, padding:0, margin:-1, overflow:'hidden', clip:'rect(0,0,0,0)', whiteSpace:'nowrap', border:0 }}>
        {t('account.appLanguage', 'Idioma')}
      </span>
      <select
        aria-label={t('account.appLanguage', 'Idioma')}
        value={language}
        onChange={changeLanguage}
        disabled={saving}
        style={{
          appearance:'none', WebkitAppearance:'none',
          background:'#102129', color:'#F5F7FA', border:'1px solid #1E3340',
          borderRadius:999, padding:compact ? '7px 24px 7px 10px' : '9px 28px 9px 12px',
          fontSize:compact ? 11 : 12, fontWeight:600, cursor:saving ? 'wait' : 'pointer',
          backgroundImage:'linear-gradient(45deg, transparent 50%, #7E8FA3 50%), linear-gradient(135deg, #7E8FA3 50%, transparent 50%)',
          backgroundPosition:'calc(100% - 12px) 50%, calc(100% - 8px) 50%',
          backgroundSize:'4px 4px, 4px 4px', backgroundRepeat:'no-repeat',
        }}
      >
        {LANGUAGE_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}
