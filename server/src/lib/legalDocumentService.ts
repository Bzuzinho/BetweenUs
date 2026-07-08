// 3.3 — LegalDocument versioning + reacceptance
//
// Publishing a new version of a document (admin action) is what should
// trigger existing users to be asked to re-accept. This service answers two
// questions: "what's the current version of X" and "does this user need to
// re-accept anything".
import prisma from './prisma'

export const getLatestDocument = async (consentType: string) => {
  return prisma.legalDocument.findFirst({
    where: { consentType: consentType as any },
    orderBy: { publishedAt: 'desc' }
  })
}

export interface PendingReacceptance {
  consentType: string
  currentVersion: string
  acceptedVersion: string | null
}

// Only documents with requiresReacceptance=true can ever produce a pending
// item — publishing a typo fix, for instance, could be flagged false so it
// doesn't nag every user on next login.
export const getPendingReacceptance = async (userId: string): Promise<PendingReacceptance[]> => {
  const [latestDocs, userConsents] = await Promise.all([
    prisma.legalDocument.findMany({
      orderBy: { publishedAt: 'desc' },
      distinct: ['consentType']
    }),
    prisma.userConsent.findMany({
      where: { userId, revokedAt: null },
      orderBy: { acceptedAt: 'desc' },
      distinct: ['consentType']
    })
  ])

  const pending: PendingReacceptance[] = []
  for (const doc of latestDocs) {
    if (!doc.requiresReacceptance) continue
    const accepted = userConsents.find((c: { consentType: string; version: number }) => c.consentType === doc.consentType)
    if (!accepted || accepted.version !== doc.version) {
      pending.push({
        consentType: doc.consentType,
        currentVersion: doc.version,
        acceptedVersion: accepted?.version || null
      })
    }
  }
  return pending
}

// Records acceptance of the CURRENT published version for a consentType —
// used by the reaccept endpoint, not registration (which already writes its
// own UserConsent rows with whatever version is live at signup time).
export const recordReacceptance = async (
  userId: string,
  consentType: string,
  ctx: { ipAddress?: string; userAgent?: string }
) => {
  const doc = await getLatestDocument(consentType)
  if (!doc) throw new Error('Documento legal não encontrado.')
  return prisma.userConsent.create({
    data: {
      userId,
      consentType: consentType as any,
      version: doc.version,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    }
  })
}
