# Between Us — Workflow Original de Produto

> Documento original recebido. Serve como referência de produto e visão de longo prazo.

Este documento define a visão completa do produto Between Us, desde o MVP até à versão 2.0.
Mantido aqui como referência para decisões de produto, priorização e roadmap.

Ver WORKFLOW.md para a versão técnica actualizada com o estado actual da implementação.

---

## Resumo executivo

Between Us é uma plataforma privada para adultos com três pilares:
- **Privacidade** — por defeito, não por opção
- **Consentimento** — em cada interacção
- **Compatibilidade** — além da aparência

## Roadmap de versões

| Versão | Estado | Objectivo |
|---|---|---|
| v0.1 | ✅ | Protótipo — interface, dados de teste |
| v0.2 | ✅ | MVP técnico — BD real, matching, chat |
| v0.3 | ✅ | Beta privado — convites, moderação, premium |
| v1.0 | 🔲 | Lançamento — PWA pública, Stripe live, legal |
| v1.5 | 🔲 | Crescimento — Travel Mode avançado, Private Room |
| v2.0 | 🔲 | App mobile — iOS, Android, Face ID, push |

## Princípios de desenvolvimento

1. Segurança e privacidade primeiro — sempre
2. MVP mínimo que valide o mercado antes de features complexas
3. PWA antes de apps nativas
4. Beta fechado antes de lançamento público
5. Moderação humana desde o primeiro dia

## Funcionalidades fora do MVP (não implementar antes de v1.0)

- Videochamada
- Eventos privados
- IA para sugestões
- App nativa iOS/Android
- Geolocalização em tempo real
- Conteúdo explícito
- Comunidades/grupos
- Feed social / stories
- Gamificação

## Regras críticas de segurança (não negociáveis)

- Proibir menores de idade (verificação obrigatória)
- Não mostrar localização exacta
- Não guardar contactos em texto claro (HMAC)
- Não enviar notificações com conteúdo explícito
- Não mostrar perfis a contactos bloqueados
- Permitir apagar conta e dados a qualquer momento (RGPD)
- Moderar fotos antes de publicar
- Registar todos os consentimentos com timestamp e IP
- Rate limiting em todos os endpoints de auth
- Audit log completo de todas as acções admin
