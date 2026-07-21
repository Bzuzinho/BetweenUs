import { useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'

export default function AdminReasonModal({ title, onConfirm, onCancel, hasNote = false, colors, inputStyle }) {
  const { t } = useI18n()
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')

  const confirm = () => {
    const normalizedReason = reason.trim()
    if (!normalizedReason) return
    onConfirm(normalizedReason, note.trim())
  }

  return (
    <div
      role="presentation"
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-reason-modal-title"
        style={{ background:colors.surface, border:`1px solid ${colors.border}`, borderRadius:'20px 20px 0 0', width:'100%', maxWidth:540, padding:'24px 20px calc(32px + env(safe-area-inset-bottom))' }}
        onClick={event => event.stopPropagation()}
      >
        <div aria-hidden="true" style={{ width:36, height:4, background:colors.border, borderRadius:2, margin:'0 auto 18px' }}/>
        <h3 id="admin-reason-modal-title" style={{ color:colors.text, fontSize:18, fontWeight:500, marginBottom:14, marginTop:0 }}>{title}</h3>
        <input
          value={reason}
          onChange={event => setReason(event.target.value)}
          placeholder={t('admin.modal.reasonRequired')}
          aria-label={t('admin.modal.reasonRequired')}
          style={inputStyle}
          autoFocus
        />
        {hasNote && (
          <textarea
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder={t('admin.modal.internalNote')}
            aria-label={t('admin.modal.internalNote')}
            rows={3}
            style={{ ...inputStyle, resize:'none' }}
          />
        )}
        <div style={{ display:'flex', gap:10, marginTop:6 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ flex:1, background:'none', border:`1px solid ${colors.border}`, borderRadius:50, padding:13, color:colors.muted, fontSize:14, minHeight:48, cursor:'pointer' }}
          >
            {t('admin.modal.cancel')}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!reason.trim()}
            style={{ flex:2, background:colors.primary, border:'none', borderRadius:50, padding:13, color:'#0A141A', fontWeight:600, fontSize:14, minHeight:48, opacity:reason.trim() ? 1 : 0.4, cursor:'pointer' }}
          >
            {t('admin.modal.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
