export const ADMIN_SETTINGS_TABS = [
  'profiles','adminRoles','genders','orientations','intentions','boundaries','privateInterests','locations','subscriptions','email','guide','events','circles','recommendations','referrals',
]

export const BOUNDARY_RULE_TYPES = ['MUTUAL_ALIGNMENT','REQUIRE_TARGET_ACCEPTANCE','PERSONAL_PREFERENCE','CANDIDATE_CONSTRAINT']
export const BOUNDARY_CONSTRAINT_TYPES = ['EXCLUDE_COUPLES','COUPLES_ONLY','INDIVIDUALS_ONLY','VERIFIED_ONLY']
export const EVENT_STATUSES = ['DRAFT','PENDING_REVIEW','PUBLISHED','CANCELLED','COMPLETED','SUSPENDED']
export const CIRCLE_VISIBILITIES = ['DISCOVERABLE','PRIVATE','INVITE_ONLY']
export const CIRCLE_STATUSES = ['DRAFT','ACTIVE','PAUSED','ARCHIVED']
export const GUIDE_CATEGORIES = ['CONSENT','COUPLES','OPEN_RELATIONSHIPS','POLYAMORY','PRIVACY','SAFETY','PROFILES','FIRST_MEETINGS','PRIVATE_INTERESTS']

export const ADMIN_CATALOG_CONFIGS = {
  genders: {
    endpoint:'/catalog/admin/genders', responseKey:'genders', itemLabelKey:'label', titleKey:'admin.settings.catalogs.genders.title', singularKey:'admin.settings.catalogs.genders.singular',
    fields:['label','slug','description','sortOrder'], defaults:{ label:'', slug:'', description:'', sortOrder:0, active:true },
  },
  orientations: {
    endpoint:'/catalog/admin/orientations', responseKey:'orientations', itemLabelKey:'label', titleKey:'admin.settings.catalogs.orientations.title', singularKey:'admin.settings.catalogs.orientations.singular',
    fields:['label','slug','description','sortOrder'], defaults:{ label:'', slug:'', description:'', sortOrder:0, active:true },
  },
  intentions: {
    endpoint:'/catalog/admin/intentions', responseKey:'intentions', itemLabelKey:'name', titleKey:'admin.settings.catalogs.intentions.title', singularKey:'admin.settings.catalogs.intentions.singular',
    fields:['name','slug','description','category','sortOrder'], defaults:{ name:'', slug:'', description:'', category:'', sortOrder:0, active:true },
  },
  privateInterests: {
    endpoint:'/private-interests/admin', responseKey:'interests', itemLabelKey:'label', titleKey:'admin.settings.catalogs.privateInterests.title', singularKey:'admin.settings.catalogs.privateInterests.singular',
    fields:['label','slug','description','category','sortOrder'], defaults:{ label:'', slug:'', description:'', category:'', sortOrder:0, active:true }, sensitive:true,
  },
  boundaries: {
    endpoint:'/catalog/admin/boundaries', responseKey:'boundaries', itemLabelKey:'name', titleKey:'admin.settings.catalogs.boundaries.title', singularKey:'admin.settings.catalogs.boundaries.singular',
    fields:['name','slug','description','category','ruleType','constraintType','sortOrder'], defaults:{ name:'', slug:'', description:'', category:'', ruleType:'MUTUAL_ALIGNMENT', constraintType:'', sortOrder:0, isHardBoundary:false, sensitive:false, active:true }, boundary:true,
  },
}

export const ADMIN_ROLE_REFERENCE = [
  { value:'CONTENT_REVIEWER', permissions:['photos','profiles'] },
  { value:'SUPPORT', permissions:['users','reports'] },
  { value:'MODERATOR', permissions:['profiles','photos','conversations'] },
  { value:'FINANCE', permissions:['users'] },
  { value:'ADMIN', permissions:['dashboard','reports','photos','profiles','users','verifications','conversations','audit','beta'] },
  { value:'SUPER_ADMIN', permissions:['*'] },
]
