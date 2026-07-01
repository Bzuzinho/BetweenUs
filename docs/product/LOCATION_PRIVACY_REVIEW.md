# Revisão de Privacidade de Localização — Between Us
> Versão: 1.0-draft | Julho 2026
> ⚠️ TEMPLATE INTERNO.

---

## Estado actual

### O que é guardado
- `locationLat` e `locationLng` no modelo `Profile` em coordenadas exactas
- `city` e `country` como strings (sem coordenadas)
- `TravelMode` com `city` e `country` (sem coordenadas GPS)

### O que é mostrado
- `showDistance` em `PrivacySettings` — toggle para mostrar/ocultar distância
- Distância calculada no discovery mas sem arredondamento das coordenadas base

---

## Problemas identificados

### P1 — Coordenadas exactas no perfil (RISCO ALTO)
Se a BD for comprometida, a localização exacta de cada utilizador fica exposta.
Para uma plataforma adulta e discreta, isto é especialmente crítico.

### P2 — Distância sem coarsening
O discovery mostra distância com base em coordenadas exactas.
Mesmo com `showDistance: false`, as coordenadas exactas existem na BD.

---

## Correcções recomendadas

### Coarsen antes de guardar (PRIORITÁRIO)
Em vez de guardar `40.7128, -74.0060`, guardar `40.7, -74.0` (1 casa decimal ≈ 11km de precisão).

```typescript
// No endpoint de criação/actualização de perfil
const coarsenCoord = (coord: number, precision = 1): number =>
  Math.round(coord * Math.pow(10, precision)) / Math.pow(10, precision)

// Antes de guardar:
locationLat: coarsenCoord(lat)
locationLng: coarsenCoord(lng)
```

**Precisão por casas decimais:**
- 0 casas → ±111km (demasiado impreciso para discovery útil)
- 1 casa → ±11km (recomendado — zona sem revelar bairro)
- 2 casas → ±1.1km (ainda pode revelar bairro em cidades densas)

### Adicionar minDistanceKm
Permitir que o utilizador defina uma distância mínima (ex: "não mostrar perfis a menos de 2km") para proteger utilizadores em zonas pequenas.

### Nunca mostrar distância inferior a 1km
Na resposta da API, truncar qualquer distância calculada a um mínimo de "< 1 km".

---

## Finalidade e retenção

| Dado | Finalidade | Retenção |
|---|---|---|
| locationLat/Lng | Discovery, compatibilidade geográfica | Duração da conta |
| city/country | Exibição no perfil | Duração da conta |
| TravelMode city | Discovery temporário | Até endDate do TravelMode |

---

## Consentimento

A recolha de localização requer consentimento explícito (`locationConsent` no registo).
Se o utilizador não consentiu, não devem ser recolhidas coordenadas GPS.
A cidade pode ser pedida sem coordenadas.
