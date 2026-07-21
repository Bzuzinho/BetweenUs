export const ADMIN_CATALOG_CONFIGS = {
  genders:{ basePath:'/catalog/admin/genders', dataKey:'genders', labelKey:'admin.settings.catalogs.genders', singularKey:'admin.settings.catalogs.gender' },
  orientations:{ basePath:'/catalog/admin/orientations', dataKey:'orientations', labelKey:'admin.settings.catalogs.orientations', singularKey:'admin.settings.catalogs.orientation' },
  privateInterests:{ basePath:'/private-interests/admin', dataKey:'interests', labelKey:'admin.settings.catalogs.privateInterests', singularKey:'admin.settings.catalogs.privateInterest', showCategory:true },
  intentions:{ basePath:'/catalog/admin/intentions', dataKey:'intentions', labelKey:'admin.settings.catalogs.intentions', singularKey:'admin.settings.catalogs.intention', showCategory:true, nameField:'name' },
}
