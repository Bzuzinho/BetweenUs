# Production Readiness — Between Us

> Sprint 11.5 — Production Readiness & Baseline Cleanup. Estado a 2026-07-08.
> Complementa (não substitui) `PRODUCTION_READINESS_CHECKLIST.md` (variáveis de ambiente) — este documento é sobre **prontidão operacional**, não sobre configuração.

Cada item está marcado ✅ (confirmado), ⚠️ (parcial / requer ação), ou ❌ (não confirmado / bloqueador).

---

## Infrastructure

| Item | Estado | Nota |
|---|---|---|
| Domínio | ⚠️ | URL Railway (`fearless-stillness-production-e5f6.up.railway.app`) confirmada em `client/.env.production`. Domínio próprio não confirmado neste sprint — fora do escopo técnico auditável a partir do repositório. |
| HTTPS | ✅ | Railway serve HTTPS por definição; sem evidência de mixed-content no client. |
| Backups de base de dados | ❌ | Não confirmável a partir do repositório — depende de configuração do Railway Postgres (backups automáticos, retenção). Recomenda-se confirmar manualmente no painel Railway. |
| Redis | ✅ | `REDIS_URL` obrigatório e validado no arranque; usado para cache/filas/sessões. |
| Storage (R2) | ✅ | `STORAGE_*` obrigatório para fotos; signed URLs implementados (Sprint 3). |
| Jobs em background | ✅ | Cron in-process confirmados: `expireConsentChecks`, safety check-in overdue alert, `recommendationLogCleanupJob` (novo, 11.5.5), event/circle housekeeping. Todos com try/catch próprio — uma falha não derruba o processo. |

## Monitoring

| Item | Estado | Nota |
|---|---|---|
| Sentry backend | ⚠️ | `SENTRY_DSN` suportado (Sprint 3.7) mas opcional — `/health` já reporta `sentry: !!process.env.SENTRY_DSN` para visibilidade rápida. Confirmar que a variável está de facto definida em produção. |
| Sentry frontend | ❌ | Não encontrada integração Sentry no client (`client/src`). Se pretendido, é trabalho de um sprint futuro, fora do escopo deste ("não criar novas funcionalidades de produto"). |
| Health checks | ✅ | `/health` (geral), `/health/email` (diagnóstico SMTP), `/health/recommendations` (novo, 11.5.5 — flags, versão do modelo, alcançabilidade da tabela de logs). |

## Email

| Item | Estado | Nota |
|---|---|---|
| Verificação de email | ⚠️ | Fluxo implementado; entrega real via SendGrid API pendente de confirmação em produção (ver nota do projeto: "Pendente: confirmar no admin que o teste dá ✅ SendGrid API"). |
| Reset de password | ⚠️ | Mesmo mecanismo de entrega do acima — depende da mesma confirmação SendGrid. Script de emergência `npm run reset-password` continua disponível como via alternativa. |

## Payments

| Item | Estado | Nota |
|---|---|---|
| Stripe live/test state explícito | ⚠️ | `.env.example` documenta `sk_test_...` vs `sk_live_...`, mas o estado ATUAL (test ou live) em produção não é confirmável a partir do repositório — depende da variável configurada no Railway. Confirmar antes do lançamento público. |

## Legal

| Item | Estado | Nota |
|---|---|---|
| Termos revistos | ❌ | Não confirmável a partir do código — requer confirmação humana/jurídica, fora do escopo desta auditoria técnica. |
| Privacidade revista | ❌ | Idem. |
| Consentimento de dados sensíveis revisto | ❌ | Idem — `UserConsent`/`LegalDocument` versioning está implementado tecnicamente (Sprint 3.3), mas a REVISÃO do conteúdo legal em si é uma tarefa não-técnica. |

## Moderation

| Item | Estado | Nota |
|---|---|---|
| Moderador ativo | ❌ | Não confirmável a partir do repositório — depende de processo humano/equipa, não de código. |
| SLA de denúncias definido | ⚠️ | `ReportPriorityService` (Sprint 9.4) prioriza denúncias tecnicamente, mas um SLA formal (tempo-alvo de resposta) não está documentado como política operacional. |
| Fila de fotos monitorizada | ✅ | Painel admin (`/admin/photos`, moderation queue) funcional e usado nas sessões anteriores. |

## Recommendations (Sprint 11 / 11.5)

| Item | Estado | Nota |
|---|---|---|
| Shadow mode = true | ✅ | Recomendado e documentado em `.env.example` como estado inicial de produção. |
| Enabled = false | ✅ | Idem — nenhum utilizador real vê ranking alterado até haver período de dados revisto. |
| Retenção de dados | ✅ | `RECOMMENDATION_LOG_RETENTION_DAYS` (default 90), cron diário, configurável via env. |
| Qualidade de dados validada | ✅ | Matriz de deduplicação (11.5.6) auditada e corrigida — ver secção dedicada na entrega. PROFILE_VIEW, LIKE, PASS, BLOCK e SAFE_EXIT tinham lacunas de deduplicação reais, todas corrigidas nesta sessão. |
| Falha do ranker isolada do Discovery | ✅ | Corrigido nesta sessão (11.5.5) — `applyRecommendations` agora tem try/catch próprio; uma exceção no ranker/diversidade/exploração degrada para a ranking atual em vez de devolver 500. Testado (`recommendationRankerFailure.test.ts`). |

## Security

| Item | Estado | Nota |
|---|---|---|
| Signed URLs | ✅ | `mediaAccessService.ts` (Sprint 3.1/3.2) — fotos/selfies nunca servidas por URL permanente. |
| Rate limits | ✅ | `globalLimiter`, `strictLimiter` em login/registo/password (index.ts). |
| Revisão de segredos | ⚠️ **AÇÃO NECESSÁRIA** | Ver secção "Secret Audit" da entrega final. Um valor com forma de segredo real (`JWT_SECRET`/`JWT_REFRESH_SECRET`) foi encontrado no histórico do git (removido da árvore atual em commit `487b622`, já não presente hoje). Recomenda-se confirmar se o `JWT_SECRET` atualmente configurado no Railway corresponde a esse valor histórico e, em caso afirmativo, rodar imediatamente (rotação invalida sessões ativas — todos os utilizadores teriam de voltar a fazer login). |
| Sem PAT em remote/config | ✅ | `git remote -v` confirmado limpo (HTTPS simples, sem token embutido). Nenhum PAT encontrado em `git log --all` para os padrões `github_pat_`/`ghp_`. |

---

## Resumo

Bloqueadores técnicos reais (código): nenhum — TypeScript baseline em 0 erros, build limpo, CI agora reproduz o mesmo pipeline localmente usado nesta auditoria, ranker isolado de falhas, deduplicação de sinais corrigida.

Bloqueadores operacionais (fora do código, dependem de ação humana): confirmação de backups do Postgres, revisão legal dos textos, confirmação do estado Stripe live/test, confirmação de entrega SendGrid, e — mais urgente — confirmação/rotação do `JWT_SECRET` face ao valor histórico encontrado no git.
