// Sistema de localidades — distância aproximada entre duas localidades
// catalogadas (GeoLocation), nunca entre coordenadas reais do utilizador
// (que nunca são recolhidas — ver docs/product/LOCATION_SYSTEM.md).
//
// Reutiliza haversineKm já existente em utils/location.ts (usado desde
// antes desta funcionalidade para a aproximação por locationLat/locationLng
// do perfil) em vez de reimplementar a fórmula de Haversine uma segunda
// vez — um único sítio com a matemática, vários consumidores.
import { haversineKm } from '../utils/location'

export interface DistanceLocationInput {
  latitude: number
  longitude: number
}

// calculateDistanceKm — valor exacto (não arredondado), só para uso
// interno no backend (filtros, ordenação, Between Score). Nunca devolvido
// directamente ao frontend — ver roundDistanceForDisplay/getDistanceBucket
// para o que é seguro mostrar.
export const calculateDistanceKm = (a: DistanceLocationInput, b: DistanceLocationInput): number =>
  haversineKm(a.latitude, a.longitude, b.latitude, b.longitude)

// roundDistanceForDisplay — nunca "17,36 km" (secção 14 do pedido,
// exemplo explícito do que NÃO fazer). Arredonda para um número redondo
// consoante a magnitude, para nunca sugerir uma precisão que a fonte
// (centro aproximado de uma localidade, não a posição real de ninguém)
// não tem.
export const roundDistanceForDisplay = (distanceKm: number): number => {
  if (distanceKm < 10) return Math.round(distanceKm)
  if (distanceKm < 100) return Math.round(distanceKm / 5) * 5
  return Math.round(distanceKm / 25) * 25
}

export type DistanceBucket = '0-10' | '10-25' | '25-50' | '50-100' | '100-250' | '250+'

export interface DistanceBucketInfo {
  bucket: DistanceBucket
  label: string
}

// getDistanceBucket — a política de apresentação recomendada pela secção
// 14 do pedido: 0–10 / 10–25 / 25–50 / 50–100 / 100–250 / 250+ km. Usado
// pelo frontend em vez do valor exacto sempre que a distância é mostrada
// a outro utilizador (nunca ao próprio, que já sabe onde vive).
export const getDistanceBucket = (distanceKm: number): DistanceBucketInfo => {
  if (distanceKm < 10) return { bucket: '0-10', label: 'menos de 10 km' }
  if (distanceKm < 25) return { bucket: '10-25', label: 'cerca de 10–25 km' }
  if (distanceKm < 50) return { bucket: '25-50', label: 'cerca de 25–50 km' }
  if (distanceKm < 100) return { bucket: '50-100', label: 'cerca de 50–100 km' }
  if (distanceKm < 250) return { bucket: '100-250', label: 'cerca de 100–250 km' }
  return { bucket: '250+', label: 'mais de 250 km' }
}
