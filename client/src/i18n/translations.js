export const SUPPORTED_LANGUAGES = ['pt-PT', 'en', 'fr']

export const LANGUAGE_OPTIONS = [
  { value: 'pt-PT', label: 'Português' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
]

export const translations = {
  'pt-PT': {
    common: {
      save: 'Guardar', saving: 'A guardar…', continue: 'Continuar', back: 'Voltar', loading: 'A carregar…',
      language: 'Idioma', portuguese: 'Português', english: 'Inglês', french: 'Francês',
      individualProfile: 'Perfil individual', coupleProfile: 'Perfil de casal', groupProfile: 'Perfil de grupo',
      active: 'Ativo', user: 'Utilizador', profile: 'Perfil', logout: 'Sair',
    },
    nav: { explore: 'Explorar', matches: 'Matches', profile: 'Perfil', rooms: 'Salas', guide: 'Guia' },
    register: {
      title: 'Criar conta', subtitle: 'Privacidade por defeito. Consentimento primeiro.', account: 'A tua conta',
      email: 'Email', password: 'Password (mín. 8 caracteres)', inviteCode: 'Código de convite (se necessário)',
      chooseLanguage: 'Escolhe o idioma da aplicação', ageVerification: 'Verificação de idade', adultsOnly: 'Esta plataforma é exclusiva para maiores de 18 anos.',
      birthDate: 'Data de nascimento', ageConsent: 'Tenho 18 anos ou mais.', acceptTerms: 'Aceito os Termos de Utilização.',
      acceptPrivacy: 'Aceito a Política de Privacidade.', acceptSensitive: 'Aceito o tratamento de dados sensíveis necessário ao serviço (orientação, estado da relação e intenções).',
      create: 'Criar conta', creating: 'A criar…', already: 'Já tens conta?', login: 'Entrar',
      requiredCredentials: 'Email e password obrigatórios.', shortPassword: 'A password deve ter pelo menos 8 caracteres.',
      requiredBirthDate: 'Data de nascimento obrigatória.', requiredAge: 'Tens de confirmar que tens pelo menos 18 anos.',
      requiredTerms: 'Tens de aceitar os Termos de Utilização.', requiredPrivacy: 'Tens de aceitar a Política de Privacidade.',
      requiredSensitive: 'Tens de aceitar o tratamento de dados sensíveis.', createError: 'Erro ao criar conta.',
    },
    account: {
      title: 'A minha conta', updated: 'Conta atualizada.', saveError: 'Erro ao guardar.', accountData: 'Dados da conta',
      realName: 'Nome real', private: 'privado', fullName: 'O teu nome completo', optional: 'opcional', taxpayer: 'Contribuinte',
      appLanguage: 'Idioma da aplicação', languageHelp: 'Esta preferência aplica-se à aplicação em todos os dispositivos após iniciares sessão.',
    },
    profileSwitcher: { useAs: 'Usar a aplicação como', change: 'Mudar de perfil' },
  },
  en: {
    common: {
      save: 'Save', saving: 'Saving…', continue: 'Continue', back: 'Back', loading: 'Loading…',
      language: 'Language', portuguese: 'Portuguese', english: 'English', french: 'French',
      individualProfile: 'Individual profile', coupleProfile: 'Couple profile', groupProfile: 'Group profile',
      active: 'Active', user: 'User', profile: 'Profile', logout: 'Log out',
    },
    nav: { explore: 'Explore', matches: 'Matches', profile: 'Profile', rooms: 'Rooms', guide: 'Guide' },
    register: {
      title: 'Create account', subtitle: 'Private by default. Consent first.', account: 'Your account',
      email: 'Email', password: 'Password (min. 8 characters)', inviteCode: 'Invitation code (if required)',
      chooseLanguage: 'Choose the application language', ageVerification: 'Age verification', adultsOnly: 'This platform is exclusively for adults aged 18 or over.',
      birthDate: 'Date of birth', ageConsent: 'I am 18 years old or over.', acceptTerms: 'I accept the Terms of Use.',
      acceptPrivacy: 'I accept the Privacy Policy.', acceptSensitive: 'I accept the processing of sensitive data required to provide the service (orientation, relationship status and intentions).',
      create: 'Create account', creating: 'Creating…', already: 'Already have an account?', login: 'Log in',
      requiredCredentials: 'Email and password are required.', shortPassword: 'The password must contain at least 8 characters.',
      requiredBirthDate: 'Date of birth is required.', requiredAge: 'You must confirm that you are at least 18 years old.',
      requiredTerms: 'You must accept the Terms of Use.', requiredPrivacy: 'You must accept the Privacy Policy.',
      requiredSensitive: 'You must accept the processing of sensitive data.', createError: 'Unable to create the account.',
    },
    account: {
      title: 'My account', updated: 'Account updated.', saveError: 'Unable to save.', accountData: 'Account details',
      realName: 'Real name', private: 'private', fullName: 'Your full name', optional: 'optional', taxpayer: 'Tax number',
      appLanguage: 'Application language', languageHelp: 'This preference is applied to the application on every device after you log in.',
    },
    profileSwitcher: { useAs: 'Use the application as', change: 'Change profile' },
  },
  fr: {
    common: {
      save: 'Enregistrer', saving: 'Enregistrement…', continue: 'Continuer', back: 'Retour', loading: 'Chargement…',
      language: 'Langue', portuguese: 'Portugais', english: 'Anglais', french: 'Français',
      individualProfile: 'Profil individuel', coupleProfile: 'Profil de couple', groupProfile: 'Profil de groupe',
      active: 'Actif', user: 'Utilisateur', profile: 'Profil', logout: 'Se déconnecter',
    },
    nav: { explore: 'Explorer', matches: 'Matchs', profile: 'Profil', rooms: 'Salons', guide: 'Guide' },
    register: {
      title: 'Créer un compte', subtitle: 'Confidentialité par défaut. Consentement avant tout.', account: 'Votre compte',
      email: 'E-mail', password: 'Mot de passe (8 caractères minimum)', inviteCode: 'Code d’invitation (si nécessaire)',
      chooseLanguage: 'Choisissez la langue de l’application', ageVerification: 'Vérification de l’âge', adultsOnly: 'Cette plateforme est exclusivement réservée aux personnes âgées de 18 ans ou plus.',
      birthDate: 'Date de naissance', ageConsent: 'J’ai 18 ans ou plus.', acceptTerms: 'J’accepte les Conditions d’utilisation.',
      acceptPrivacy: 'J’accepte la Politique de confidentialité.', acceptSensitive: 'J’accepte le traitement des données sensibles nécessaires au service (orientation, situation relationnelle et intentions).',
      create: 'Créer le compte', creating: 'Création…', already: 'Vous avez déjà un compte ?', login: 'Se connecter',
      requiredCredentials: 'L’e-mail et le mot de passe sont obligatoires.', shortPassword: 'Le mot de passe doit comporter au moins 8 caractères.',
      requiredBirthDate: 'La date de naissance est obligatoire.', requiredAge: 'Vous devez confirmer que vous avez au moins 18 ans.',
      requiredTerms: 'Vous devez accepter les Conditions d’utilisation.', requiredPrivacy: 'Vous devez accepter la Politique de confidentialité.',
      requiredSensitive: 'Vous devez accepter le traitement des données sensibles.', createError: 'Impossible de créer le compte.',
    },
    account: {
      title: 'Mon compte', updated: 'Compte mis à jour.', saveError: 'Impossible d’enregistrer.', accountData: 'Données du compte',
      realName: 'Nom réel', private: 'privé', fullName: 'Votre nom complet', optional: 'facultatif', taxpayer: 'Numéro fiscal',
      appLanguage: 'Langue de l’application', languageHelp: 'Cette préférence s’applique à l’application sur tous vos appareils après connexion.',
    },
    profileSwitcher: { useAs: 'Utiliser l’application en tant que', change: 'Changer de profil' },
  },
}
