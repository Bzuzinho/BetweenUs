export const ADMIN_LOCATION_ENDPOINTS = {
  search:'/locations/admin/search',
  unresolved:'/locations/admin/profiles-without-reference',
  deactivate:locationId => `/locations/admin/${locationId}/deactivate`,
  assignProfile:profileId => `/locations/admin/profiles/${profileId}/location`,
}

export const ADMIN_LOCATION_SEARCH_MIN_LENGTH = 2
export const ADMIN_UNRESOLVED_PROFILE_LIMIT = 50
