export const exploreTranslations = {
  'pt-PT': {
    title:'Explorar', refresh:'Atualizar perfis', all:'Todos', singles:'Individuais', couples:'Casais', groups:'Grupos',
    score:'compatibilidade', verified:'Verificado', softReveal:'Pré-visualização protegida', pass:'Passar', connect:'Ligar',
    sent:'Enviado', match:'Match!', newMatch:'Novo match!', matchHelp:'Vai aos teus Matches para começar a conversar.',
    viewMatches:'Ver matches', loadError:'Não foi possível carregar os perfis.', connectError:'Não foi possível enviar o pedido de ligação.', retry:'Tentar novamente',
    emptyTitle:'Nenhum perfil por aqui', emptyText:'Ainda não há perfis aprovados para explorar.',
    limit:'Atingiste o limite de conversas ativas.', limitHelp:'Arquiva uma conversa em Matches ou faz upgrade para Premium para continuar.',
    individualProfile:'Perfil individual', coupleProfile:'Perfil de casal', groupProfile:'Perfil de grupo', loading:'A carregar…',
  },
  en: {
    title:'Explore', refresh:'Refresh profiles', all:'All', singles:'Individuals', couples:'Couples', groups:'Groups',
    score:'compatibility', verified:'Verified', softReveal:'Protected preview', pass:'Pass', connect:'Connect',
    sent:'Sent', match:'Match!', newMatch:'New match!', matchHelp:'Go to Matches to start a conversation.',
    viewMatches:'View matches', loadError:'Unable to load profiles.', connectError:'Unable to send the connection request.', retry:'Try again',
    emptyTitle:'No profiles here', emptyText:'There are no approved profiles to explore yet.',
    limit:'You have reached the active conversation limit.', limitHelp:'Archive a conversation in Matches or upgrade to Premium to continue.',
    individualProfile:'Individual profile', coupleProfile:'Couple profile', groupProfile:'Group profile', loading:'Loading…',
  },
  fr: {
    title:'Explorer', refresh:'Actualiser les profils', all:'Tous', singles:'Individuels', couples:'Couples', groups:'Groupes',
    score:'compatibilité', verified:'Vérifié', softReveal:'Aperçu protégé', pass:'Passer', connect:'Se connecter',
    sent:'Envoyé', match:'Match !', newMatch:'Nouveau match !', matchHelp:'Accédez à vos Matchs pour commencer à discuter.',
    viewMatches:'Voir les matchs', loadError:'Impossible de charger les profils.', connectError:'Impossible d’envoyer la demande de connexion.', retry:'Réessayer',
    emptyTitle:'Aucun profil ici', emptyText:'Il n’y a pas encore de profils approuvés à explorer.',
    limit:'Vous avez atteint la limite de conversations actives.', limitHelp:'Archivez une conversation dans Matchs ou passez à Premium pour continuer.',
    individualProfile:'Profil individuel', coupleProfile:'Profil de couple', groupProfile:'Profil de groupe', loading:'Chargement…',
  },
}

export function createExploreTranslator(language) {
  const selected = exploreTranslations[language] || exploreTranslations['pt-PT']
  return key => selected[key.replace('explore.', '')]
    || selected[key.replace('common.', '')]
    || exploreTranslations['pt-PT'][key.replace(/^\w+\./, '')]
    || key
}
