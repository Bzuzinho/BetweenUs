# Checklist de Produção — Between Us
> Versão: 1.0 | Julho 2026

---

## Variáveis de ambiente obrigatórias em produção

Execute antes de qualquer lançamento:

```bash
# Verificar variáveis obrigatórias
echo "DATABASE_URL: ${DATABASE_URL:+✅}${DATABASE_URL:-❌ MISSING}"
echo "REDIS_URL: ${REDIS_URL:+✅}${REDIS_URL:-❌ MISSING}"
echo "JWT_SECRET: ${JWT_SECRET:+✅}${JWT_SECRET:-❌ MISSING}"
echo "JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:+✅}${JWT_REFRESH_SECRET:-❌ MISSING}"
echo "CLIENT_URL: ${CLIENT_URL:+✅}${CLIENT_URL:-❌ MISSING}"
echo "CONTACT_HASH_SECRET: ${CONTACT_HASH_SECRET:+✅}${CONTACT_HASH_SECRET:-❌ MISSING}"
echo "NODE_ENV: $NODE_ENV"
```

| Variável | Obrigatória | Notas |
|---|---|---|
| DATABASE_URL | ✅ Sempre | PostgreSQL |
| REDIS_URL | ✅ Sempre | Redis |
| JWT_SECRET | ✅ Sempre | Min 32 chars aleatórios |
| JWT_REFRESH_SECRET | ✅ Sempre | Min 32 chars aleatórios, diferente do anterior |
| CLIENT_URL | ✅ Sempre | URL exacta do frontend (sem trailing slash) |
| NODE_ENV | ✅ Sempre | `production` |
| CONTACT_HASH_SECRET | ✅ Sempre | Min 32 chars aleatórios |
| STORAGE_ENDPOINT | ✅ Para fotos | R2/S3 endpoint |
| STORAGE_ACCESS_KEY | ✅ Para fotos | |
| STORAGE_SECRET_KEY | ✅ Para fotos | |
| STORAGE_BUCKET | ✅ Para fotos | |
| STORAGE_PUBLIC_URL | ✅ Para fotos | URL pública do bucket |
| STRIPE_SECRET_KEY | Se Stripe activo | `sk_live_...` em produção |
| STRIPE_WEBHOOK_SECRET | Se Stripe activo | `whsec_...` |
| STRIPE_PRICE_PREMIUM | Se Stripe activo | `price_...` |
| STRIPE_PRICE_COUPLE | Se Stripe activo | `price_...` |
| SMTP_HOST | Para emails | Resend ou equivalente |
| SMTP_PASS | Para emails | |
| EMAIL_FROM | Para emails | ex: noreply@betweenus.app |
| BETA_CLOSED | Opcional | `true` para beta gate |
| ADMIN_EMAILS | Opcional | Fallback para admin por email |

---

## Segurança técnica

- [✅] HTTPS forçado (Railway)
- [✅] Helmet configurado
- [✅] CORS restrito a origens known
- [✅] JWT em cookies httpOnly + Secure + SameSite=Lax
- [✅] Access token expira em 15 min
- [✅] Refresh token expira em 30 dias
- [✅] Passwords em bcrypt cost 12
- [✅] Rate limiting em auth (10/15min)
- [✅] Rate limiting em upload de fotos (10/15min)
- [✅] Validação Zod em todos os inputs
- [✅] Magic bytes validation nas fotos
- [✅] EXIF removal nas fotos
- [✅] HMAC-SHA256 para contactos
- [✅] JWT_SECRET falha em prod se não definida
- [✅] CONTACT_HASH_SECRET falha em prod se não definida
- [✅] Stripe webhook valida assinatura
- [✅] Admin RBAC com 6 roles
- [✅] Audit log obrigatório em acções admin
- [⚠️] contentSecurityPolicy desligado no Helmet — avaliar antes de prod
- [🔲] ts-node em produção — considerar build compilada (tsc)
- [🔲] Pen test externo

## Funcionalidades antes de beta público

- [❌] Email verification real (Resend)
- [❌] Equipa de moderação activa
- [❌] Revisão legal dos documentos
- [❌] Domínio próprio (não railway.app)
- [❌] Stripe revisado e aprovado legalmente
- [✅] Beta gate (BETA_CLOSED)
- [✅] Testes automatizados (39+)
- [✅] CI/CD (GitHub Actions)
