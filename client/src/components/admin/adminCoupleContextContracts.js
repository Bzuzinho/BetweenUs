export const SHARED_PROFILE_TYPES = ['COUPLE', 'GROUP']
export const SHARED_MEMBER_STATUSES = ['PENDING', 'ACCEPTED', 'DECLINED', 'REMOVED']
export const INDIVIDUAL_DISCOVERY_POLICIES = ['SHARED_ONLY', 'INDIVIDUAL_AND_SHARED']

export const sharedProfileTypeKey = type => type === 'GROUP' ? 'group' : 'couple'
export const discoveryPolicyKey = policy => policy === 'INDIVIDUAL_AND_SHARED' ? 'individualAndShared' : 'sharedOnly'
