import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import AdminPage from './AdminPage'
import AdminModularPage, { MODULAR_ADMIN_TABS } from './AdminModularPage'
import AffiliationsAdminPage from './AffiliationsAdminPage'

export default function AdminPageRouter() {
  const { tab } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (tab === 'affiliations' || tab === 'beta' || MODULAR_ADMIN_TABS.includes(tab)) return

    const normalizeAdminNavigation = () => {
      const candidates = document.querySelectorAll('button, a, [role="button"]')
      candidates.forEach(node => {
        const label = node.textContent?.trim()
        if (label === 'Beta') {
          node.textContent = 'Afiliações'
          node.setAttribute('data-admin-affiliations-link', 'true')
        }
        if (label === 'Afiliados') {
          node.style.display = 'none'
          node.setAttribute('aria-hidden', 'true')
        }
      })
    }

    normalizeAdminNavigation()
    const observer = new MutationObserver(normalizeAdminNavigation)
    observer.observe(document.body, { childList: true, subtree: true })

    const handleClick = event => {
      const target = event.target?.closest?.('[data-admin-affiliations-link="true"]')
      if (!target) return
      event.preventDefault()
      event.stopPropagation()
      navigate('/admin/affiliations')
    }
    document.addEventListener('click', handleClick, true)

    return () => {
      observer.disconnect()
      document.removeEventListener('click', handleClick, true)
    }
  }, [navigate, tab])

  if (tab === 'beta') return <Navigate to="/admin/affiliations" replace />
  if (tab === 'affiliations') return <AffiliationsAdminPage />
  if (MODULAR_ADMIN_TABS.includes(tab || 'dashboard')) return <AdminModularPage />
  return <AdminPage />
}
