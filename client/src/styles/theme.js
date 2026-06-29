// Between Us — Design Tokens
// src/styles/theme.js

export const colors = {
  bg:          "#0E0818",  // Deep dark plum — background principal
  bgCard:      "#1A1028",  // Cards e superfícies elevadas
  bgInput:     "#231535",  // Inputs e áreas de formulário
  plum:        "#2D1B4E",  // Bordas, separadores
  accent:      "#C9956B",  // Rose gold — cor de ação principal
  accentLight: "#E8B89A",  // Hover states, ícones ativos
  rose:        "#F2C4B8",  // Gradiente secundário
  lavender:    "#8B7BA8",  // Texto de suporte, labels
  lavLight:    "#B8A9D4",  // Texto de destaque secundário
  white:       "#FAF7F5",  // Texto principal (warm white)
  muted:       "#7A6E88",  // Texto desativado, placeholders
  yes:         "#4CAF7A",  // Confirmação / Sim
  maybe:       "#E8B84B",  // Neutro / Talvez
  no:          "#E05C7A",  // Recusa / Não
  green:       "#3DD68C",  // Verificado, aprovado, ativo
};

export const typography = {
  display: "'Playfair Display', Georgia, serif",
  body:    "'Inter', -apple-system, sans-serif",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const radius = { sm: 8, md: 14, lg: 20, xl: 24, pill: 50 };

export const shadows = {
  accent: "0 6px 24px rgba(201,149,107,0.4)",
  card:   "0 2px 12px rgba(0,0,0,0.3)",
  modal:  "0 -4px 40px rgba(0,0,0,0.5)",
};

export const gradients = {
  accent:  "linear-gradient(135deg, #C9956B, #F2C4B8)",
  hero:    "radial-gradient(ellipse at 50% 30%, #2D1B4E 0%, #0E0818 70%)",
  profile: "linear-gradient(180deg, #2D1B4E 0%, #0E0818 100%)",
  logo:    "linear-gradient(135deg, #C9956B 0%, #F2C4B8 50%, #B8A9D4 100%)",
  premium: "linear-gradient(135deg, #2D1B4E, #1A0A40)",
};

// Google Fonts:
// @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap');

