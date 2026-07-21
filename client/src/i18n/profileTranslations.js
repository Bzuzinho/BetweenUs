export const profileTranslations = {
  'pt-PT': {
    title:'Perfil', logout:'Sair', verified:'Verificado', accountSection:'Conta', myAccount:'A minha conta',
    accountDesc:'Nome, email, NIF, imagem, subscrição', changePassword:'Alterar password', passwordDesc:'Receber link por email',
    publicSection:'Perfil público', editProfile:'Editar perfil', editProfileDesc:'Nome visível, bio, cidade, intenções',
    photos:'Fotos', photosDesc:'Gerir fotos e tipo de visualização', privacy:'Privacidade', privacyDesc:'Invisível, distância, notificações',
    verifyProfile:'Verificar perfil', verifyDesc:'Selfie de verificação', coupleProfile:'Perfil de casal', coupleDesc:'Criar ou gerir perfil de casal',
    groupProfile:'Perfil de grupo', groupDesc:'Trio, poliamor ou grupo personalizado', blockContacts:'Bloquear contactos', blockContactsDesc:'Ocultar-te de pessoas conhecidas',
    subscription:'Subscrição', plusActive:'Between Plus ativo', plus:'Between Plus', activeUntil:'Ativo até', plusDesc:'Modo invisível, Travel Mode e mais', active:'Ativo',
    invitations:'Convites', inviteFriends:'Convidar amigos', inviteDesc:'Ganha meses premium por cada pessoa que convidares',
    exportData:'Exportar dados', terms:'Termos', loading:'A carregar…'
  },
  en: {
    title:'Profile', logout:'Log out', verified:'Verified', accountSection:'Account', myAccount:'My account',
    accountDesc:'Name, email, tax number, image and subscription', changePassword:'Change password', passwordDesc:'Receive a link by email',
    publicSection:'Public profile', editProfile:'Edit profile', editProfileDesc:'Display name, bio, city and intentions',
    photos:'Photos', photosDesc:'Manage photos and visibility type', privacy:'Privacy', privacyDesc:'Invisible mode, distance and notifications',
    verifyProfile:'Verify profile', verifyDesc:'Verification selfie', coupleProfile:'Couple profile', coupleDesc:'Create or manage a couple profile',
    groupProfile:'Group profile', groupDesc:'Throuple, polyamory or a custom group', blockContacts:'Block contacts', blockContactsDesc:'Hide from people you may know',
    subscription:'Subscription', plusActive:'Between Plus active', plus:'Between Plus', activeUntil:'Active until', plusDesc:'Invisible mode, Travel Mode and more', active:'Active',
    invitations:'Invitations', inviteFriends:'Invite friends', inviteDesc:'Earn premium months for each person you invite',
    exportData:'Export data', terms:'Terms', loading:'Loading…'
  },
  fr: {
    title:'Profil', logout:'Se déconnecter', verified:'Vérifié', accountSection:'Compte', myAccount:'Mon compte',
    accountDesc:'Nom, e-mail, numéro fiscal, image et abonnement', changePassword:'Modifier le mot de passe', passwordDesc:'Recevoir un lien par e-mail',
    publicSection:'Profil public', editProfile:'Modifier le profil', editProfileDesc:'Nom visible, bio, ville et intentions',
    photos:'Photos', photosDesc:'Gérer les photos et leur niveau de visibilité', privacy:'Confidentialité', privacyDesc:'Mode invisible, distance et notifications',
    verifyProfile:'Vérifier le profil', verifyDesc:'Selfie de vérification', coupleProfile:'Profil de couple', coupleDesc:'Créer ou gérer un profil de couple',
    groupProfile:'Profil de groupe', groupDesc:'Trouple, polyamour ou groupe personnalisé', blockContacts:'Bloquer des contacts', blockContactsDesc:'Vous masquer des personnes que vous connaissez',
    subscription:'Abonnement', plusActive:'Between Plus actif', plus:'Between Plus', activeUntil:'Actif jusqu’au', plusDesc:'Mode invisible, Travel Mode et plus encore', active:'Actif',
    invitations:'Invitations', inviteFriends:'Inviter des amis', inviteDesc:'Gagnez des mois premium pour chaque personne invitée',
    exportData:'Exporter les données', terms:'Conditions', loading:'Chargement…'
  }
}

export function createProfileTranslator(language) {
  const selected = profileTranslations[language] || profileTranslations['pt-PT']
  return key => selected[key] || profileTranslations['pt-PT'][key] || key
}
