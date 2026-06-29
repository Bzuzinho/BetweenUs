# Between Us

**Adult connections. Private by design.**
Ligações adultas. Só entre nós.

---

## Visão Geral

Between Us é uma plataforma privada para ligações adultas, consensuais e discretas.
Serve casais, solteiros, relações abertas, pessoas poliamorosas e quem quer explorar dinâmicas não tradicionais com transparência e privacidade.

## Stack Tecnológica

- **Frontend:** React Native (iOS + Android)
- **Protótipo Web:** React (JSX) + CSS-in-JS
- **Backend:** Node.js + Express (a definir)
- **Base de dados:** PostgreSQL + Redis (a definir)
- **Auth:** JWT + biometria (Face ID / PIN)
- **Storage:** S3 (fotos com expiração)

## Estrutura do Projeto

```
BetweenUs/
├── README.md
├── src/
│   ├── BetweenUsApp.jsx          ← Protótipo principal (React)
│   └── styles/
│       └── theme.js              ← Design tokens
├── docs/
│   └── FEATURES.md               ← Roadmap e funcionalidades
└── assets/
```

## Funcionalidades — Estado Atual

| Feature | Status |
|---|---|
| Onboarding inteligente (3 passos) | ✅ Protótipo |
| Explorar perfis com Between Score | ✅ Protótipo |
| Soft Reveal (fotos desfocadas) | ✅ Protótipo |
| Double Consent Match | ✅ Protótipo |
| Sala Privada (chat) | ✅ Protótipo |
| Modo Acordo | ✅ Protótipo |
| Mapa de Limites | ✅ Protótipo |
| Consent Check | ✅ Protótipo |
| Modo Viagem | ✅ Protótipo |
| Modo Invisível / Discreto | ✅ Protótipo |
| Between Guide | ✅ Protótipo |
| Autenticação real | 🔜 Fase 2 |
| Chat encriptado E2E | 🔜 Fase 2 |
| Bloqueio de contactos | 🔜 Fase 2 |
| Eventos privados | 🔜 Fase 3 |

## Como correr o protótipo

```bash
# Num projeto React + Vite
npm create vite@latest between-us -- --template react
cd between-us
npm install
# Substitui src/App.jsx pelo conteúdo de src/BetweenUsApp.jsx
npm run dev
```

## Posicionamento

> "Between Us — onde casais, solteiros e relações abertas se encontram com discrição."
