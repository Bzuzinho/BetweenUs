// T6: Location privacy utilities
// Coordinates are coarsened before storage to avoid precision leaks.

/**
 * Rounds a coordinate to reduce precision.
 * 1 decimal place ≈ ±11km — good for city-level discovery without revealing neighbourhood.
 * Default: 1 decimal place.
 */
export const coarsenCoordinate = (coord: number, decimals = 1): number =>
  Math.round(coord * Math.pow(10, decimals)) / Math.pow(10, decimals)

/**
 * Returns an approximate distance string.
 * Never reveals distances under 1km for privacy.
 */
export const formatApproxDistance = (distanceKm: number): string => {
  if (distanceKm < 1) return '< 1 km'
  if (distanceKm < 5) return '< 5 km'
  if (distanceKm < 10) return '< 10 km'
  if (distanceKm < 25) return '< 25 km'
  if (distanceKm < 50) return '< 50 km'
  if (distanceKm < 100) return '< 100 km'
  return '> 100 km'
}

/**
 * Haversine distance between two coordinates (km).
 */
export const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
