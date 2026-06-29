import { useState, useEffect, useRef } from "react";

const lang = {
  en: {
    appName: "Between Us",
    tagline: "Adult connections. Private by design.",
    taglinePT: "Ligações adultas. Só entre nós.",
    nav: { home: "Home", explore: "Explore", matches: "Matches", profile: "Profile", guide: "Guide" },
    onboarding: {
      title: "Who are you?",
      subtitle: "Tell us about yourself so we can find the right connections.",
      types: ["Single", "In a couple", "Married", "Open relationship", "Polyamorous", "Couple seeking third", "Couple seeking couple", "Curious"],
      seeking: "What are you looking for?",
      seekingOpts: ["Casual encounter", "Recurring connection", "Emotional connection", "Trio experience", "Couple swap", "Fetish exploration", "Online only", "Friendship+"],
      discretion: "Desired discretion level",
      discretionOpts: ["Maximum privacy", "Selective visibility", "Open profile"],
      next: "Continue",
      back: "Back",
      finish: "Enter Between Us",
    },
    explore: {
      title: "Explore",
      filters: "Filters",
      filterOpts: ["Singles", "Couples", "Open", "Polyamorous", "Verified only", "Near me"],
      noFace: "Face hidden",
      verified: "Verified",
      score: "Score",
      like: "Connect",
      pass: "Pass",
      superlike: "★ Super",
    },
    match: {
      title: "Your Matches",
      empty: "No matches yet. Keep exploring.",
      newMatch: "New Match!",
      bothApproved: "Both approved ✓",
      openRoom: "Open Private Room",
    },
    room: {
      title: "Private Room",
      rules: "📋 Agreed rules",
      placeholder: "Write a message...",
      send: "Send",
      softReveal: "Request photo reveal",
      safeExit: "Safe Exit",
      report: "Report",
    },
    profile: {
      title: "My Profile",
      editBtn: "Edit profile",
      modeAcordo: "Agreement Mode",
      limitsMap: "Limits Map",
      invisible: "Invisible Mode",
      discreteMode: "Discreet Mode",
      verified: "Get verified",
      stats: "Profile stats",
      views: "Views",
      likes: "Likes",
      matches: "Matches",
      premium: "Go Premium",
      premiumFeatures: ["Invisible Mode", "Advanced Soft Reveal", "Travel Mode", "Contact Blocking", "Who liked you"],
    },
    acordo: {
      title: "Agreement Mode",
      subtitle: "Define rules before exploring together.",
      rules: ["Only chatting first", "Both must approve matches", "No emotional involvement", "Open to emotional connection", "One-time experiences only", "Open to recurring", "No known people", "Verified profiles only", "Singles only", "Other couples only"],
      save: "Save Agreement",
    },
    limits: {
      title: "Limits Map",
      subtitle: "Define your boundaries clearly.",
      yes: "Yes",
      maybe: "Maybe",
      no: "No",
      categories: ["Casual encounter", "Emotional connection", "Trio", "Couple swap", "Online only", "Sharing photos", "Video call", "Meeting in person", "Recurring contact", "Fetish exploration"],
      save: "Save Limits",
    },
    guide: {
      title: "Between Guide",
      articles: [
        { title: "Setting limits as a couple", time: "5 min" },
        { title: "Talking about fetishes without pressure", time: "4 min" },
        { title: "Safety in person", time: "6 min" },
        { title: "Digital privacy", time: "3 min" },
        { title: "What is polyamory?", time: "7 min" },
        { title: "Building a good profile", time: "4 min" },
      ],
    },
    consent: {
      title: "Consent Check",
      subtitle: "What are you looking for right now?",
      opts: ["Just chatting", "Casual encounter", "Trio experience", "Recurring connection", "Friendship+", "Polyamory", "Swing", "Fetish exploration", "No emotional involvement", "Open to emotions"],
      confirm: "Confirm intention",
    },
    travel: {
      title: "Travel Mode",
      subtitle: "Explore before you arrive.",
      placeholder: "City or destination",
      dates: "Select dates",
      activate: "Activate Travel Mode",
    },
  },
  pt: {
    appName: "Between Us",
    tagline: "Adult connections. Private by design.",
    taglinePT: "Ligações adultas. Só entre nós.",
    nav: { home: "Início", explore: "Explorar", matches: "Matches", profile: "Perfil", guide: "Guia" },
    onboarding: {
      title: "Quem és tu?",
      subtitle: "Diz-nos sobre ti para encontrarmos as ligações certas.",
      types: ["Solteiro/a", "Casal", "Casado/a", "Relação aberta", "Poliamoroso/a", "Casal à procura de terceira", "Casal à procura de casal", "Curioso/a"],
      seeking: "O que procuras?",
      seekingOpts: ["Encontro casual", "Ligação recorrente", "Envolvimento emocional", "Experiência a três", "Swing", "Explorar fetiches", "Apenas online", "Amizade colorida"],
      discretion: "Nível de discrição desejado",
      discretionOpts: ["Máxima privacidade", "Visibilidade seletiva", "Perfil aberto"],
      next: "Continuar",
      back: "Voltar",
      finish: "Entrar no Between Us",
    },
    explore: {
      title: "Explorar",
      filters: "Filtros",
      filterOpts: ["Solteiros", "Casais", "Abertos", "Poliamorosos", "Só verificados", "Perto de mim"],
      noFace: "Rosto oculto",
      verified: "Verificado",
      score: "Score",
      like: "Ligar",
      pass: "Passar",
      superlike: "★ Super",
    },
    match: {
      title: "Os Teus Matches",
      empty: "Ainda sem matches. Continua a explorar.",
      newMatch: "Novo Match!",
      bothApproved: "Ambos aprovaram ✓",
      openRoom: "Abrir Sala Privada",
    },
    room: {
      title: "Sala Privada",
      rules: "📋 Regras combinadas",
      placeholder: "Escreve uma mensagem...",
      send: "Enviar",
      softReveal: "Pedir revelação de foto",
      safeExit: "Saída Segura",
      report: "Reportar",
    },
    profile: {
      title: "O Meu Perfil",
      editBtn: "Editar perfil",
      modeAcordo: "Modo Acordo",
      limitsMap: "Mapa de Limites",
      invisible: "Modo Invisível",
      discreteMode: "Modo Discreto",
      verified: "Verificar conta",
      stats: "Estatísticas",
      views: "Visitas",
      likes: "Likes",
      matches: "Matches",
      premium: "Ir Premium",
      premiumFeatures: ["Modo Invisível", "Soft Reveal avançado", "Modo Viagem", "Bloquear contactos", "Ver quem gostou"],
    },
    acordo: {
      title: "Modo Acordo",
      subtitle: "Define regras antes de explorar juntos.",
      rules: ["Apenas conversar primeiro", "Ambos devem aprovar matches", "Sem envolvimento emocional", "Aberto a envolvimento emocional", "Apenas experiências pontuais", "Aberto a algo recorrente", "Sem pessoas conhecidas", "Apenas perfis verificados", "Apenas solteiros", "Apenas outros casais"],
      save: "Guardar Acordo",
    },
    limits: {
      title: "Mapa de Limites",
      subtitle: "Define os teus limites com clareza.",
      yes: "Sim",
      maybe: "Talvez",
      no: "Não",
      categories: ["Encontro casual", "Ligação emocional", "Experiência a três", "Swing", "Apenas online", "Partilha de fotos", "Videochamada", "Encontro presencial", "Contacto recorrente", "Explorar fetiches"],
      save: "Guardar Limites",
    },
    guide: {
      title: "Between Guide",
      articles: [
        { title: "Como definir limites em casal", time: "5 min" },
        { title: "Como falar sobre fetiches sem pressão", time: "4 min" },
        { title: "Segurança em encontros presenciais", time: "6 min" },
        { title: "Privacidade digital", time: "3 min" },
        { title: "O que é o poliamor?", time: "7 min" },
        { title: "Como criar um bom perfil", time: "4 min" },
      ],
    },
    consent: {
      title: "Consent Check",
      subtitle: "O que procuras agora?",
      opts: ["Apenas conversa", "Encontro casual", "Experiência a três", "Ligação recorrente", "Amizade colorida", "Poliamor", "Swing", "Explorar fetiches", "Sem envolvimento emocional", "Aberto a emoções"],
      confirm: "Confirmar intenção",
    },
    travel: {
      title: "Modo Viagem",
      subtitle: "Explora antes de chegar.",
      placeholder: "Cidade ou destino",
      dates: "Selecionar datas",
      activate: "Ativar Modo Viagem",
    },
  },
};

const profiles = [
  { id: 1, name: "Sofia & Rui", type: "Couple", age: "28/31", distance: "3km", score: 87, blurred: true, verified: true, bio: "Open couple seeking a genuine connection. Both need to approve. Chemistry first.", tags: ["Open", "Verified", "Trio"] },
  { id: 2, name: "Mariana", type: "Single", age: "29", distance: "7km", score: 92, blurred: false, verified: true, bio: "Curious and direct. Looking for authentic connections without labels.", tags: ["Single", "Open", "Online first"] },
  { id: 3, name: "André & Catarina", type: "Couple", age: "34/32", distance: "12km", score: 74, blurred: true, verified: false, bio: "Couple in open relationship. Looking for other couples or singles.", tags: ["Couple", "Swing", "Discreet"] },
  { id: 4, name: "Tomás", type: "Single", age: "35", distance: "2km", score: 81, blurred: false, verified: true, bio: "Interested in couples and non-traditional dynamics. Calm and communicative.", tags: ["Single", "Trio", "Polyamory"] },
];

const matchList = [
  { id: 1, name: "Sofia & Rui", lastMsg: "Looking forward to talking more 😊", time: "14:32", bothApproved: true, unread: 2 },
  { id: 2, name: "Mariana", lastMsg: "What are your limits?", time: "Ontem", bothApproved: true, unread: 0 },
];

const colors = {
  bg: "#0E0818",
  bgCard: "#1A1028",
  bgInput: "#231535",
  plum: "#2D1B4E",
  accent: "#C9956B",
  accentLight: "#E8B89A",
  rose: "#F2C4B8",
  lavender: "#8B7BA8",
  lavLight: "#B8A9D4",
  white: "#FAF7F5",
  muted: "#7A6E88",
  yes: "#4CAF7A",
  maybe: "#E8B84B",
  no: "#E05C7A",
  green: "#3DD68C",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${colors.bg}; color: ${colors.white}; font-family: 'Inter', sans-serif; }
  :root { --accent: ${colors.accent}; --bg: ${colors.bg}; }
  
  .app-shell {
    max-width: 420px;
    margin: 0 auto;
    min-height: 100vh;
    background: ${colors.bg};
    position: relative;
    overflow: hidden;
  }
  
  .screen { 
    min-height: calc(100vh - 70px); 
    padding: 0 0 80px 0;
    animation: fadeIn 0.3s ease;
  }
  
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes matchPop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
  
  .top-bar {
    padding: 52px 20px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    background: linear-gradient(to bottom, ${colors.bg} 80%, transparent);
    z-index: 10;
  }
  
  .logo { 
    font-family: 'Playfair Display', serif; 
    font-size: 22px; 
    font-weight: 700;
    background: linear-gradient(135deg, ${colors.accent}, ${colors.rose});
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.3px;
  }
  
  .logo-dot { 
    display: inline-block;
    width: 6px; height: 6px;
    background: ${colors.accent};
    border-radius: 50%;
    margin-left: 2px;
    vertical-align: middle;
    margin-bottom: 3px;
  }
  
  .lang-toggle {
    background: ${colors.bgCard};
    border: 1px solid ${colors.plum};
    border-radius: 20px;
    padding: 4px 14px;
    font-size: 12px;
    color: ${colors.lavLight};
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    transition: all 0.2s;
  }
  .lang-toggle:hover { background: ${colors.plum}; color: ${colors.white}; }
  
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 420px;
    background: rgba(14,8,24,0.95);
    backdrop-filter: blur(20px);
    border-top: 1px solid ${colors.plum};
    display: flex;
    justify-content: space-around;
    padding: 10px 0 20px;
    z-index: 100;
  }
  
  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    cursor: pointer;
    padding: 4px 12px;
    border-radius: 12px;
    transition: all 0.2s;
    border: none;
    background: none;
  }
  .nav-item .nav-icon { font-size: 20px; }
  .nav-item .nav-label { font-size: 10px; color: ${colors.muted}; font-family: 'Inter', sans-serif; }
  .nav-item.active .nav-label { color: ${colors.accent}; }
  .nav-item.active .nav-icon { filter: drop-shadow(0 0 6px ${colors.accent}); }
  
  /* HOME */
  .home-hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 60px 30px 100px;
    text-align: center;
    background: radial-gradient(ellipse at 50% 30%, #2D1B4E 0%, ${colors.bg} 70%);
  }
  .home-logo-big {
    font-family: 'Playfair Display', serif;
    font-size: 42px;
    font-weight: 700;
    font-style: italic;
    background: linear-gradient(135deg, ${colors.accent} 0%, ${colors.rose} 50%, ${colors.lavLight} 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 6px;
    line-height: 1.1;
  }
  .home-tagline {
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: ${colors.lavender};
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .home-tagline-pt {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-size: 15px;
    color: ${colors.muted};
    margin-bottom: 48px;
  }
  .home-entry-cards {
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 100%;
    max-width: 300px;
    margin-bottom: 32px;
  }
  .entry-card {
    background: ${colors.bgCard};
    border: 1px solid ${colors.plum};
    border-radius: 16px;
    padding: 18px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    cursor: pointer;
    transition: all 0.25s;
    text-align: left;
  }
  .entry-card:hover { border-color: ${colors.accent}; transform: translateY(-2px); background: ${colors.plum}; }
  .entry-card .ec-icon { font-size: 28px; }
  .entry-card .ec-label { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; color: ${colors.white}; }
  .entry-card .ec-sub { font-size: 11px; color: ${colors.muted}; margin-top: 2px; }
  .start-btn {
    background: linear-gradient(135deg, ${colors.accent}, ${colors.rose});
    border: none;
    border-radius: 50px;
    padding: 16px 40px;
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    font-weight: 600;
    color: #1A0A2E;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    max-width: 300px;
    letter-spacing: 0.3px;
  }
  .start-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(201,149,107,0.4); }
  
  /* ONBOARDING */
  .onboard-wrap { padding: 24px 24px 100px; }
  .step-indicator { display: flex; gap: 6px; margin-bottom: 32px; }
  .step-dot { height: 3px; border-radius: 2px; background: ${colors.plum}; flex: 1; transition: all 0.3s; }
  .step-dot.active { background: linear-gradient(90deg, ${colors.accent}, ${colors.rose}); }
  .onboard-title { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; line-height: 1.2; margin-bottom: 10px; }
  .onboard-sub { color: ${colors.muted}; font-size: 14px; margin-bottom: 28px; line-height: 1.5; }
  .option-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 28px; }
  .option-btn {
    background: ${colors.bgCard};
    border: 1.5px solid ${colors.plum};
    border-radius: 14px;
    padding: 14px 12px;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: ${colors.white};
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
    line-height: 1.3;
  }
  .option-btn.selected { border-color: ${colors.accent}; background: rgba(201,149,107,0.15); color: ${colors.accentLight}; }
  .option-btn:hover { border-color: ${colors.lavender}; }
  .next-btn {
    background: linear-gradient(135deg, ${colors.accent}, ${colors.rose});
    border: none;
    border-radius: 50px;
    padding: 16px;
    width: 100%;
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    font-weight: 600;
    color: #1A0A2E;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 8px;
  }
  .next-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .next-btn:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(201,149,107,0.4); }
  .slider-label { font-size: 13px; color: ${colors.lavLight}; margin-bottom: 12px; font-weight: 500; }
  .slider-opts { display: flex; flex-direction: column; gap: 8px; }
  .slider-opt {
    background: ${colors.bgCard};
    border: 1.5px solid ${colors.plum};
    border-radius: 12px;
    padding: 14px 16px;
    display: flex; align-items: center; gap: 12px;
    cursor: pointer; transition: all 0.2s;
    font-family: 'Inter', sans-serif; font-size: 14px; color: ${colors.white};
  }
  .slider-opt.selected { border-color: ${colors.accent}; background: rgba(201,149,107,0.12); }
  .radio-circle { width: 18px; height: 18px; border-radius: 50%; border: 2px solid ${colors.plum}; flex-shrink: 0; transition: all 0.2s; }
  .slider-opt.selected .radio-circle { border-color: ${colors.accent}; background: ${colors.accent}; }
  
  /* EXPLORE */
  .explore-wrap { padding: 0 16px 100px; }
  .filter-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; margin-bottom: 20px; }
  .filter-row::-webkit-scrollbar { display: none; }
  .filter-chip {
    white-space: nowrap;
    background: ${colors.bgCard};
    border: 1.5px solid ${colors.plum};
    border-radius: 20px;
    padding: 7px 14px;
    font-size: 12px;
    color: ${colors.lavLight};
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
  }
  .filter-chip.active { background: rgba(201,149,107,0.15); border-color: ${colors.accent}; color: ${colors.accentLight}; }
  
  .profile-card {
    background: ${colors.bgCard};
    border: 1px solid ${colors.plum};
    border-radius: 24px;
    overflow: hidden;
    margin-bottom: 16px;
    position: relative;
    transition: transform 0.2s;
    animation: slideUp 0.4s ease;
  }
  .profile-card:hover { transform: translateY(-2px); }
  
  .card-photo {
    height: 320px;
    background: linear-gradient(135deg, #2D1B4E 0%, #1A0A2E 100%);
    position: relative;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .card-photo-inner {
    width: 100%; height: 100%;
    background: linear-gradient(135deg, #3D2060 0%, #1A0A2E 60%, #0E0818 100%);
    display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  .card-photo-avatar {
    font-size: 80px;
    filter: blur(0px);
    transition: filter 0.4s;
    opacity: 0.7;
  }
  .card-photo-avatar.blurred { filter: blur(10px); opacity: 0.5; }
  .blur-badge {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(201,149,107,0.2);
    border: 1px solid ${colors.accent};
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 11px;
    color: ${colors.accentLight};
    backdrop-filter: blur(4px);
    font-weight: 500;
  }
  .verified-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    background: rgba(61,214,140,0.2);
    border: 1px solid ${colors.green};
    border-radius: 20px;
    padding: 4px 10px;
    font-size: 10px;
    color: ${colors.green};
    font-weight: 600;
    backdrop-filter: blur(4px);
  }
  .score-badge {
    position: absolute;
    top: 14px;
    left: 14px;
    background: rgba(201,149,107,0.25);
    border: 1px solid ${colors.accent};
    border-radius: 20px;
    padding: 4px 10px;
    font-size: 10px;
    color: ${colors.accentLight};
    font-weight: 600;
    backdrop-filter: blur(4px);
  }
  .card-body { padding: 16px 18px; }
  .card-name { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; margin-bottom: 2px; }
  .card-meta { font-size: 12px; color: ${colors.muted}; margin-bottom: 10px; }
  .card-bio { font-size: 13px; color: ${colors.lavLight}; line-height: 1.6; margin-bottom: 12px; }
  .card-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
  .tag {
    background: rgba(139,123,168,0.15);
    border: 1px solid rgba(139,123,168,0.3);
    border-radius: 20px;
    padding: 4px 10px;
    font-size: 11px;
    color: ${colors.lavLight};
  }
  .card-actions { display: flex; gap: 10px; }
  .action-btn {
    flex: 1;
    border: none;
    border-radius: 14px;
    padding: 13px;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-pass { background: ${colors.bgInput}; color: ${colors.muted}; }
  .btn-pass:hover { background: #3A2550; color: ${colors.white}; }
  .btn-like { background: linear-gradient(135deg, ${colors.accent}, ${colors.rose}); color: #1A0A2E; }
  .btn-like:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(201,149,107,0.4); }
  .btn-super { background: rgba(139,123,168,0.2); color: ${colors.lavLight}; border: 1px solid rgba(139,123,168,0.3); flex: 0.6; }
  .btn-super:hover { background: rgba(139,123,168,0.35); }
  
  /* MATCHES */
  .matches-wrap { padding: 0 16px 100px; }
  .match-item {
    background: ${colors.bgCard};
    border: 1px solid ${colors.plum};
    border-radius: 18px;
    padding: 16px;
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 12px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }
  .match-item:hover { border-color: ${colors.accent}; transform: translateY(-1px); }
  .match-avatar {
    width: 52px; height: 52px;
    border-radius: 16px;
    background: linear-gradient(135deg, #3D2060, #1A0A2E);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
    border: 1.5px solid ${colors.plum};
  }
  .match-info { flex: 1; min-width: 0; }
  .match-name { font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600; margin-bottom: 3px; }
  .match-last { font-size: 12px; color: ${colors.muted}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .match-both { font-size: 10px; color: ${colors.green}; margin-top: 3px; font-weight: 500; }
  .match-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .match-time { font-size: 11px; color: ${colors.muted}; }
  .unread-dot {
    background: ${colors.accent};
    color: #1A0A2E;
    border-radius: 10px;
    padding: 2px 7px;
    font-size: 10px;
    font-weight: 700;
  }
  
  /* PRIVATE ROOM */
  .room-wrap { display: flex; flex-direction: column; height: calc(100vh - 70px); }
  .room-header {
    background: ${colors.bgCard};
    border-bottom: 1px solid ${colors.plum};
    padding: 16px 20px;
    display: flex; align-items: center; gap: 12px;
  }
  .room-back { background: none; border: none; color: ${colors.lavLight}; font-size: 20px; cursor: pointer; }
  .room-name { font-family: 'Playfair Display', serif; font-size: 17px; font-weight: 600; flex: 1; }
  .room-actions-top { display: flex; gap: 8px; }
  .room-action-btn {
    background: none;
    border: 1px solid ${colors.plum};
    border-radius: 10px;
    padding: 6px 10px;
    font-size: 11px;
    color: ${colors.muted};
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: all 0.2s;
  }
  .room-action-btn.danger { color: #E05C7A; border-color: rgba(224,92,122,0.3); }
  .room-action-btn:hover { background: ${colors.bgInput}; color: ${colors.white}; }
  
  .rules-banner {
    background: rgba(201,149,107,0.08);
    border-bottom: 1px solid rgba(201,149,107,0.2);
    padding: 10px 20px;
    font-size: 12px;
    color: ${colors.accent};
    cursor: pointer;
  }
  
  .messages-area { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; scrollbar-width: thin; scrollbar-color: ${colors.plum} transparent; }
  .msg { max-width: 75%; display: flex; flex-direction: column; gap: 4px; }
  .msg.mine { align-self: flex-end; align-items: flex-end; }
  .msg.theirs { align-self: flex-start; }
  .msg-bubble {
    border-radius: 18px;
    padding: 10px 14px;
    font-size: 14px;
    line-height: 1.5;
  }
  .msg.mine .msg-bubble { background: linear-gradient(135deg, ${colors.accent}, ${colors.rose}); color: #1A0A2E; border-bottom-right-radius: 4px; }
  .msg.theirs .msg-bubble { background: ${colors.bgCard}; border: 1px solid ${colors.plum}; color: ${colors.white}; border-bottom-left-radius: 4px; }
  .msg-time { font-size: 10px; color: ${colors.muted}; padding: 0 4px; }
  
  .room-input-area {
    background: ${colors.bgCard};
    border-top: 1px solid ${colors.plum};
    padding: 12px 16px 24px;
    display: flex; gap: 10px; align-items: flex-end;
  }
  .room-input {
    flex: 1;
    background: ${colors.bgInput};
    border: 1.5px solid ${colors.plum};
    border-radius: 20px;
    padding: 12px 16px;
    color: ${colors.white};
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    resize: none;
    outline: none;
    min-height: 44px;
    max-height: 100px;
    transition: border-color 0.2s;
  }
  .room-input:focus { border-color: ${colors.lavender}; }
  .room-input::placeholder { color: ${colors.muted}; }
  .send-btn {
    background: linear-gradient(135deg, ${colors.accent}, ${colors.rose});
    border: none;
    border-radius: 50%;
    width: 44px; height: 44px;
    cursor: pointer;
    font-size: 18px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
  }
  .send-btn:hover { transform: scale(1.08); box-shadow: 0 4px 16px rgba(201,149,107,0.4); }
  
  /* PROFILE */
  .profile-wrap { padding: 0 0 100px; }
  .profile-hero {
    background: linear-gradient(180deg, #2D1B4E 0%, ${colors.bg} 100%);
    padding: 24px 24px 32px;
    text-align: center;
    position: relative;
  }
  .profile-avatar-wrap { position: relative; display: inline-block; margin-bottom: 16px; }
  .profile-avatar {
    width: 90px; height: 90px;
    border-radius: 28px;
    background: linear-gradient(135deg, #4D2A70, #1A0A2E);
    display: flex; align-items: center; justify-content: center;
    font-size: 40px;
    border: 2px solid ${colors.accent};
  }
  .profile-verified-badge {
    position: absolute; bottom: -4px; right: -4px;
    background: ${colors.green};
    border-radius: 8px;
    padding: 2px 6px;
    font-size: 9px;
    color: #0A2010;
    font-weight: 700;
  }
  .profile-name { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 700; margin-bottom: 4px; }
  .profile-type { font-size: 13px; color: ${colors.lavender}; margin-bottom: 4px; }
  .profile-score { font-size: 12px; color: ${colors.accent}; }
  .edit-btn {
    background: none;
    border: 1.5px solid ${colors.plum};
    border-radius: 50px;
    padding: 8px 24px;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: ${colors.lavLight};
    cursor: pointer;
    margin-top: 16px;
    transition: all 0.2s;
  }
  .edit-btn:hover { border-color: ${colors.accent}; color: ${colors.accent}; }
  
  .stats-row {
    display: flex;
    background: ${colors.bgCard};
    margin: 0 16px;
    border-radius: 16px;
    border: 1px solid ${colors.plum};
    overflow: hidden;
    margin-bottom: 20px;
  }
  .stat-item { flex: 1; padding: 16px; text-align: center; border-right: 1px solid ${colors.plum}; }
  .stat-item:last-child { border-right: none; }
  .stat-val { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: ${colors.accent}; }
  .stat-label { font-size: 10px; color: ${colors.muted}; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
  
  .profile-section { margin: 0 16px 16px; }
  .section-title { font-size: 11px; color: ${colors.muted}; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 10px; padding-left: 4px; }
  
  .feature-list { display: flex; flex-direction: column; gap: 8px; }
  .feature-item {
    background: ${colors.bgCard};
    border: 1px solid ${colors.plum};
    border-radius: 14px;
    padding: 14px 16px;
    display: flex; align-items: center; gap: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .feature-item:hover { border-color: ${colors.accent}; background: rgba(201,149,107,0.05); }
  .feature-icon { font-size: 20px; width: 36px; text-align: center; }
  .feature-label { flex: 1; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; }
  .feature-arrow { color: ${colors.muted}; font-size: 14px; }
  .feature-badge { background: ${colors.accent}; color: #1A0A2E; border-radius: 10px; padding: 2px 8px; font-size: 10px; font-weight: 700; }
  
  .premium-card {
    background: linear-gradient(135deg, #2D1B4E, #1A0A40);
    border: 1px solid rgba(201,149,107,0.4);
    border-radius: 20px;
    padding: 20px;
    margin: 0 16px 16px;
    text-align: center;
  }
  .premium-title { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 700; margin-bottom: 6px; background: linear-gradient(135deg, ${colors.accent}, ${colors.rose}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .premium-features-list { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin: 12px 0 16px; }
  .premium-feat { background: rgba(201,149,107,0.1); border: 1px solid rgba(201,149,107,0.2); border-radius: 20px; padding: 4px 10px; font-size: 11px; color: ${colors.accentLight}; }
  .premium-btn {
    background: linear-gradient(135deg, ${colors.accent}, ${colors.rose});
    border: none;
    border-radius: 50px;
    padding: 13px 32px;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #1A0A2E;
    cursor: pointer;
    width: 100%;
    transition: all 0.2s;
    letter-spacing: 0.3px;
  }
  .premium-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(201,149,107,0.4); }
  
  /* MODAL */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(8px);
    z-index: 200;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .modal-sheet {
    background: ${colors.bgCard};
    border: 1px solid ${colors.plum};
    border-radius: 28px 28px 0 0;
    width: 100%;
    max-width: 420px;
    padding: 24px 24px 40px;
    animation: slideUp 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    max-height: 85vh;
    overflow-y: auto;
  }
  .modal-handle { width: 40px; height: 4px; background: ${colors.plum}; border-radius: 2px; margin: 0 auto 20px; }
  .modal-title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; margin-bottom: 6px; }
  .modal-sub { font-size: 13px; color: ${colors.muted}; margin-bottom: 24px; line-height: 1.5; }
  .modal-close {
    position: absolute;
    top: 20px; right: 20px;
    background: ${colors.bgInput};
    border: none;
    border-radius: 50%;
    width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    color: ${colors.muted};
    font-size: 16px;
  }
  
  /* ACORDO */
  .acordo-rules { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
  .acordo-rule {
    background: ${colors.bgInput};
    border: 1.5px solid ${colors.plum};
    border-radius: 12px;
    padding: 13px 14px;
    display: flex; align-items: center; gap: 12px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: ${colors.white};
  }
  .acordo-rule.selected { border-color: ${colors.green}; background: rgba(61,214,140,0.08); }
  .check-box { width: 20px; height: 20px; border-radius: 6px; border: 2px solid ${colors.plum}; flex-shrink: 0; transition: all 0.2s; display: flex; align-items: center; justify-content: center; font-size: 11px; }
  .acordo-rule.selected .check-box { background: ${colors.green}; border-color: ${colors.green}; color: #0A2010; }
  
  /* LIMITS MAP */
  .limits-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
  .limit-item { background: ${colors.bgInput}; border: 1px solid ${colors.plum}; border-radius: 14px; padding: 14px; }
  .limit-label { font-size: 13px; font-weight: 500; margin-bottom: 10px; }
  .limit-toggle { display: flex; gap: 6px; }
  .limit-btn {
    flex: 1;
    border: 1.5px solid transparent;
    border-radius: 10px;
    padding: 8px 4px;
    font-size: 12px;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 600;
    background: ${colors.bgCard};
    color: ${colors.muted};
  }
  .limit-btn.yes.active { background: rgba(76,175,122,0.2); border-color: ${colors.yes}; color: ${colors.yes}; }
  .limit-btn.maybe.active { background: rgba(232,184,75,0.2); border-color: ${colors.maybe}; color: ${colors.maybe}; }
  .limit-btn.no.active { background: rgba(224,92,122,0.2); border-color: ${colors.no}; color: ${colors.no}; }
  
  /* CONSENT CHECK */
  .consent-opts { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
  .consent-opt {
    background: ${colors.bgInput};
    border: 1.5px solid ${colors.plum};
    border-radius: 12px;
    padding: 13px 16px;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: ${colors.white};
    transition: all 0.2s;
  }
  .consent-opt.selected { border-color: ${colors.accent}; background: rgba(201,149,107,0.12); color: ${colors.accentLight}; }
  
  /* GUIDE */
  .guide-wrap { padding: 0 16px 100px; }
  .guide-card {
    background: ${colors.bgCard};
    border: 1px solid ${colors.plum};
    border-radius: 16px;
    padding: 18px;
    margin-bottom: 10px;
    display: flex; align-items: center; gap: 16px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .guide-card:hover { border-color: ${colors.accent}; transform: translateX(4px); }
  .guide-icon { font-size: 24px; width: 40px; text-align: center; }
  .guide-content { flex: 1; }
  .guide-title { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; margin-bottom: 3px; }
  .guide-time { font-size: 11px; color: ${colors.muted}; }
  .guide-arrow { color: ${colors.muted}; font-size: 16px; }
  
  /* TRAVEL */
  .travel-wrap { padding: 24px; }
  .travel-input {
    background: ${colors.bgInput};
    border: 1.5px solid ${colors.plum};
    border-radius: 14px;
    padding: 14px 16px;
    width: 100%;
    color: ${colors.white};
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    outline: none;
    margin-bottom: 12px;
    transition: border-color 0.2s;
  }
  .travel-input:focus { border-color: ${colors.lavender}; }
  .travel-input::placeholder { color: ${colors.muted}; }
  
  /* MATCH ANIMATION */
  .match-pop {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.85);
    z-index: 300;
    display: flex; align-items: center; justify-content: center;
    flex-direction: column;
    gap: 24px;
    animation: fadeIn 0.3s ease;
  }
  .match-pop-icon { font-size: 80px; animation: matchPop 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
  .match-pop-title { font-family: 'Playfair Display', serif; font-size: 36px; font-style: italic; background: linear-gradient(135deg, ${colors.accent}, ${colors.rose}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .match-pop-sub { font-size: 14px; color: ${colors.lavLight}; text-align: center; max-width: 260px; line-height: 1.6; }
  .match-pop-btn {
    background: linear-gradient(135deg, ${colors.accent}, ${colors.rose});
    border: none;
    border-radius: 50px;
    padding: 14px 36px;
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: #1A0A2E;
    cursor: pointer;
    margin-top: 8px;
  }

  .invisible-toggle {
    background: ${colors.bgCard};
    border: 1px solid ${colors.plum};
    border-radius: 14px;
    padding: 14px 16px;
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 8px;
  }
  .toggle-switch {
    width: 44px; height: 24px;
    background: ${colors.plum};
    border-radius: 12px;
    position: relative;
    cursor: pointer;
    transition: background 0.3s;
    flex-shrink: 0;
  }
  .toggle-switch.on { background: ${colors.accent}; }
  .toggle-knob {
    position: absolute;
    top: 3px; left: 3px;
    width: 18px; height: 18px;
    background: white;
    border-radius: 50%;
    transition: transform 0.3s;
  }
  .toggle-switch.on .toggle-knob { transform: translateX(20px); }
  .toggle-label { flex: 1; }
  .toggle-title { font-size: 14px; font-weight: 500; }
  .toggle-sub { font-size: 11px; color: ${colors.muted}; margin-top: 2px; }
`;

const icons = { home: "🏠", explore: "🔍", matches: "💬", profile: "👤", guide: "📖" };
const guideIcons = ["💑", "🔒", "🤝", "📱", "💜", "✨"];

export default function BetweenUs() {
  const [language, setLanguage] = useState("pt");
  const [screen, setScreen] = useState("home");
  const [onboardStep, setOnboardStep] = useState(0);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedSeeking, setSelectedSeeking] = useState([]);
  const [selectedDiscretion, setSelectedDiscretion] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [modal, setModal] = useState(null);
  const [acordoRules, setAcordoRules] = useState([]);
  const [limits, setLimits] = useState({});
  const [consentOpts, setConsentOpts] = useState([]);
  const [travelCity, setTravelCity] = useState("");
  const [roomMsg, setRoomMsg] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, text: "Olá! Ficámos muito curiosos com o vosso perfil 😊", mine: false, time: "14:28" },
    { id: 2, text: "Olá! Nós também! O que procuram exatamente?", mine: true, time: "14:30" },
    { id: 3, text: "Uma ligação genuína, sem pressão. Vocês?", mine: false, time: "14:31" },
  ]);
  const [showMatch, setShowMatch] = useState(false);
  const [toggles, setToggles] = useState({ invisible: false, discreet: true });
  const [activeMatch, setActiveMatch] = useState(null);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const T = lang[language];
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const toggleFilter = (f) => setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  const toggleAcordo = (r) => setAcordoRules(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  const toggleConsent = (o) => setConsentOpts(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);
  const setLimit = (cat, val) => setLimits(prev => ({ ...prev, [cat]: val }));
  const sendMsg = () => {
    if (!roomMsg.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), text: roomMsg, mine: true, time: new Date().toLocaleTimeString("pt", { hour: "2-digit", minute: "2-digit" }) }]);
    setRoomMsg("");
    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now() + 1, text: "Adoramos a vossa energia! 💫", mine: false, time: new Date().toLocaleTimeString("pt", { hour: "2-digit", minute: "2-digit" }) }]);
    }, 1200);
  };

  const handleLike = (profile) => {
    setShowMatch(true);
    setTimeout(() => setShowMatch(false), 3000);
  };

  const navItems = [
    { key: "home", label: T.nav.home, icon: "🏠" },
    { key: "explore", label: T.nav.explore, icon: "🔍" },
    { key: "matches", label: T.nav.matches, icon: "💬" },
    { key: "profile", label: T.nav.profile, icon: "👤" },
    { key: "guide", label: T.nav.guide, icon: "📖" },
  ];

  // Screens
  const HomeScreen = () => (
    <div className="home-hero">
      <div className="home-logo-big">{T.appName}</div>
      <div className="home-tagline">{T.tagline}</div>
      <div className="home-tagline-pt">{T.taglinePT}</div>
      <div className="home-entry-cards">
        {[
          { icon: "💑", label: language === "pt" ? "Para Casais" : "For Couples", sub: language === "pt" ? "Explorar juntos, com regras claras" : "Explore together, with clear rules" },
          { icon: "🌟", label: language === "pt" ? "Para Solteiros" : "For Singles", sub: language === "pt" ? "Ligações adultas sem etiquetas" : "Adult connections without labels" },
          { icon: "🔓", label: language === "pt" ? "Relações Abertas" : "Open Relationships", sub: language === "pt" ? "Poliamor, swing, exploração" : "Polyamory, swing, exploration" },
        ].map((e, i) => (
          <div key={i} className="entry-card" onClick={() => { setScreen("onboard"); setOnboardStep(0); }}>
            <span className="ec-icon">{e.icon}</span>
            <div>
              <div className="ec-label">{e.label}</div>
              <div className="ec-sub">{e.sub}</div>
            </div>
          </div>
        ))}
      </div>
      <button className="start-btn" onClick={() => { setScreen("onboard"); setOnboardStep(0); }}>
        {language === "pt" ? "Começar →" : "Get started →"}
      </button>
    </div>
  );

  const OnboardScreen = () => {
    const steps = [
      // Step 0: type
      <div key="s0">
        <div className="onboard-title">{T.onboarding.title}</div>
        <div className="onboard-sub">{T.onboarding.subtitle}</div>
        <div className="option-grid">
          {T.onboarding.types.map((t, i) => (
            <button key={i} className={`option-btn ${selectedType === t ? "selected" : ""}`} onClick={() => setSelectedType(t)}>{t}</button>
          ))}
        </div>
        <button className="next-btn" disabled={!selectedType} onClick={() => setOnboardStep(1)}>{T.onboarding.next}</button>
      </div>,
      // Step 1: seeking
      <div key="s1">
        <div className="onboard-title">{T.onboarding.seeking}</div>
        <div className="onboard-sub">{language === "pt" ? "Podes selecionar mais de um." : "You can select more than one."}</div>
        <div className="option-grid" style={{ marginBottom: 24 }}>
          {T.onboarding.seekingOpts.map((s, i) => (
            <button key={i} className={`option-btn ${selectedSeeking.includes(s) ? "selected" : ""}`} onClick={() => setSelectedSeeking(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}>{s}</button>
          ))}
        </div>
        <button className="next-btn" disabled={selectedSeeking.length === 0} onClick={() => setOnboardStep(2)}>{T.onboarding.next}</button>
      </div>,
      // Step 2: discretion
      <div key="s2">
        <div className="onboard-title">{T.onboarding.discretion}</div>
        <div className="onboard-sub">{language === "pt" ? "Controla quem pode ver o teu perfil." : "Control who can see your profile."}</div>
        <div className="slider-opts" style={{ marginBottom: 28 }}>
          {T.onboarding.discretionOpts.map((d, i) => (
            <div key={i} className={`slider-opt ${selectedDiscretion === d ? "selected" : ""}`} onClick={() => setSelectedDiscretion(d)}>
              <div className="radio-circle" />
              <span>{d}</span>
            </div>
          ))}
        </div>
        <button className="next-btn" disabled={!selectedDiscretion} onClick={() => { setHasOnboarded(true); setScreen("explore"); }}>{T.onboarding.finish}</button>
      </div>,
    ];
    return (
      <div className="onboard-wrap">
        <div className="step-indicator">
          {[0,1,2].map(i => <div key={i} className={`step-dot ${onboardStep >= i ? "active" : ""}`} />)}
        </div>
        {steps[onboardStep]}
        {onboardStep > 0 && (
          <button onClick={() => setOnboardStep(s => s-1)} style={{ background: "none", border: "none", color: colors.muted, marginTop: 16, cursor: "pointer", fontSize: 14, fontFamily: "Inter" }}>← {T.onboarding.back}</button>
        )}
      </div>
    );
  };

  const ExploreScreen = () => (
    <div className="explore-wrap">
      <div className="filter-row">
        {T.explore.filterOpts.map((f, i) => (
          <div key={i} className={`filter-chip ${activeFilters.includes(f) ? "active" : ""}`} onClick={() => toggleFilter(f)}>{f}</div>
        ))}
      </div>
      {profiles.map(p => (
        <div key={p.id} className="profile-card">
          <div className="card-photo">
            <div className="card-photo-inner">
              <div className={`card-photo-avatar ${p.blurred ? "blurred" : ""}`}>{p.type === "Couple" ? "💑" : "🧑"}</div>
              {p.blurred && <div className="blur-badge">📷 {T.explore.noFace}</div>}
            </div>
            {p.verified && <div className="verified-badge">✓ {T.explore.verified}</div>}
            <div className="score-badge">★ {T.explore.score} {p.score}</div>
          </div>
          <div className="card-body">
            <div className="card-name">{p.name}</div>
            <div className="card-meta">{p.age} · {p.distance} · {p.type}</div>
            <div className="card-bio">{p.bio}</div>
            <div className="card-tags">{p.tags.map((t, i) => <span key={i} className="tag">{t}</span>)}</div>
            <div className="card-actions">
              <button className="action-btn btn-pass">{T.explore.pass}</button>
              <button className="action-btn btn-super">{T.explore.superlike}</button>
              <button className="action-btn btn-like" onClick={() => handleLike(p)}>{T.explore.like}</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const MatchesScreen = () => (
    <div className="matches-wrap">
      {activeMatch ? (
        <div className="room-wrap" style={{ height: "calc(100vh - 140px)" }}>
          <div className="room-header">
            <button className="room-back" onClick={() => setActiveMatch(null)}>←</button>
            <div className="room-name">{activeMatch.name}</div>
            <div className="room-actions-top">
              <button className="room-action-btn" onClick={() => setModal("consent")}>🤝</button>
              <button className="room-action-btn danger" onClick={() => setActiveMatch(null)}>{T.room.safeExit}</button>
            </div>
          </div>
          <div className="rules-banner" onClick={() => setModal("acordo")}>
            {T.room.rules} — {language === "pt" ? "Ver regras combinadas" : "View agreed rules"}
          </div>
          <div className="messages-area">
            {messages.map(m => (
              <div key={m.id} className={`msg ${m.mine ? "mine" : "theirs"}`}>
                <div className="msg-bubble">{m.text}</div>
                <div className="msg-time">{m.time}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="room-input-area">
            <textarea
              className="room-input"
              placeholder={T.room.placeholder}
              value={roomMsg}
              onChange={e => setRoomMsg(e.target.value)}
              rows={1}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
            />
            <button className="send-btn" onClick={sendMsg}>↑</button>
          </div>
        </div>
      ) : (
        <>
          {matchList.map(m => (
            <div key={m.id} className="match-item" onClick={() => setActiveMatch(m)}>
              <div className="match-avatar">{m.name.includes("&") ? "💑" : "🧑"}</div>
              <div className="match-info">
                <div className="match-name">{m.name}</div>
                <div className="match-last">{m.lastMsg}</div>
                {m.bothApproved && <div className="match-both">{T.match.bothApproved}</div>}
              </div>
              <div className="match-meta">
                <div className="match-time">{m.time}</div>
                {m.unread > 0 && <div className="unread-dot">{m.unread}</div>}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  const ProfileScreen = () => (
    <div className="profile-wrap">
      <div className="profile-hero">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">🧑</div>
          <div className="profile-verified-badge">✓</div>
        </div>
        <div className="profile-name">Alexandra M.</div>
        <div className="profile-type">{language === "pt" ? "Relação aberta · Lisboa" : "Open relationship · Lisbon"}</div>
        <div className="profile-score">★ Between Score: 88</div>
        <button className="edit-btn">{T.profile.editBtn}</button>
      </div>

      <div className="stats-row">
        <div className="stat-item"><div className="stat-val">248</div><div className="stat-label">{T.profile.views}</div></div>
        <div className="stat-item"><div className="stat-val">34</div><div className="stat-label">{T.profile.likes}</div></div>
        <div className="stat-item"><div className="stat-val">12</div><div className="stat-label">{T.profile.matches}</div></div>
      </div>

      <div className="profile-section">
        <div className="section-title">{language === "pt" ? "Ferramentas" : "Tools"}</div>
        <div className="feature-list">
          {[
            { icon: "🤝", label: T.profile.modeAcordo, key: "acordo" },
            { icon: "🗺️", label: T.profile.limitsMap, key: "limits" },
            { icon: "✈️", label: language === "pt" ? "Modo Viagem" : "Travel Mode", key: "travel" },
            { icon: "🔍", label: language === "pt" ? "Consent Check" : "Consent Check", key: "consent" },
          ].map((f, i) => (
            <div key={i} className="feature-item" onClick={() => setModal(f.key)}>
              <span className="feature-icon">{f.icon}</span>
              <span className="feature-label">{f.label}</span>
              <span className="feature-arrow">›</span>
            </div>
          ))}
        </div>
      </div>

      <div className="profile-section">
        <div className="section-title">{language === "pt" ? "Privacidade" : "Privacy"}</div>
        <div className="invisible-toggle">
          <span style={{ fontSize: 20, width: 36, textAlign: "center" }}>👁</span>
          <div className="toggle-label">
            <div className="toggle-title">{T.profile.invisible}</div>
            <div className="toggle-sub">{language === "pt" ? "Navega sem seres visto" : "Browse without being seen"}</div>
          </div>
          <div className={`toggle-switch ${toggles.invisible ? "on" : ""}`} onClick={() => setToggles(p => ({ ...p, invisible: !p.invisible }))}>
            <div className="toggle-knob" />
          </div>
        </div>
        <div className="invisible-toggle">
          <span style={{ fontSize: 20, width: 36, textAlign: "center" }}>🔒</span>
          <div className="toggle-label">
            <div className="toggle-title">{T.profile.discreteMode}</div>
            <div className="toggle-sub">{language === "pt" ? "Notificações e ícone discreto" : "Discreet notifications & icon"}</div>
          </div>
          <div className={`toggle-switch ${toggles.discreet ? "on" : ""}`} onClick={() => setToggles(p => ({ ...p, discreet: !p.discreet }))}>
            <div className="toggle-knob" />
          </div>
        </div>
      </div>

      <div className="premium-card">
        <div className="premium-title">✦ Between Premium</div>
        <div className="premium-features-list">
          {T.profile.premiumFeatures.map((f, i) => <div key={i} className="premium-feat">{f}</div>)}
        </div>
        <button className="premium-btn">{T.profile.premium} ✦</button>
      </div>
    </div>
  );

  const GuideScreen = () => (
    <div className="guide-wrap">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Playfair Display, serif", fontSize: 13, color: colors.muted, fontStyle: "italic" }}>
          {language === "pt" ? "Aprende, explora com segurança." : "Learn, explore safely."}
        </div>
      </div>
      {T.guide.articles.map((a, i) => (
        <div key={i} className="guide-card">
          <div className="guide-icon">{guideIcons[i]}</div>
          <div className="guide-content">
            <div className="guide-title">{a.title}</div>
            <div className="guide-time">⏱ {a.time} {language === "pt" ? "leitura" : "read"}</div>
          </div>
          <div className="guide-arrow">›</div>
        </div>
      ))}
    </div>
  );

  // Modals
  const AcordoModal = () => (
    <div className="modal-overlay" onClick={() => setModal(null)}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">{T.acordo.title}</div>
        <div className="modal-sub">{T.acordo.subtitle}</div>
        <div className="acordo-rules">
          {T.acordo.rules.map((r, i) => (
            <div key={i} className={`acordo-rule ${acordoRules.includes(r) ? "selected" : ""}`} onClick={() => toggleAcordo(r)}>
              <div className="check-box">{acordoRules.includes(r) ? "✓" : ""}</div>
              {r}
            </div>
          ))}
        </div>
        <button className="next-btn" onClick={() => setModal(null)}>{T.acordo.save}</button>
      </div>
    </div>
  );

  const LimitsModal = () => (
    <div className="modal-overlay" onClick={() => setModal(null)}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">{T.limits.title}</div>
        <div className="modal-sub">{T.limits.subtitle}</div>
        <div className="limits-list">
          {T.limits.categories.map((cat, i) => (
            <div key={i} className="limit-item">
              <div className="limit-label">{cat}</div>
              <div className="limit-toggle">
                {["yes", "maybe", "no"].map(v => (
                  <button key={v} className={`limit-btn ${v} ${limits[cat] === v ? "active" : ""}`} onClick={() => setLimit(cat, v)}>
                    {v === "yes" ? T.limits.yes : v === "maybe" ? T.limits.maybe : T.limits.no}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className="next-btn" onClick={() => setModal(null)}>{T.limits.save}</button>
      </div>
    </div>
  );

  const ConsentModal = () => (
    <div className="modal-overlay" onClick={() => setModal(null)}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">{T.consent.title}</div>
        <div className="modal-sub">{T.consent.subtitle}</div>
        <div className="consent-opts">
          {T.consent.opts.map((o, i) => (
            <div key={i} className={`consent-opt ${consentOpts.includes(o) ? "selected" : ""}`} onClick={() => toggleConsent(o)}>{o}</div>
          ))}
        </div>
        <button className="next-btn" onClick={() => setModal(null)}>{T.consent.confirm}</button>
      </div>
    </div>
  );

  const TravelModal = () => (
    <div className="modal-overlay" onClick={() => setModal(null)}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">{T.travel.title}</div>
        <div className="modal-sub">{T.travel.subtitle}</div>
        <input className="travel-input" placeholder={T.travel.placeholder} value={travelCity} onChange={e => setTravelCity(e.target.value)} />
        <input className="travel-input" placeholder={T.travel.dates} type="text" onFocus={e => e.target.type = "date"} onBlur={e => e.target.type = "text"} />
        <button className="next-btn" onClick={() => setModal(null)}>{T.travel.activate}</button>
      </div>
    </div>
  );

  const currentScreen = () => {
    if (screen === "home") return <HomeScreen />;
    if (screen === "onboard") return <OnboardScreen />;
    if (screen === "explore") return <ExploreScreen />;
    if (screen === "matches") return <MatchesScreen />;
    if (screen === "profile") return <ProfileScreen />;
    if (screen === "guide") return <GuideScreen />;
    return <HomeScreen />;
  };

  const mainScreens = ["explore", "matches", "profile", "guide"];

  return (
    <>
      <style>{css}</style>
      <div className="app-shell">
        <div className="top-bar">
          <span className="logo">Between Us<span className="logo-dot" /></span>
          <button className="lang-toggle" onClick={() => setLanguage(l => l === "pt" ? "en" : "pt")}>
            {language === "pt" ? "EN" : "PT"}
          </button>
        </div>

        <div className="screen">
          {currentScreen()}
        </div>

        {(mainScreens.includes(screen) || hasOnboarded) && screen !== "home" && screen !== "onboard" && (
          <nav className="bottom-nav">
            {navItems.filter(n => n.key !== "home").map(n => (
              <button key={n.key} className={`nav-item ${screen === n.key ? "active" : ""}`} onClick={() => setScreen(n.key)}>
                <span className="nav-icon">{n.icon}</span>
                <span className="nav-label">{n.label}</span>
              </button>
            ))}
          </nav>
        )}

        {modal === "acordo" && <AcordoModal />}
        {modal === "limits" && <LimitsModal />}
        {modal === "consent" && <ConsentModal />}
        {modal === "travel" && <TravelModal />}

        {showMatch && (
          <div className="match-pop" onClick={() => setShowMatch(false)}>
            <div className="match-pop-icon">💫</div>
            <div className="match-pop-title">{T.match.newMatch}</div>
            <div className="match-pop-sub">{language === "pt" ? "É mútuo! Ambos demonstraram interesse." : "It's mutual! Both showed interest."}</div>
            <button className="match-pop-btn" onClick={() => { setShowMatch(false); setScreen("matches"); }}>
              {T.match.openRoom}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
