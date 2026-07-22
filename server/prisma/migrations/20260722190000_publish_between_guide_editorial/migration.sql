-- Publica a primeira coleção editorial completa do Between Guide.
-- A carga é idempotente: cada artigo é identificado pelo slug e pode ser
-- reaplicado sem criar duplicados. O autor é atribuído à conta de Ricardo
-- Ferreira quando existir; em instalações sem essa conta, usa o SUPER_ADMIN.

-- Consentimento: 4 artigos
+INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '47d10f37-a70c-53b9-b459-0e3d572ae6b2', 'consentimento-nao-e-um-contrato-assinado-e-uma-conversa-que-continua', 'Consentimento não é um contrato assinado: é uma conversa que continua', 'CONSENT'::"GuideCategory",
  'Um “sim” só vale enquanto for livre, informado, específico e atual. Saber perguntar, ouvir e parar é parte da intimidade — não uma interrupção dela.', $article_1_1$Consentimento não é a ausência de um “não”. É a presença de uma vontade reconhecível, livre e partilhada. Esta diferença parece pequena, mas muda tudo: deixa de caber à outra pessoa resistir e passa a caber a todos confirmar que existe vontade real.

Um consentimento saudável tem cinco características. É **livre**, porque não nasce de pressão, medo, chantagem emocional ou dependência. É **informado**, porque as pessoas sabem, dentro do razoável, ao que estão a consentir. É **específico**, porque aceitar uma aproximação, um beijo ou uma conversa não significa aceitar o passo seguinte. É **reversível**, porque qualquer pessoa pode mudar de ideias a qualquer momento. E é **atual**, porque aquilo que foi desejado ontem não fica automaticamente autorizado hoje.

Numa aplicação como a Between Us, o match também não é consentimento para nada além de iniciar contacto. Uma fotografia privada partilhada não autoriza a sua gravação, reprodução ou divulgação. Aceitar um encontro não obriga a prolongá-lo. E estar numa relação, viver em casal ou ter tido intimidade antes nunca elimina a necessidade de consentimento.

### Como confirmar sem transformar tudo num interrogatório

Perguntas simples funcionam: “Queres continuar?”, “Está confortável assim?”, “Preferes mais devagar?” ou “Posso?”. O tom importa. Uma pergunta só é genuína quando ambas as respostas são seguras. Se um “não” provocar mau humor, insistência ou punição, então a pergunta era apenas decorativa.

Também existem sinais não verbais de entusiasmo, mas não devem ser usados para ultrapassar dúvida. Silêncio, rigidez, afastamento, hesitação, nervosismo ou deixar de participar são razões para parar e confirmar. Quando não há clareza, a regra é simples: abranda. A incerteza nunca deve ser tratada como autorização.

Álcool e outras substâncias tornam esta avaliação mais delicada. Uma pessoa muito alterada, desorientada, inconsciente ou incapaz de compreender o que está a acontecer não pode dar consentimento válido. O facto de ter começado a noite com vontade não resolve essa incapacidade mais tarde.

### O verdadeiro teste

O consentimento não se mede pela fluidez com que alguém consegue dizer “sim”. Mede-se também pela liberdade com que pode dizer “não”, “ainda não”, “assim não” ou “mudei de ideias”. Uma ligação torna-se mais segura quando parar não é vivido como falhanço, rejeição ou dívida.

### Aplicação prática

Imagina que duas pessoas combinaram trocar beijos num primeiro encontro. Uma delas aproxima a mão de uma zona mais íntima e a outra fica imóvel. Não disse “não”, mas também não participa. A resposta segura é retirar a mão e perguntar, sem dramatizar: “Queres que fiquemos só nos beijos?”. Se a resposta for hesitante, mantém-se o limite anterior. O objetivo não é obter um sim mais convincente; é permitir uma decisão sem pressão.

Um bom hábito é fazer check-ins nas transições: da conversa para o toque, do espaço público para um local privado, de uma prática para outra. Não é necessário repetir uma fórmula robótica. Basta reconhecer que cada mudança cria uma nova decisão. Quanto menos alguém te conhece, menos deves presumir que sabes ler os seus sinais.

**Leva contigo:** Um “sim” anterior não é um passe permanente. Perguntar é maturidade; parar é respeito; mudar de ideias é um direito.$article_1_1$, '✓',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 3, 'pt', 'Consentimento não é um contrato assinado: é uma conversa que continua', 'Um “sim” só vale enquanto for livre, informado, específico e atual. Saber perguntar, ouvir e parar é parte da intimidade — não uma interrupção dela.',
  101, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '9bb4cdf0-7e4a-5752-97c7-c0fbca1d83ab', 'falar-antes-do-desejo-acelerar-limites-expectativas-e-sinais-claros', 'Falar antes do desejo acelerar: limites, expectativas e sinais claros', 'CONSENT'::"GuideCategory",
  'As melhores conversas sobre limites acontecem antes de ser difícil pensar. Preparar não tira espontaneidade; retira ambiguidades perigosas.', $article_1_2$Quando a atração sobe, a capacidade de negociar com calma tende a descer. Por isso, falar sobre limites antes de um encontro ou de uma experiência íntima não é burocracia: é criar condições para que a espontaneidade seja segura.

Começa por distinguir três zonas. A zona **sim** inclui o que desejas e estás confortável em explorar. A zona **talvez** inclui aquilo que depende do contexto, da confiança, do ritmo ou de condições específicas. A zona **não** inclui limites que não estão abertos a negociação naquele momento. Estas zonas podem mudar, mas nunca devem mudar por desgaste: perguntar repetidamente até obter um “sim” não é negociação, é pressão.

Uma conversa útil pode incluir:

- o que cada pessoa procura naquele encontro;
- formas de contacto físico que são ou não confortáveis;
- uso de proteção e informação relevante de saúde sexual;
- consumo de álcool ou outras substâncias;
- privacidade, fotografias e mensagens posteriores;
- palavras ou sinais para abrandar e parar;
- o que fazer se alguém ficar desconfortável.

Em encontros com casais ou mais pessoas, confirma-se o consentimento de cada participante individualmente. O acordo de um casal não substitui a vontade de nenhuma das pessoas presentes. Ninguém deve ser transformado no porta-voz permanente do parceiro, nem a pessoa convidada deve sentir que precisa de agradar aos dois para não “estragar” a noite.

### Sinais úteis

Uma palavra de paragem pode ajudar, sobretudo em contextos onde “não” possa fazer parte de uma dinâmica combinada. Um sistema simples é: **verde** para continuar, **amarelo** para reduzir intensidade ou confirmar, **vermelho** para parar. Mas nenhuma palavra especial é obrigatória para que “para”, afastamento ou desconforto sejam respeitados.

Convém ainda combinar como alguém pode sair sem ter de apresentar uma defesa. “Se uma pessoa quiser terminar, o encontro termina sem discussão” é um acordo mais seguro do que “paramos apenas se todos concordarem”. O consentimento pertence a cada pessoa; não funciona por maioria.

### Preparação não é promessa

Falar sobre algo não obriga a fazê-lo. Fantasiar, descrever ou incluir um interesse numa lista de “talvez” não é consentir antecipadamente. A conversa prepara possibilidades; a decisão continua a ser tomada no momento.

### Aplicação prática

Experimentem uma conversa de dez minutos com três frases por pessoa: “Hoje apetece-me…”, “Talvez, se…”, “Não quero…”. Depois acrescentem: “Se eu ficar em silêncio ou hesitar, prefere que pares e perguntes”. Esta última frase é especialmente importante para quem tende a congelar, agradar ou precisar de tempo para reconhecer desconforto.

Num encontro a três, a ronda deve ser individual. Se uma pessoa responde sempre depois de olhar para o parceiro, abrandem. Pode ser apenas hábito, mas também pode revelar que a decisão ainda não é verdadeiramente própria. Criar dois minutos de reflexão separada é mais seguro do que transformar concordância rápida em entusiasmo coletivo.

**Pergunta para conversar:** “O que precisas de saber ou sentir para poderes estar presente sem te sentires pressionado/a?”

**Leva contigo:** Limites claros não matam o ambiente. Evitam que o ambiente mate a confiança.$article_1_2$, '✓',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Falar antes do desejo acelerar: limites, expectativas e sinais claros', 'As melhores conversas sobre limites acontecem antes de ser difícil pensar. Preparar não tira espontaneidade; retira ambiguidades perigosas.',
  102, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '8df04322-6d55-5a82-a84d-3eff08fa16c4', 'pressao-disfarcada-reconhecer-coacao-culpa-e-consentimento-aparente', 'Pressão disfarçada: reconhecer coação, culpa e consentimento aparente', 'CONSENT'::"GuideCategory",
  'Nem toda a pressão é agressiva. Às vezes aparece como urgência, culpa, ciúme, silêncio punitivo ou medo de perder a relação.', $article_1_3$É possível alguém dizer “sim” e, ainda assim, não estar a escolher livremente. O consentimento aparente surge quando a alternativa parece demasiado cara: perder o parceiro, provocar uma discussão, ser ridicularizado, ficar sem transporte, ver um segredo exposto ou sentir que se tem uma dívida.

A coação raramente se apresenta com uma etiqueta. Pode soar a “se gostasses mesmo de mim”, “já viemos até aqui”, “toda a gente faz”, “não sejas complicado/a”, “prometeste” ou “vais deixar-nos pendurados?”. Pode também ser mais silenciosa: insistir depois de uma recusa, fazer cara fechada, retirar afeto, ameaçar terminar a relação ou usar ciúme para acelerar uma decisão.

Num casal, há uma forma particular de pressão: abrir a relação como condição para evitar uma separação já ameaçada. Uma pessoa pode aceitar por medo, não por vontade. Isso não significa que casais com ritmos diferentes nunca possam explorar; significa que a diferença tem de ser tratada com tempo real, possibilidade de recusa e espaço para reconsiderar o projeto.

### Quatro perguntas de diagnóstico

Antes de avançar, pergunta a ti próprio/a:

1. Eu escolheria isto se soubesse que a outra pessoa não ficaria zangada nem me abandonaria?
2. Posso dizer “não” sem ter de gerir uma punição emocional?
3. Tenho tempo suficiente para decidir, ou foi criada urgência artificial?
4. Estou a participar por desejo ou para impedir uma consequência?

Uma resposta desconfortável não prova automaticamente abuso, mas é razão suficiente para parar. O objetivo não é julgar a relação num minuto; é devolver espaço à decisão.

### O que fazer quando percebes pressão

Nomeia o que está a acontecer de forma direta: “Não consigo decidir com esta urgência” ou “Quando a relação fica em causa, não sinto que posso escolher livremente”. Se fores a pessoa que deseja avançar, assume a responsabilidade de retirar a pressão: confirma que a relação não será punida por uma recusa, aceita uma pausa e não transformes o teu desapontamento numa tarefa do outro.

Quando existe medo, ameaça, controlo, exposição de conteúdos íntimos ou incapacidade de recusar em segurança, o problema já não é uma simples falha de comunicação. Procura apoio fora da dinâmica e protege primeiro a tua segurança.

### Aplicação prática

Repara na diferença entre um pedido e uma campanha. Um pedido é feito, recebe resposta e permite tempo. Uma campanha regressa ao tema com novos argumentos, humor, sedução ou ameaça até a resistência desaparecer. Se ouves “não agora”, trata-o como não; não como convite para melhorar a apresentação.

Se és quem está indeciso/a, experimenta definir uma condição externa: “Não decido hoje; voltamos ao assunto no fim de semana”. Observa a reação. Respeito pelo prazo é um bom sinal. Pressão, vitimização ou tentativa de te isolar indicam que o problema não é apenas o conteúdo da proposta, mas a forma como a tua autonomia é recebida.

**Leva contigo:** Ceder não é o mesmo que consentir. Um consentimento obtido pelo medo de perder algo essencial não é um “sim” sólido.$article_1_3$, '✓',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Pressão disfarçada: reconhecer coação, culpa e consentimento aparente', 'Nem toda a pressão é agressiva. Às vezes aparece como urgência, culpa, ciúme, silêncio punitivo ou medo de perder a relação.',
  103, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '6b1b3fd8-3988-5795-a5f4-f5e5136b3e80', 'quando-algo-corre-mal-parar-reparar-e-assumir-responsabilidade', 'Quando algo corre mal: parar, reparar e assumir responsabilidade', 'CONSENT'::"GuideCategory",
  'Uma quebra de limite não se resolve com intenção, mas com impacto, segurança imediata, escuta e mudança verificável.', $article_1_4$Mesmo entre pessoas cuidadosas podem existir falhas: um sinal não é percebido, um limite é mal compreendido ou alguém congela e não consegue responder. Há também situações em que o limite é ignorado de forma consciente. Não são equivalentes, mas em todas a primeira obrigação é a mesma: parar e garantir segurança.

Se percebeste desconforto, não tentes terminar “só esta parte”. Afasta a pressão física, pergunta o que a pessoa precisa e aceita que talvez não queira falar contigo. Não exijas que te tranquilize. Frases como “não foi essa a minha intenção” podem explicar, mas não apagam o impacto — e ditas cedo demais soam frequentemente a defesa.

### Uma reparação responsável

Uma resposta madura inclui quatro movimentos:

- **Reconhecer:** descrever o que fizeste sem suavizar nem culpar a ambiguidade do outro.
- **Escutar:** permitir que a pessoa diga o impacto, sem debate sobre a validade da experiência.
- **Reparar:** perguntar o que é necessário agora — espaço, transporte, apoio, eliminação de imagens, fim do contacto ou outra medida possível.
- **Mudar:** identificar o comportamento concreto que impedirá repetição.

Um pedido de desculpa não compra perdão, reconciliação nem silêncio. A pessoa afetada decide se quer contacto, denúncia, apoio externo ou nenhuma conversa. Respeitar essa decisão faz parte da responsabilidade.

Se foste tu quem sentiu um limite ultrapassado, a reação pode variar: raiva, dúvida, vergonha, congelamento ou aparente normalidade. Não precisas de decidir imediatamente como chamar ao que aconteceu. Procura um local seguro, fala com alguém de confiança, guarda mensagens ou outros elementos relevantes e obtém apoio especializado se precisares. Bloquear ou denunciar não é exagero quando serve para recuperar controlo.

### Casais e grupos

Quando há mais pessoas, ninguém deve fechar fileiras para proteger a imagem do casal ou do grupo. A lealdade interna não está acima da segurança de quem ficou vulnerável. Também não se deve pressionar a pessoa afetada a aceitar uma “conversa conjunta” para facilitar a consciência dos restantes.

### Aplicação prática

Uma reparação pode começar assim: “Quando continuaste a afastar a minha mão, eu devia ter parado. Não parei e ultrapassei o teu limite. Lamento. Não te vou pedir que me tranquilizes. Diz-me apenas se há alguma ação concreta que queres de mim; se preferires não ter contacto, respeitarei.” A linguagem nomeia comportamento, impacto e consequência sem exigir absolvição.

Para quem recebe o pedido de desculpa, não há prazo para responder. Podes pedir que a comunicação passe por terceiro, exigir eliminação de conteúdo ou não aceitar qualquer contacto. A reparação mais importante pode ser precisamente a outra pessoa respeitar o teu silêncio e as consequências que preferia evitar.

**Leva contigo:** Reparar não é convencer alguém de que és uma boa pessoa. É agir de modo a devolver segurança, respeitar consequências e reduzir a possibilidade de repetição.$article_1_4$, '✓',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Quando algo corre mal: parar, reparar e assumir responsabilidade', 'Uma quebra de limite não se resolve com intenção, mas com impacto, segurança imediata, escuta e mudança verificável.',
  104, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Casais: 4 artigos
+INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  'b8d96bc9-8736-5d0b-889e-ca8e6d2f3620', 'estamos-mesmo-prontos-o-teste-antes-de-convidar-outra-pessoa', 'Estamos mesmo prontos? O teste antes de convidar outra pessoa', 'COUPLES'::"GuideCategory",
  'Explorar com terceiros amplia o que já existe no casal. Não cura silêncio, ressentimento ou medo; põe-lhes um holofote em cima.', $article_2_1$Uma fantasia partilhada pode ser excitante e, ainda assim, não estar pronta para sair da imaginação. A pergunta útil não é apenas “queremos?”, mas “temos estrutura emocional e prática para lidar com o que não controlamos?”.

Comecem por separar desejo de motivação. Procuram novidade, conexão, validação, liberdade individual ou uma experiência conjunta? Estão a tentar recuperar intimidade perdida? Um terceiro não deve ser recrutado para reparar uma relação. Pode acrescentar uma experiência; não pode ser responsabilizado por resolver o casal.

### Sinais de preparação

Um casal tende a estar mais preparado quando consegue falar de ciúme sem o transformar em acusação; quando ambos podem recusar sem represálias; quando existe confiança fora do contexto sexual; quando os acordos são claros e revistos; e quando cada pessoa aceita que a experiência real não obedecerá ao guião da fantasia.

Há sinais para abrandar: discussões recentes sobre infidelidade, pressão de um parceiro, necessidade de “provar” amor, desigualdade grande na liberdade permitida, medo de que alguém prefira a terceira pessoa ou incapacidade de imaginar um encontro que termine sem sexo.

Façam o teste das respostas difíceis:

- E se houver mais química com uma pessoa do casal?
- E se alguém quiser parar a meio?
- E se o convidado não quiser repetir?
- E se um de nós sentir ciúme depois, apesar de ter gostado no momento?
- E se a ligação evoluir emocionalmente?

Não precisam de prever tudo. Precisam de provar que conseguem conversar quando a resposta não é a desejada.

### A pessoa convidada não é uma experiência abstrata

Um erro comum é o casal pensar em “adicionar alguém” como se estivesse a escolher uma funcionalidade. A pessoa convidada tem desejos, limites, preferência e direito a mudar de ideias. Pode gostar mais de um dos parceiros, querer falar separadamente, não aceitar regras do casal ou concluir que não existe compatibilidade.

Estar pronto significa aceitar esta autonomia. Se só há espaço para alguém que cumpra um guião rígido, valide o casal e desapareça sem necessidades próprias, ainda não há espaço para uma pessoa — apenas para uma fantasia.

### Aplicação prática

Façam duas listas em separado: “o que espero viver” e “o que receio perder”. Comparem sem responder imediatamente. Se um deseja aventura e o outro escreve “receio perder a relação se disser que não”, a prioridade não é criar o perfil; é recuperar liberdade de escolha.

Depois simulem três finais: encontro agradável sem intimidade, atração apenas por um membro do casal e desistência a meio. Cada pessoa escreve o que sentiria, que pedido faria e que comportamento considera inaceitável. Se qualquer cenário só parece suportável através de controlo sobre o convidado, o casal ainda precisa de trabalho interno antes de envolver alguém.

**Leva contigo:** A prontidão não é ausência de medo. É a capacidade de tratar o medo sem retirar liberdade a outra pessoa.$article_2_1$, '◎',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Estamos mesmo prontos? O teste antes de convidar outra pessoa', 'Explorar com terceiros amplia o que já existe no casal. Não cura silêncio, ressentimento ou medo; põe-lhes um holofote em cima.',
  201, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '862c1510-c4d3-5e74-a964-b31b2fbbe169', 'ciume-no-casal-informacao-emocional-nao-ordem-de-comando', 'Ciúme no casal: informação emocional, não ordem de comando', 'COUPLES'::"GuideCategory",
  'O ciúme merece ser ouvido, mas não deve receber automaticamente poder para controlar os outros.', $article_2_2$Ciúme não é prova de que uma relação aberta falhou, nem de que o amor é maior. É uma resposta composta: pode misturar medo de abandono, comparação, perda de estatuto, insegurança corporal, falta de informação ou sensação de injustiça. Quanto mais depressa se identifica a camada real, menos provável é que o ciúme se transforme numa proibição vaga.

Em vez de “estou com ciúmes, portanto tens de parar”, experimentem decompor: “Quando não sei a que horas voltas, sinto-me descartado/a”; “Tenho medo de que a novidade torne a nossa relação menos interessante”; “Aceitei mais depressa do que conseguia”. Agora existem necessidades discutíveis: previsibilidade, reafirmação, ritmo ou revisão do acordo.

### Regular antes de legislar

Não criem regras permanentes no pico emocional. Primeiro, regulem: durmam, comam, caminhem, escrevam o que sentiram e combinem uma conversa com hora de início e fim. Depois perguntem:

- O que aconteceu de facto e o que estou a imaginar?
- Que necessidade minha ficou exposta?
- Existe uma quebra de acordo ou apenas desconforto?
- Que pedido concreto posso fazer sem controlar uma terceira pessoa?

Uma pausa pode ser legítima quando foi prevista, quando existe risco ou quando o casal precisa de recuperar capacidade de decisão. Mas “veto” usado depois de uma ligação se formar pode ferir pessoas reais. O casal deve considerar o impacto dos seus mecanismos de segurança antes de envolver alguém.

### Comparação não é compatibilidade

É normal notar que pessoas diferentes despertam versões diferentes de nós. Isso não transforma as relações numa tabela classificativa. A novidade tem intensidade própria; a história partilhada tem profundidade própria. Compará-las como produtos concorrentes alimenta ansiedade e apaga o valor específico de cada ligação.

O objetivo não é eliminar o ciúme. É conseguir senti-lo sem vigiar, punir, invadir mensagens ou redefinir unilateralmente a liberdade de todos.

### Aplicação prática

Usem uma folha com quatro colunas: facto, história que a mente contou, emoção e pedido. Exemplo: “Chegaste uma hora depois” / “já não sou prioridade” / medo e raiva / “avisa se o horário mudar e marca comigo tempo de reconexão”. A técnica não apaga uma falha real, mas impede que interpretação e facto entrem na conversa como se fossem a mesma coisa.

Evitem pedir pormenores íntimos para aliviar incerteza. A informação pode alimentar imagens e comparação. Perguntem antes: “Que dado concreto mudaria a minha decisão ou segurança?”. Se a resposta for “nenhum; só quero saber tudo”, talvez seja regulação emocional, não transparência, aquilo de que precisam.

**Pergunta para conversar:** “O que te ajudaria a sentir conexão comigo sem exigir que eu reduza a dignidade ou a autonomia de outra pessoa?”

**Leva contigo:** Emoções são dados. Não são decretos.$article_2_2$, '◎',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Ciúme no casal: informação emocional, não ordem de comando', 'O ciúme merece ser ouvido, mas não deve receber automaticamente poder para controlar os outros.',
  202, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '11f19d7d-9612-536b-95a5-2b3d2fa0ea1f', 'acordos-de-casal-sem-transformar-terceiros-em-acessorios', 'Acordos de casal sem transformar terceiros em acessórios', 'COUPLES'::"GuideCategory",
  'Um casal pode proteger a sua relação, mas não tem o direito de organizar a vida emocional de outra pessoa sem a sua participação.', $article_2_3$Acordos são importantes. Definem disponibilidade, saúde sexual, privacidade, uso da casa, gestão do tempo e expectativas. O problema começa quando regras internas são aplicadas a alguém que nunca as discutiu: “não podes mandar mensagem durante a semana”, “não podes criar sentimentos” ou “se um de nós ficar inseguro, desapareces”.

Antes de apresentar uma regra, perguntem: ela regula o nosso comportamento ou controla o de outra pessoa? “Não durmo fora” é uma decisão de quem a assume. “Tu não podes pedir que eu durma fora” transfere a responsabilidade. “Não procuramos vínculos emocionais” pode ser uma intenção honesta, mas ninguém consegue prometer sentimentos; pode apenas prometer como agirá se surgirem.

### Transparência antes do envolvimento

Os limites relevantes devem ser comunicados cedo. Não escondam um veto, uma regra de exclusividade sexual ou a obrigação de mostrar mensagens ao parceiro. A pessoa convidada precisa dessa informação para consentir na dinâmica, não apenas no encontro.

Evitem ainda a regra da simetria: exigir que a terceira pessoa goste dos dois da mesma forma, avance ao mesmo ritmo ou só mantenha contacto quando ambos estão presentes. Atração não é uma votação equilibrada. Se o casal só aceita uma ligação perfeitamente simétrica, deve dizê-lo com honestidade — e aceitar que isso reduz muito a compatibilidade.

### Privilégio de casal

Casais estabelecidos têm vantagens reais: casa, história, finanças, reconhecimento social e poder para terminar conjuntamente a ligação. Fingir que esse poder não existe torna-o mais perigoso. Reconhecê-lo permite compensar: incluir a outra pessoa nas decisões que a afetam, não prometer igualdade impossível, evitar decisões-surpresa e criar uma forma respeitosa de terminar.

Um acordo ético não garante que ninguém sofra. Garante que ninguém é tratado como descartável só porque chegou depois.

### Aplicação prática

Peguem em cada regra e completem: “Esta regra existe para proteger…”. Depois perguntem quem paga o custo. “Não repetimos encontros” pode proteger o casal do medo de vínculo, mas transfere toda a instabilidade para quem é convidado. Talvez seja mais honesto dizer que só procuram uma experiência pontual e confirmar compatibilidade antes.

Uma regra que afeta terceiros deve ser explicada antes do primeiro encontro, em linguagem simples. Peçam à outra pessoa que a reformule com as próprias palavras. Não é um teste; é a forma mais rápida de descobrir interpretações diferentes antes de existirem sentimentos e expectativas.

**Leva contigo:** Protege a relação com honestidade, tempo e responsabilidade — não usando outra pessoa como zona de amortecimento.$article_2_3$, '◎',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Acordos de casal sem transformar terceiros em acessórios', 'Um casal pode proteger a sua relação, mas não tem o direito de organizar a vida emocional de outra pessoa sem a sua participação.',
  203, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  'dc5ad615-ac8b-5405-bd72-f200044a3c2a', 'depois-do-encontro-debriefing-cuidados-e-decisoes-sem-precipitacao', 'Depois do encontro: debriefing, cuidados e decisões sem precipitação', 'COUPLES'::"GuideCategory",
  'O que acontece depois pode consolidar confiança ou reescrever uma boa experiência como ameaça.', $article_2_4$Depois de uma experiência intensa, é comum existir um “desnível emocional”: uma pessoa sente euforia, outra cansaço, outra dúvida. O erro é exigir uma avaliação imediata e definitiva — “Gostaste?”, “Queres repetir?”, “Foi melhor comigo ou com ela?” — quando o corpo e a cabeça ainda estão a processar.

Combinar cuidados posteriores antes do encontro ajuda. Podem incluir tempo a dois, uma mensagem de segurança à pessoa convidada, água, descanso, espaço individual ou apenas a confirmação de que ninguém precisa de decidir nada naquela noite.

### Um debriefing que não parece um interrogatório

No dia seguinte, cada pessoa pode responder a quatro perguntas:

1. O que me fez sentir seguro/a e presente?
2. Em que momento senti tensão, comparação ou desconexão?
3. Houve algum limite pouco claro ou acordo que precise de revisão?
4. O que gostaria de manter, mudar ou não repetir?

Falem primeiro de experiência e impacto; só depois de logística futura. Evitem pedir detalhes que não são necessários e que possam alimentar comparação. A pessoa convidada também merece uma conversa separada e liberdade para dizer que não quer repetir, sem ser persuadida.

### Não decidam no pico

Euforia pode criar promessas excessivas. Ciúme pode criar proibições excessivas. Sempre que possível, definam uma janela de 24 a 72 horas antes de decisões estruturais. Uma urgência de segurança é tratada imediatamente; uma mudança de modelo relacional beneficia de tempo.

Se houve desconforto, não o diluam em “mas, no geral, correu bem”. Investiguem o momento específico. Se houve quebra de limite, a prioridade é responsabilidade e cuidado, não salvar a narrativa de sucesso do casal.

Por fim, não desapareçam da vida da pessoa convidada depois de obterem a experiência. Uma mensagem clara e humana — de continuidade ou encerramento — é o mínimo. O silêncio pode ser conveniente para o casal, mas deixa o custo emocional todo do outro lado.

### Aplicação prática

Separem o debriefing em duas rondas. Na primeira, ninguém responde ao outro: cada pessoa descreve sensações, momentos positivos e desconforto. Na segunda, fazem perguntas e decidem o que precisa de reparação. Esta ordem reduz o reflexo de explicar ou corrigir a experiência do parceiro.

Enviem também uma mensagem individual à pessoa convidada: agradecimento, confirmação de privacidade e espaço para feedback. Não peçam que classifique o casal nem que escolha imediatamente repetir. Uma frase como “Não precisas de decidir hoje; queríamos apenas confirmar que chegaste bem e saber se algum momento te deixou desconfortável” mostra cuidado sem criar obrigação.

**Leva contigo:** O encontro termina quando as pessoas se despedem; a responsabilidade não.$article_2_4$, '◎',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Depois do encontro: debriefing, cuidados e decisões sem precipitação', 'O que acontece depois pode consolidar confiança ou reescrever uma boa experiência como ameaça.',
  204, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Relações abertas: 4 artigos
+INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '87e222b7-80ed-5170-a3a2-93be03326ec8', 'abrir-uma-relacao-mudar-o-acordo-nao-fugir-da-conversa', 'Abrir uma relação: mudar o acordo, não fugir da conversa', 'OPEN_RELATIONSHIPS'::"GuideCategory",
  'Uma relação aberta não é uma relação monogâmica com exceções ocasionais. É um novo acordo que exige vontade própria, clareza e capacidade para lidar com consequências reais.', $article_3_1$Abrir uma relação parece, à distância, uma decisão sobre sexo ou encontros. Na prática, mexe em tempo, confiança, identidade, rotina, exposição social e no significado que cada pessoa atribui a compromisso. Por isso, “podemos estar com outras pessoas?” é apenas a primeira de muitas perguntas.

Comecem pela motivação individual. Cada pessoa escolheria este modelo se estivesse solteira, ou está a aceitá-lo para não perder a relação? Existe curiosidade partilhada, necessidade de autonomia ou uma tentativa de compensar insatisfação? Nenhuma motivação precisa de ser perfeita, mas deve ser dita. Motivações escondidas reaparecem mais tarde como conflito.

### O trabalho invisível

Abrir implica desaprender pressupostos. Talvez “prioridade” tenha significado disponibilidade permanente; talvez exclusividade sexual tenha sido usada como prova de amor; talvez nunca tenham falado sobre flirt, pornografia, mensagens ou amizades íntimas porque as regras pareciam óbvias. O novo acordo obriga a tornar explícito o que antes estava implícito.

Conversem sobre:

- quem pode procurar ligações e em que contextos;
- quanto querem saber antes e depois;
- tempo, noites fora e responsabilidades familiares;
- saúde sexual e alterações de práticas;
- privacidade de todas as pessoas envolvidas;
- vínculos emocionais e o que acontecerá se surgirem;
- como pedir uma pausa sem destruir relações já existentes.

Não tentem resolver tudo com cinquenta regras. Regras demasiado específicas costumam criar uma falsa sensação de controlo e uma contabilidade de infrações. É mais sólido definir princípios — honestidade, cuidado, previsibilidade, não discriminação — e alguns acordos operacionais claros.

### Começar devagar sem usar pessoas como treino

“Ir devagar” pode significar criar perfis, conversar, fazer encontros sociais ou explorar separadamente. Mas qualquer pessoa com quem interajam deve saber que estão numa fase inicial. Ninguém merece descobrir tarde que participou num teste do casal e pode ser descartado ao primeiro desconforto.

Abrir não é uma atualização instalada numa noite. É uma mudança contínua de relação, com revisões e possibilidade real de concluir que o modelo não serve. Voltar atrás não é fracasso; avançar por medo de parecer incoerente é que costuma sair caro.

### Aplicação prática

Criem uma versão experimental do acordo com data de revisão, por exemplo seis semanas. Definam o que está autorizado, o que permanece em pausa e como comunicam. “Experiência” não significa que pessoas envolvidas sejam descartáveis; significa que o casal está a avaliar a sua capacidade e deve dizê-lo com transparência.

Durante o período, não avaliem apenas ciúme. Registem energia, qualidade do sono, divisão de tarefas, satisfação, honestidade e impacto nas outras relações. Uma abertura pode parecer emocionalmente suportável e, ainda assim, ser logisticamente injusta. O modelo só é sustentável quando a liberdade não depende de alguém trabalhar silenciosamente por dois.

**Leva contigo:** A pergunta não é “conseguimos suportar que o outro saia?”. É “conseguimos construir liberdade sem abandonar responsabilidade?”.$article_3_1$, '◌',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Abrir uma relação: mudar o acordo, não fugir da conversa', 'Uma relação aberta não é uma relação monogâmica com exceções ocasionais. É um novo acordo que exige vontade própria, clareza e capacidade para lidar com consequências reais.',
  301, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '59b31325-516f-5452-aac9-4c8540f3b208', 'regras-limites-e-acordos-tres-coisas-que-nao-sao-iguais', 'Regras, limites e acordos: três coisas que não são iguais', 'OPEN_RELATIONSHIPS'::"GuideCategory",
  'Limites dizem o que eu farei; acordos dizem o que decidimos fazer; regras tentam muitas vezes controlar o que outra pessoa pode fazer.', $article_3_2$As palavras são usadas como sinónimos, mas criam responsabilidades diferentes. Um **limite** protege a integridade pessoal: “Não fico numa relação onde as minhas mensagens são lidas sem autorização”. Um **acordo** é uma decisão negociada: “Avisamos se houver uma alteração relevante na nossa saúde sexual”. Uma **regra** costuma impor comportamento: “Não podes sair com colegas”.

Regras não são sempre ilegítimas. Há contextos partilhados — casa, filhos, finanças — que exigem decisões firmes. O problema é usar regras para evitar sentimentos ou controlar pessoas externas: proibir afeto, escolher quem alguém pode desejar ou exigir acesso a conversas privadas.

### Testar a qualidade de um acordo

Um bom acordo é:

- compreendido da mesma forma por todos;
- possível de cumprir sem esconder a realidade;
- proporcional à necessidade que procura proteger;
- aplicável de forma justa;
- revisto quando deixa de funcionar;
- conhecido por quem será afetado.

Perguntem ainda: “O que acontece se este acordo for quebrado?”. Uma consequência saudável não é vingança. Pode ser parar novas ligações, retomar proteção de barreira, procurar terapia ou reconsiderar a relação. A consequência deve proteger, não castigar.

### Acordos sobre informação

Há quem queira saber tudo e quem prefira apenas informação essencial. Entre transparência e voyeurismo existe a privacidade de terceiros. Contar detalhes íntimos sem autorização não é honestidade; é uma quebra de confiança. Podem acordar partilhar o que afeta o casal — horários, riscos, estado emocional — sem reproduzir conversas ou descrever intimidade alheia.

Evitem “não perguntes, não contes” quando significa negar a existência de outras pessoas ou impedir informação necessária ao consentimento. Discrição pode ser legítima; ignorância imposta é frágil.

### Rever sem renegociar sob pressão

Marquem revisões regulares, sobretudo no início. Isso evita que cada emoção difícil abra uma assembleia de emergência. Numa revisão, cada pessoa pode propor manter, ajustar ou retirar um acordo. Se não houver consenso, não se presume autorização: abranda-se e decide-se o que cada um consegue realmente sustentar.

### Aplicação prática

Transforma “não podes dormir fora” em três versões. Regra: “Não podes”. Limite: “Eu não consigo manter esta relação se existirem noites fora”. Acordo: “Durante o primeiro mês, não marcamos noites fora e revemos depois”. A redação revela quem decide, que consequência existe e se há revisão.

Façam ainda o teste da reversibilidade: o acordo seria aceitável se os papéis fossem trocados? A resposta não tem de produzir simetria perfeita — vidas e necessidades diferem — mas obriga a justificar a diferença sem recorrer a género, posse ou precedência automática.

**Leva contigo:** O acordo mais bonito no papel vale pouco se uma pessoa só o aceitou porque não tinha uma alternativa emocional segura.$article_3_2$, '◌',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Regras, limites e acordos: três coisas que não são iguais', 'Limites dizem o que eu farei; acordos dizem o que decidimos fazer; regras tentam muitas vezes controlar o que outra pessoa pode fazer.',
  302, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  'a4bc7806-5422-5c23-bcc9-1a9094c5a2f6', 'tempo-informacao-e-saude-a-logistica-tambem-e-intimidade', 'Tempo, informação e saúde: a logística também é intimidade', 'OPEN_RELATIONSHIPS'::"GuideCategory",
  'Muitas relações abertas não colidem por falta de amor, mas por calendários injustos, informação tardia e responsabilidades deixadas para trás.', $article_3_3$Liberdade relacional usa recursos concretos: horas, energia, dinheiro, espaço mental e trabalho doméstico. Quando estes custos ficam invisíveis, uma pessoa vive a novidade e a outra absorve a logística. O ressentimento aparece, com toda a razão, vestido de ciúme.

Façam um orçamento de tempo antes de encher o calendário. Responsabilidades existentes — filhos, descanso, cuidados, trabalho e tempo do casal — não são sobras. Também é justo que ambos tenham tempo autónomo, mesmo que apenas um o use para encontros. A igualdade não exige atividades idênticas; exige acesso comparável a descanso e escolha.

### Informação no momento certo

Informação tardia pode ser tecnicamente verdadeira e emocionalmente enganadora. “Eu ia contar” não substitui um acordo sobre quando contar. Definam o que deve ser comunicado antes, logo depois ou apenas numa revisão. Uma nova ligação, uma alteração no uso de proteção ou uma noite fora têm impactos diferentes de uma conversa casual.

Não prometam “contar tudo”. Prometam partilhar o que é necessário ao consentimento e ao funcionamento da relação, respeitando a privacidade de terceiros.

### Saúde sexual como sistema, não suspeita

Uma estratégia de saúde sexual deve partir de práticas e exposições, não de julgamentos sobre pessoas. Inclui barreiras quando adequadas, testagem orientada por um profissional de saúde, vacinação relevante, contraceção quando aplicável e comunicação de alterações. Testes são fotografias de um momento e têm janelas de deteção; não funcionam como certificados absolutos de segurança.

Definam o que acontece após uma possível exposição ou diagnóstico: que práticas param temporariamente, quem é informado, como se obtém avaliação clínica e como se evita culpa. Uma infeção não prova desonestidade; esconder informação relevante é que quebra o consentimento informado.

### O calendário revela os valores

Não reservem carinho, descanso e planeamento para a novidade, deixando tarefas e conversas difíceis para a relação existente. Nem tratem parceiros novos como disponibilidade de última hora. A forma como distribuem o tempo mostra, com mais honestidade do que qualquer discurso, quem é considerado pessoa inteira.

### Aplicação prática

Desenhem uma semana real, não ideal. Marquem trabalho, sono, filhos, tarefas, tempo individual e tempo do casal antes dos encontros. Se a novidade cabe apenas porque alguém abdica do descanso ou assume mais trabalho doméstico, ainda não há espaço: há deslocação de custo.

Para a saúde sexual, criem um protocolo curto e acessível: que alterações exigem aviso, como retomam proteção, quem contacta o profissional de saúde e como informam parceiros. Fazer isto sem crise reduz vergonha e improviso. Guardem o protocolo como compromisso de cuidado, não como instrumento para vigiar o historial de cada pessoa.

**Leva contigo:** Gestão de agenda parece pouco romântica até ser a diferença entre liberdade partilhada e trabalho desigual.$article_3_3$, '◌',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Tempo, informação e saúde: a logística também é intimidade', 'Muitas relações abertas não colidem por falta de amor, mas por calendários injustos, informação tardia e responsabilidades deixadas para trás.',
  303, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '72302d7b-f8e6-57d4-b2e9-a152a1d3dcd1', 'pausar-fechar-ou-terminar-quando-o-modelo-deixa-de-ser-sustentavel', 'Pausar, fechar ou terminar: quando o modelo deixa de ser sustentável', 'OPEN_RELATIONSHIPS'::"GuideCategory",
  'Mudar de modelo não é vergonha. Mas uma decisão do casal não apaga automaticamente vínculos criados com outras pessoas.', $article_3_4$Relações abertas podem precisar de pausa por sobrecarga, doença, parentalidade, luto, quebra de confiança ou mudança genuína de vontade. Também podem fechar. O problema ético não é mudar; é tratar pessoas externas como interruptores que o casal liga e desliga sem aviso nem responsabilidade.

Uma pausa saudável tem motivo, âmbito e duração para revisão. “Durante quatro semanas não iniciamos novas ligações e mantemos os compromissos já assumidos” é diferente de “tudo para até eu deixar de sentir ciúme”. A primeira cria previsibilidade; a segunda entrega a uma emoção sem prazo o controlo da vida de várias pessoas.

### Quando existe uma ligação em curso

Se alguém já está emocionalmente envolvido, fechar a relação original não dissolve esse vínculo por magia. Pode ser necessário escolher, renegociar ou terminar, mas a pessoa afetada merece conversa direta, contexto suficiente e espaço para reagir. Não usem “foi decisão do casal” como forma de evitar responsabilidade individual.

### Sinais de que é preciso parar e avaliar

- acordos são quebrados e depois redefinidos para justificar o sucedido;
- uma pessoa vive em vigilância constante;
- existe coação para continuar ou fechar;
- os conflitos afetam sono, trabalho, parentalidade ou segurança;
- novas pessoas são repetidamente envolvidas e descartadas;
- ninguém consegue dizer o que ainda deseja, apenas o que teme.

Uma pausa não deve servir para punir um parceiro ou testar obediência. Deve reduzir estímulos, proteger compromissos e criar condições para decidir. Apoio terapêutico informado sobre não-monogamia pode ser útil; um profissional que parte do princípio de que só a monogamia é saudável dificilmente ajudará a avaliar o problema real.

### Fechar pode exigir luto

Mesmo uma decisão consensual pode trazer perda de identidade, comunidade ou possibilidades. Reconhecer esse luto evita fingir que “voltou tudo ao normal”. Talvez não volte: o casal aprendeu coisas sobre desejo, autonomia e limites que precisam de integração.

### Aplicação prática

Antes de pedir uma pausa, define o problema observável: quebra de acordo, exaustão, ciúme, falta de tempo ou risco. Depois escolhe a menor medida capaz de o tratar. Parar novos matches pode ser suficiente; exigir o fim de uma relação estável pode ser desproporcional.

Quando a pausa afeta terceiros, comuniquem em conjunto o que é decisão do casal e individualmente o que cada pessoa assume. Definam uma data de atualização, mesmo que a resposta final ainda não exista. A incerteza honesta é dolorosa, mas menos destrutiva do que silêncio seguido de uma decisão já fechada.

**Leva contigo:** Um modelo relacional é uma ferramenta, não uma prova de evolução. Se deixou de servir, muda-se — com honestidade e sem transformar terceiros em dano colateral.$article_3_4$, '◌',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Pausar, fechar ou terminar: quando o modelo deixa de ser sustentável', 'Mudar de modelo não é vergonha. Mas uma decisão do casal não apaga automaticamente vínculos criados com outras pessoas.',
  304, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Poliamor: 4 artigos
+INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  'bbc20815-e515-5800-ac25-ba5f1b9c2fa1', 'poliamor-nao-e-apenas-ter-varias-relacoes-e-consentir-em-varias-autonomias', 'Poliamor não é apenas ter várias relações: é consentir em várias autonomias', 'POLYAMORY'::"GuideCategory",
  'Amar mais de uma pessoa é a parte intuitiva. Construir espaço para que cada pessoa também ame e escolha livremente é o trabalho exigente.', $article_4_1$Poliamor descreve a possibilidade de manter mais do que uma relação amorosa ou íntima com conhecimento e consentimento de todos os envolvidos. Distingue-se de uma infidelidade não pelo número de pessoas, mas pela honestidade, pela possibilidade de escolha e pela responsabilidade entre relações.

Não existe uma forma única. Algumas pessoas vivem juntas; outras mantêm casas e rotinas separadas. Algumas relações têm compromissos diferentes; outras evitam hierarquias formais. Há redes muito próximas e estruturas paralelas onde metamores — parceiros de um mesmo parceiro — quase não convivem.

### A pergunta esquecida

Muitas pessoas imaginam bem ter vários amores, mas não imaginam o parceiro a exercer a mesma liberdade. O teste não é “tenho amor suficiente para duas pessoas?”. Amor pode ser abundante; tempo, atenção e capacidade emocional não são. A pergunta é: “Consigo respeitar relações que não controlo e gerir os meus recursos sem prometer o impossível?”.

Poliamor não elimina compromisso. Obriga a defini-lo. Compromisso pode significar cuidar numa doença, reservar tempo, criar projetos, apresentar à família, viver junto ou simplesmente ser consistente. Relações diferentes podem ter compromissos diferentes sem serem falsas.

### Consentimento informado entre redes

Ninguém precisa de conhecer todos os detalhes, mas todos precisam de informação suficiente sobre a estrutura: quantas relações relevantes existem, que acordos afetam a ligação, que disponibilidade é real e que práticas de saúde sexual são usadas. Ocultar uma relação porque “não muda nada” retira aos outros o direito de decidir o que muda para eles.

### Capacidade antes da expansão

Nova energia relacional pode criar uma sensação de tempo infinito. Não existe. Antes de iniciar outra ligação, olha para promessas atuais, descanso e tarefas. Estar “saturado” significa não ter recursos para oferecer presença consistente, mesmo que ainda exista desejo.

### Aplicação prática

Faz um inventário de compromissos: horas disponíveis, responsabilidades, pessoas que dependem de ti e tempo de recuperação. Depois escreve o mínimo de presença que consideras necessário para uma relação com qualidade. Se o total não cabe, a questão não é se consegues sentir amor; é se consegues agir com consistência.

Pergunta também o que acontece quando duas relações precisam de ti ao mesmo tempo. Não existe fórmula universal, mas deve haver critérios: urgência, compromisso prévio, vulnerabilidade e possibilidade de apoio alternativo. “A relação mais antiga ganha sempre” é um critério possível, mas deve ser conhecido por quem aceita entrar.

**Leva contigo:** Poliamor não é colecionar conexões. É sustentar relações onde ninguém precisa de fingir que as outras não existem.$article_4_1$, '∞',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Poliamor não é apenas ter várias relações: é consentir em várias autonomias', 'Amar mais de uma pessoa é a parte intuitiva. Construir espaço para que cada pessoa também ame e escolha livremente é o trabalho exigente.',
  401, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '62b0d12b-e000-53ff-91f5-2e9bd2e885c7', 'hierarquia-privilegio-de-casal-e-autonomia-dar-nome-ao-poder', 'Hierarquia, privilégio de casal e autonomia: dar nome ao poder', 'POLYAMORY'::"GuideCategory",
  'Relações podem ter prioridades diferentes. O problema começa quando o poder real é escondido atrás de uma promessa de igualdade.', $article_4_2$Uma relação com casa partilhada, filhos, casamento, finanças e dez anos de história terá normalmente mais peso estrutural do que uma ligação recente. Dizer isto não diminui o novo vínculo; permite falar com honestidade sobre limites reais.

Há **hierarquia descritiva**, que reconhece diferenças existentes, e **hierarquia prescritiva**, que define antecipadamente que uma relação nunca poderá ultrapassar determinado lugar. Ambas podem ser escolhidas, mas devem ser transparentes. Prometer “todos são iguais” quando um casal tem veto, prioridade automática e poder para terminar relações alheias é marketing emocional, não igualdade.

### Privilégio de casal

O privilégio aparece quando as necessidades do casal são tratadas como naturalmente superiores: festas familiares, férias, reconhecimento público, decisões médicas, casa ou informação. Parte desse privilégio é legal e social; parte é comportamento. Pode ser reduzido ao incluir pessoas nas decisões que as afetam, cumprir compromissos e não usar “somos o casal original” como argumento final.

Autonomia não significa ausência de responsabilidade. Cada pessoa decide sobre o seu corpo e relações, mas as decisões têm impacto. “Sou autónomo/a” não desculpa cancelar planos repetidamente, ocultar riscos ou deixar um parceiro gerir sozinho as consequências.

### Vetos e poder indireto

Um veto dá a alguém poder para terminar uma relação da qual não faz parte. Pode parecer uma rede de segurança, mas cria insegurança profunda para quem chega. Alternativas mais responsáveis incluem limites pessoais, critérios claros para pausar novas relações e apoio profissional em crises. Se existe veto, deve ser revelado antes do envolvimento.

### Perguntas honestas

- Que decisões pode cada relação tomar sobre si própria?
- Quem tem poder para alterar ou terminar outra ligação?
- Que formas de reconhecimento nunca estarão disponíveis?
- O que acontece se uma relação crescer além do previsto?

Não há obrigação de oferecer a mesma coisa a todos. Há obrigação de não vender uma possibilidade que a estrutura impede.

### Aplicação prática

Cria um mapa de decisões: férias, apresentação à família, coabitação, apoio financeiro, emergências, redes sociais e celebrações. Assinala o que está disponível, negociável ou excluído para cada relação. O mapa pode revelar promessas contraditórias antes de alguém investir anos numa possibilidade inexistente.

Não uses o mapa para congelar pessoas em posições. Revê-o quando relações crescem. Se uma limitação é legal ou familiar, diz isso; se é preferência, assume-a como escolha. “Não posso” e “não quero” produzem expectativas diferentes e merecem honestidade diferente.

**Leva contigo:** Diferença não é desrespeito. Poder escondido é.$article_4_2$, '∞',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Hierarquia, privilégio de casal e autonomia: dar nome ao poder', 'Relações podem ter prioridades diferentes. O problema começa quando o poder real é escondido atrás de uma promessa de igualdade.',
  402, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  'f5ae76f7-01a8-5b2d-8db5-523217427043', 'ciume-inveja-e-compersao-um-vocabulario-para-emocoes-complexas', 'Ciúme, inveja e compersão: um vocabulário para emoções complexas', 'POLYAMORY'::"GuideCategory",
  'Nem todo o desconforto é ciúme e nem toda a alegria pelo outro é espontânea. Dar o nome certo à emoção melhora a resposta.', $article_4_3$No poliamor fala-se muito de compersão — satisfação ou alegria perante a felicidade romântica ou sexual de alguém de quem gostamos. É uma possibilidade, não um exame de admissão. Algumas pessoas sentem-na; outras sentem neutralidade; muitas alternam entre alegria e desconforto. Nenhuma destas respostas determina, por si só, maturidade.

Convém distinguir emoções. **Ciúme** envolve medo de perder uma relação ou posição. **Inveja** é desejar algo que outra pessoa tem: tempo, novidade, reconhecimento. **Exclusão** é sentir que uma experiência ou decisão ocorreu sem nós. **Insegurança** questiona o próprio valor. Cada uma pede soluções diferentes.

Se invejo que o meu parceiro viaje com alguém, talvez precise de férias ou aventura — não de proibir a viagem. Se temo perder tempo de qualidade, preciso de previsibilidade. Se houve exclusão de uma decisão que me afeta, pode existir uma falha real de processo, não apenas “trabalho emocional” meu.

### Trabalhar a emoção sem a privatizar

Cada pessoa é responsável por regular as próprias emoções, mas as relações têm responsabilidade contextual. Não se pode exigir que alguém “trate o ciúme” enquanto se cancelam planos, ocultam informações ou quebram acordos. Primeiro verifica-se a realidade; depois trabalha-se a reação.

Estratégias úteis incluem reduzir comparações, limitar exposição a detalhes não desejados, criar rituais de reconexão, manter apoios próprios e adiar decisões até o corpo sair do estado de alarme. Pedidos devem ser concretos: “Podemos marcar a nossa próxima noite antes da tua viagem?” é mais útil do que “Faz-me sentir importante”.

### Não performar felicidade

Obrigar alguém a celebrar cada nova ligação produz silêncio, não compersão. É possível apoiar a autonomia de um parceiro e, ao mesmo tempo, precisar de espaço para processar. Respeito não exige entusiasmo constante.

### Aplicação prática

Quando surgir desconforto, escolhe primeiro a palavra mais precisa. “Sinto inveja porque também queria uma viagem” abre uma solução distinta de “tenho medo de que me deixes”. Depois pergunta se existe um comportamento externo a corrigir. Nem tudo é insegurança interna; um plano cancelado ou uma promessa quebrada merece reparação.

Se procuras compersão, começa pela neutralidade: permitir que a outra relação exista sem te obrigar a festejá-la. A alegria pode surgir quando há segurança; forçá-la cria atuação. Celebra pequenos sinais de regulação — conseguir ouvir sem atacar, pedir tempo, voltar à conversa — em vez de exigir uma emoção ideal.

**Leva contigo:** O objetivo não é tornar-te imune. É reconhecer emoções cedo, verificar se apontam para uma necessidade ou uma injustiça e responder sem controlar relações alheias.$article_4_3$, '∞',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Ciúme, inveja e compersão: um vocabulário para emoções complexas', 'Nem todo o desconforto é ciúme e nem toda a alegria pelo outro é espontânea. Dar o nome certo à emoção melhora a resposta.',
  403, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '2a496c7c-29f0-5845-96dd-aaab4e977931', 'metamores-redes-e-saturacao-relacoes-que-existem-alem-do-casal', 'Metamores, redes e saturação: relações que existem além do casal', 'POLYAMORY'::"GuideCategory",
  'Num sistema com várias relações, cada decisão viaja. Boa comunicação não significa que toda a gente tenha de viver à mesma mesa.', $article_4_4$Um metamore é o parceiro de um parceiro, sem que exista necessariamente ligação romântica ou sexual entre ambos. Algumas pessoas preferem proximidade, refeições conjuntas e apoio mútuo. Outras funcionam melhor com contacto cordial e limitado. Existe ainda poliamor paralelo, onde as relações se mantêm separadas com conhecimento mútuo.

Nenhum modelo é superior. Forçar proximidade pode ser tão invasivo como proibir contacto. O critério é o consentimento e a capacidade de coordenar o que realmente se cruza: horários, saúde sexual, espaços comuns, eventos e emergências.

### O papel da pessoa-charneira

Quem liga duas relações tem responsabilidade especial. Não deve usar um parceiro como terapeuta para conflitos com o outro, transportar mensagens hostis nem culpar um metamore por decisões que são suas. “A Marta não me deixa” evita assumir “eu aceitei este acordo”. A pessoa-charneira precisa de comunicar limites em nome próprio e cumprir compromissos distintos.

### Privacidade não é segredo

Cada relação merece espaço privado. Não se partilham detalhes íntimos, mensagens ou conflitos sem autorização. Ao mesmo tempo, privacidade não deve servir para esconder informação necessária: exposição de saúde, alterações de disponibilidade ou acordos que limitam a relação.

### Saturação e manutenção

Relações novas consomem mais atenção do que parece. Faz uma auditoria simples: consigo responder com consistência, estar presente em crises, cumprir planos, descansar e manter amizades? Se não, talvez exista desejo para outra ligação, mas não capacidade.

Quando a rede cresce, ferramentas práticas ajudam: calendários partilhados apenas no necessário, expectativas de resposta, planos de emergência e revisões periódicas. A tecnologia organiza horas; não substitui cuidado.

### Aplicação prática

Definam um nível mínimo de coordenação entre metamores: nenhum contacto, contacto de emergência, convivência cordial ou proximidade. Cada pessoa pode querer um nível diferente. A solução não é escolher o mais sociável; é garantir que a estrutura funciona sem obrigar intimidade.

A pessoa-charneira pode usar uma regra simples: não leva uma queixa de uma relação para a outra sem consentimento e não apresenta decisões próprias como exigência alheia. Se precisa de alterar um plano, diz “eu decidi” e assume o impacto. Esta mudança de linguagem reduz triangulação e devolve responsabilidade a quem realmente escolhe.

**Pergunta para conversar:** “Que informação precisa de circular para todos poderem consentir, e que informação deve permanecer privada para cada relação continuar a ser sua?”

**Leva contigo:** Uma rede saudável não exige fusão. Exige que ninguém seja mantido no escuro sobre aquilo que o afeta.$article_4_4$, '∞',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Metamores, redes e saturação: relações que existem além do casal', 'Num sistema com várias relações, cada decisão viaja. Boa comunicação não significa que toda a gente tenha de viver à mesma mesa.',
  404, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Privacidade: 4 artigos
+INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '118e9d5a-d1b7-5f51-8c45-d01e754e5aa3', 'o-teu-mapa-de-risco-decidir-o-que-revelar-a-quem-e-quando', 'O teu mapa de risco: decidir o que revelar, a quem e quando', 'PRIVACY'::"GuideCategory",
  'Privacidade não é esconder tudo. É controlar a circulação de informação suficiente para criar confiança sem oferecer acesso desnecessário à tua vida.', $article_5_1$Numa plataforma de relações adultas, os dados podem revelar muito mais do que nome e fotografia: orientação, vida sexual, localização, relações, hábitos e vulnerabilidades. Algumas destas informações pertencem a categorias especialmente sensíveis. A abordagem mais segura começa antes de publicar: identifica o que perderias se determinado dado chegasse à pessoa errada.

Cria três níveis. No nível **público dentro da aplicação**, inclui apenas o necessário para compatibilidade inicial: faixa etária, região ampla, interesses e intenções. No nível **partilhado após confiança**, podem entrar nome próprio, fotografias reconhecíveis ou rotina aproximada. No nível **estritamente privado**, mantém morada, local de trabalho exato, documentos, dados financeiros, nomes de filhos, horários regulares e qualquer elemento que permita encontrar-te fora da plataforma.

### Pensar como alguém que tenta identificar-te

Uma informação isolada pode parecer inofensiva. O risco nasce da combinação: profissão rara + pequena localidade + fotografia num evento = identidade. Fundo de uma imagem, matrícula, crachá, vista da janela, uniforme ou nome de ficheiro podem fechar o puzzle.

Antes de publicar, pergunta:

- Esta imagem aparece noutra rede social através de pesquisa inversa?
- O texto menciona empresa, associação, escola ou rotina identificável?
- A localização é necessária ou posso usar uma área mais ampla?
- Estou a revelar informação de um parceiro sem autorização?
- Se alguém fizesse captura de ecrã, eu conseguiria gerir o impacto?

### Confiança é gradual e verificável

Privacidade não impede autenticidade. Podes explicar que partilhas rosto depois de alguma conversa, que não trocas contactos pessoais antes de uma videochamada ou que manténs separadas as redes sociais. Uma pessoa segura não exige acesso total como prova imediata de honestidade.

Quando decidires revelar, fá-lo por etapas e confirma reciprocidade — não como transação, mas como sinal de que ambos compreendem o risco. Evita enviar documentos de identificação; uma verificação de identidade deve usar mecanismos próprios da plataforma, nunca fotografias soltas que possam ser reutilizadas.

### O direito de reduzir exposição

Podes alterar a tua estratégia depois de uma experiência negativa. Remover fotografias, restringir visibilidade ou bloquear não é admitir culpa nem exagerar. É gestão de risco.

### Aplicação prática

Faz uma pesquisa sobre ti como faria um desconhecido: usa nome, profissão, fotografia principal e pequenas combinações de dados. Observa quanto tempo demora a encontrar local de trabalho, família ou redes. O objetivo não é assustar-te; é descobrir ligações invisíveis entre identidades.

Depois classifica cada dado pela consequência de exposição: incómodo, impacto profissional, conflito familiar ou risco físico. Aplica mais proteção onde o impacto é maior. Um perfil discreto não precisa de ser vazio: humor, valores e intenção criam autenticidade sem revelar coordenadas da tua vida.

**Leva contigo:** Não perguntes apenas “confio nesta pessoa?”. Pergunta também “que poder esta informação lhe dá se a relação mudar?”.$article_5_1$, '◈',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'O teu mapa de risco: decidir o que revelar, a quem e quando', 'Privacidade não é esconder tudo. É controlar a circulação de informação suficiente para criar confiança sem oferecer acesso desnecessário à tua vida.',
  501, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '8460af9d-15d9-55bb-b521-fd1061f4c91b', 'fotografias-intimas-rosto-metadados-e-o-risco-que-nao-desaparece', 'Fotografias íntimas: rosto, metadados e o risco que não desaparece', 'PRIVACY'::"GuideCategory",
  'Nenhuma ferramenta garante controlo absoluto depois do envio. A decisão segura combina consentimento, minimização de identificação e um plano para o pior cenário.', $article_5_2$Partilhar uma fotografia íntima pode fazer parte de uma ligação consensual. Mas o envio transfere capacidade técnica: a outra pessoa pode guardar, fotografar outro ecrã, copiar ou divulgar. Mensagens temporárias e bloqueio de capturas reduzem risco; não o eliminam.

Antes de enviar, decide se queres incluir elementos identificáveis: rosto, tatuagens, cicatrizes, joias, quarto, decoração, reflexos, documentos ou vista exterior. Recortar a imagem e usar um fundo neutro reduz associação direta. Evita imagens já publicadas noutras redes, porque uma pesquisa inversa pode ligar perfis.

### Metadados e cópias

Fotografias podem conter informação técnica, incluindo data, dispositivo e, em certos casos, localização. Muitas plataformas removem parte destes metadados, mas não deves assumir que todas o fazem em todos os fluxos. Envia dentro da aplicação quando existam controlos próprios e evita ficheiros originais por canais desconhecidos.

Também importa proteger quem aparece. Uma fotografia de casal só deve ser partilhada com consentimento de ambos e para aquele contexto. O acordo “podemos usar esta foto no perfil” não significa “podes enviá-la individualmente a quem quiseres”.

### Pedir e receber

Não peças conteúdo como prova de atração, confiança ou identidade. Aceita um “não” sem insistência e não guardes quando foi combinado que não seria guardado. Antes de reenviar qualquer imagem — mesmo a um parceiro — obtém autorização explícita. Consentimento para receber não é consentimento para distribuir.

Se receberes conteúdo não solicitado, não o uses, não o partilhes e diz claramente que não autorizaste aquele envio. A sexualização inesperada pode ser invasiva mesmo numa aplicação adulta.

### Se houver divulgação ou ameaça

Não negocies sob chantagem nem pagues. Guarda provas sem redistribuir o conteúdo, regista perfis, datas, mensagens e ligações, denuncia na plataforma e procura apoio especializado ou policial. Se a ameaça incluir localização, família ou trabalho, revê imediatamente a segurança das contas e avisa alguém de confiança.

### Aplicação prática

Antes de enviar, faz a revisão dos cinco identificadores: rosto, corpo singular, espaço, objeto e ficheiro. Pergunta se há tatuagem, reflexo, divisão reconhecível, joia habitual ou nome automático que ligue a imagem a ti. Se dois ou mais elementos identificam, considera recortar, substituir ou não enviar.

Combina também o ciclo de vida: pode ser guardada? durante quanto tempo? pode ser mostrada a um parceiro? deve ser eliminada se o contacto terminar? Estes acordos não impedem uma violação técnica, mas eliminam a desculpa da ambiguidade e ajudam a plataforma ou autoridades a compreender o que foi autorizado.

**Leva contigo:** A fotografia mais segura é aquela que continuaria difícil de ligar à tua identidade, mesmo fora do contexto onde a enviaste.$article_5_2$, '◈',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Fotografias íntimas: rosto, metadados e o risco que não desaparece', 'Nenhuma ferramenta garante controlo absoluto depois do envio. A decisão segura combina consentimento, minimização de identificação e um plano para o pior cenário.',
  502, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '227789ef-bd4c-525c-b76f-2de206b15ebe', 'discricao-nao-e-engano-onde-termina-a-privacidade-e-comeca-o-segredo', 'Discrição não é engano: onde termina a privacidade e começa o segredo', 'PRIVACY'::"GuideCategory",
  'É legítimo proteger a vida privada. Não é legítimo usar essa proteção para retirar informação que outra pessoa precisa para consentir.', $article_5_3$Discrição pode significar não mostrar o rosto publicamente, não revelar a relação à família, usar um nome escolhido ou evitar locais próximos do trabalho. Para muitas pessoas, sobretudo em contextos de estigma, não é capricho: é segurança.

Segredo prejudicial é diferente. Existe quando se esconde uma relação relevante, se mente sobre acordos, se omite que um parceiro não sabe da abertura ou se pede a alguém que participe numa dinâmica sem informação essencial. A fronteira pode ser resumida assim: privacidade controla quem conhece a tua identidade; engano controla a capacidade dos outros decidirem.

### O mínimo necessário ao consentimento

Não precisas de revelar nomes, moradas ou detalhes íntimos de parceiros. Precisas de dizer se estás numa relação, se essa relação conhece e aceita a dinâmica, que limites afetam a nova pessoa e que disponibilidade é real. “Sou discreto/a” não responde à pergunta “o teu parceiro sabe?”.

Sinais de possível segredo incluem histórias que mudam, indisponibilidade inexplicável, proibição absoluta de contacto em horários específicos, recusa de qualquer verificação e pressão para sair rapidamente da plataforma. Nenhum sinal isolado prova engano, mas um padrão merece perguntas.

### Casais com diferentes níveis de exposição

Um parceiro pode estar assumido e outro não. Isso exige acordos precisos: onde podem aparecer juntos, quem pode guardar fotografias, que notificações ficam visíveis e como se reage a um encontro com conhecidos. A pessoa mais exposta não deve decidir sozinha pelo risco do outro.

Também é importante não prometer sigilo absoluto. Há limites: risco de violência, obrigação legal ou necessidade de obter cuidados de saúde. Em vez de “nunca conto a ninguém”, digam “não partilho sem autorização, exceto se houver risco sério e imediato”.

### A confiança não exige exposição total

Pessoas honestas podem proteger muito a identidade; pessoas desonestas podem mostrar rosto e documentos. Avalia consistência, respeito por limites e capacidade de responder a perguntas sem te apressar.

### Aplicação prática

Uma resposta clara a “o teu parceiro sabe?” pode proteger identidades sem fugir: “Sim. Temos um acordo aberto; não partilho o nome nem fotografias dele. Posso explicar os limites que afetam a nossa ligação.” Se a resposta é “é complicado” ou muda de assunto, pede informação suficiente antes de avançar.

Define ainda o que significa ser visto em público. Algumas pessoas aceitam um café longe de casa, mas não contacto físico; outras não querem fotografias ou encontros em determinados locais. Discrição bem combinada cria previsibilidade. Quando só uma pessoa conhece as regras, o outro vive num campo minado.

**Leva contigo:** Privacidade protege a pessoa. Segredo imposto protege uma narrativa à custa da escolha dos outros.$article_5_3$, '◈',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Discrição não é engano: onde termina a privacidade e começa o segredo', 'É legítimo proteger a vida privada. Não é legítimo usar essa proteção para retirar informação que outra pessoa precisa para consentir.',
  503, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '1c4dbd26-3626-53d7-860c-c387ec4a7115', 'se-a-tua-privacidade-falhar-plano-de-resposta-a-exposicao-e-perseguicao', 'Se a tua privacidade falhar: plano de resposta a exposição e perseguição', 'PRIVACY'::"GuideCategory",
  'Um plano preparado reduz decisões em pânico. Preserva provas, corta acessos, mobiliza apoio e trata primeiro o risco mais imediato.', $article_5_4$Uma falha de privacidade pode ir de uma captura de ecrã indesejada a doxxing, chantagem, perseguição ou divulgação de imagens íntimas. A resposta depende da gravidade, mas a ordem importa.

Primeiro, avalia perigo imediato. A pessoa conhece a tua morada, trabalho ou rotina? Fez ameaça credível? Está a aproximar-se fisicamente? Se sim, contacta as autoridades e uma pessoa de confiança; não enfrentes sozinho/a. Altera trajetos e informa segurança do local de trabalho quando adequado.

### Preservar antes de bloquear

Quando for seguro, guarda capturas completas com data, nome do perfil, endereço ou identificador, mensagens e contexto. Não edites os originais. Regista os passos já tomados. Depois usa bloqueio e denúncia. Não continues a conversa apenas para obter confissão se isso aumentar o risco.

Protege as contas associadas: muda palavras-passe reutilizadas, termina sessões, ativa autenticação de dois fatores, revê emails e números de recuperação e limita visibilidade de redes sociais. Pesquisa o teu próprio nome, imagens e contactos para perceber o que ficou exposto.

### Controlar a propagação

Se o conteúdo aparecer num site ou rede, usa os mecanismos de denúncia para conteúdo íntimo não consentido, falsificação de identidade ou dados pessoais. Guarda o endereço antes de pedir remoção. Não peças a muitos amigos que visitem ou partilhem a publicação; isso pode ampliar o alcance.

### Apoio humano e impacto emocional

Exposição provoca vergonha, medo e sensação de perda de controlo. A responsabilidade é de quem violou a privacidade, não de quem confiou. Escolhe duas ou três pessoas para apoio prático: uma ajuda com denúncias, outra acompanha contactos oficiais, outra fica contigo. Distribuir tarefas reduz a sobrecarga.

Depois da crise, revê o mapa de risco sem te culpares. O objetivo não é concluir que nunca mais podes confiar. É retirar permissões desnecessárias, melhorar separação entre identidades e reconstruir controlo.

### Aplicação prática

Prepara uma folha privada com contactos, procedimentos de denúncia, lista de contas críticas e duas pessoas de apoio. Não guardes provas apenas no dispositivo potencialmente comprometido; cria cópia segura. Se existirem filhos ou dependentes, inclui como ajustar recolhas, rotinas e informação partilhada.

Numa ameaça, distingue capacidade de intenção: o agressor diz que sabe a morada, mas mostrou prova? Tem acesso a contas? Já apareceu fisicamente? Mesmo sem certeza, atua pelo cenário de maior impacto razoável. Evita encontros para “resolver” e não cedas a exigências em troca de uma promessa de apagamento.

**Leva contigo:** Em crise, não tentes apagar tudo antes de guardar provas. Segurança primeiro, evidência depois, remoção a seguir.$article_5_4$, '◈',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Se a tua privacidade falhar: plano de resposta a exposição e perseguição', 'Um plano preparado reduz decisões em pânico. Preserva provas, corta acessos, mobiliza apoio e trata primeiro o risco mais imediato.',
  504, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Segurança: 4 artigos
+INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '1c971906-401a-5814-83dc-8d77a413b470', 'perfis-falsos-manipulacao-e-fraude-sinais-que-pedem-travao', 'Perfis falsos, manipulação e fraude: sinais que pedem travão', 'SAFETY'::"GuideCategory",
  'A fraude romântica cresce com pressa, isolamento e histórias difíceis de verificar. A melhor defesa é abrandar sem anunciar todas as tuas verificações.', $article_6_1$Um perfil falso nem sempre parece mal construído. Pode conversar durante semanas, adaptar-se aos teus valores e criar intimidade antes de pedir dinheiro, imagens, documentos ou acesso a contas. O objetivo é frequentemente deslocar a relação da aplicação, reduzir contraditório e transformar empatia em urgência.

Sinais de alerta incluem:

- intensidade emocional muito rápida e linguagem de destino;
- desculpas repetidas para evitar videochamada ou encontro;
- profissão ou viagem que explica ausência constante;
- emergência financeira, investimento ou pedido de criptomoeda;
- pedido de códigos de verificação, documentos ou dados bancários;
- pressão para manter a relação secreta;
- fotografias demasiado perfeitas ou com resultados noutros nomes;
- detalhes biográficos inconsistentes.

Nenhum destes sinais prova sozinho uma fraude. O padrão e a resposta a limites são decisivos. Uma pessoa genuína pode ser discreta; uma pessoa manipuladora reage mal quando pedes tempo, verificação ou permanência na plataforma.

### Verificar sem virar investigador obsessivo

Faz uma videochamada breve e espontânea antes de grande investimento emocional. Usa pesquisa inversa de imagem. Confirma se a história é coerente ao longo do tempo. Para encontros, escolhe local público. Nunca uses fotografias de documentos como método informal de verificação — podem ser roubadas.

Não envies dinheiro, não recebas transferências para reenviar e não participes em “investimentos” apresentados por alguém conhecido numa aplicação. Mesmo uma pequena quantia pode testar a tua disponibilidade e preparar pedidos maiores.

### A manipulação não precisa de dinheiro

Há quem procure imagens íntimas para chantagem, morada para perseguição ou acesso emocional para controlo. Desconfia de pedidos que aumentam o poder da outra pessoa sem aumentar a tua segurança.

Se suspeitares, não confrontes com todas as provas. Guarda registos, denuncia, bloqueia e avisa o banco se partilhaste dados ou transferiste dinheiro. A vergonha é uma ferramenta do burlão; pedir ajuda cedo reduz danos.

### Aplicação prática

Quando a história te emociona, aplica a regra das 24 horas a pedidos de dinheiro, documentos ou mudança de plataforma. Fala com alguém que não esteja envolvido e descreve apenas factos. A distância emocional permite ver padrões que a intimidade acelerada esconde.

Faz uma pergunta verificável sem revelar como vais confirmar. Um burlão bem preparado responde às dúvidas que conhece; inconsistências aparecem quando precisa de sustentar detalhes ao longo do tempo. Se a pessoa transforma qualquer verificação em acusação de falta de amor, recua. Confiança saudável cresce com verificabilidade, não exige cegueira.

**Leva contigo:** Química não é verificação de identidade. E urgência emocional é uma péssima conselheira financeira.$article_6_1$, '⚑',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Perfis falsos, manipulação e fraude: sinais que pedem travão', 'A fraude romântica cresce com pressa, isolamento e histórias difíceis de verificar. A melhor defesa é abrandar sem anunciar todas as tuas verificações.',
  601, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '39d4ce8a-c193-5a3e-b59b-492e72e26f0a', 'saude-sexual-partilhada-conversar-sem-interrogatorios-nem-estigma', 'Saúde sexual partilhada: conversar sem interrogatórios nem estigma', 'SAFETY'::"GuideCategory",
  'Segurança sexual não se resume a “estás limpo/a?”. Exige linguagem respeitosa, práticas adequadas, testagem orientada e comunicação quando algo muda.', $article_6_2$Falar de saúde sexual antes do contacto íntimo é parte do consentimento informado. A conversa deve focar práticas, datas e prevenção, não classificar pessoas como “limpas” ou “sujas”. Uma infeção sexualmente transmissível não define caráter e muitas podem não apresentar sintomas.

Perguntas mais úteis são: “Quando foi a tua última avaliação e que testes foram feitos?”, “Que práticas tiveste desde então?”, “Que barreiras preferes usar?” e “Como comunicamos se algum resultado mudar?”. Diferentes práticas podem exigir testes em diferentes locais do corpo; um profissional de saúde ajuda a definir o que faz sentido.

### Um plano em camadas

Redução de risco pode combinar preservativos externos ou internos, barreiras para sexo oral, lubrificação adequada, vacinação relevante, contraceção quando aplicável, testagem e estratégias biomédicas para prevenção do VIH aconselhadas clinicamente. Nenhuma medida isolada cobre todas as infeções ou todos os riscos.

Testagem não substitui barreiras automaticamente. Existe um intervalo entre exposição e deteção e o resultado descreve apenas o momento avaliado. Por isso, os acordos devem considerar alterações desde o teste, não apenas mostrar um relatório.

### Informação proporcional e atempada

Não é necessário revelar todo o historial sexual. É necessário comunicar informação atual que possa alterar o consentimento de alguém: sintomas, diagnóstico, exposição relevante, alteração de proteção ou quebra de acordo. Esta conversa deve acontecer antes de novo contacto, não depois por vergonha.

Se houver um diagnóstico, sigam orientação clínica, informem parceiros potencialmente expostos e evitem procurar um culpado antes de compreender janelas e formas de transmissão. O foco imediato é cuidado e prevenção de novas exposições.

### Substâncias e decisões

Álcool e drogas podem reduzir capacidade de manter acordos, usar proteção corretamente e reconhecer consentimento. Definam limites antes e mantenham uma via simples para parar. “Estávamos alterados” explica risco; não elimina responsabilidade.

### Aplicação prática

Preparem uma frase padrão antes de encontros: “A minha última avaliação foi em…, incluiu…, e desde então tive estas práticas com esta proteção. Prefiro usar…”. A estrutura reduz ansiedade e torna a conversa recíproca. Se não sabes que testes foram feitos, diz isso; “fiz análises” é demasiado vago para decisões informadas.

Combina ainda como receber notícias difíceis. Uma resposta como “obrigado/a por dizeres; vamos falar com um profissional e decidir os próximos passos” protege saúde e honestidade. Vergonha e acusação incentivam silêncio futuro. Responsabilidade exige informação atempada, não perfeição biológica.

**Leva contigo:** Uma conversa madura sobre saúde sexual não promete risco zero. Cria decisões informadas, partilhadas e atualizadas.$article_6_2$, '⚑',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Saúde sexual partilhada: conversar sem interrogatórios nem estigma', 'Segurança sexual não se resume a “estás limpo/a?”. Exige linguagem respeitosa, práticas adequadas, testagem orientada e comunicação quando algo muda.',
  602, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '9661d857-88fa-57f2-81d8-c782d3fe0a45', 'bloquear-denunciar-e-guardar-provas-ferramentas-de-protecao-nao-dramatismo', 'Bloquear, denunciar e guardar provas: ferramentas de proteção, não dramatismo', 'SAFETY'::"GuideCategory",
  'Não tens de oferecer uma última explicação a quem te ameaça, persegue ou ultrapassa limites. Segurança pode exigir terminar o contacto sem negociação.', $article_6_3$Bloquear é adequado quando existe assédio, pressão sexual, insulto, perseguição, tentativa de fraude, envio de conteúdo não solicitado ou simples necessidade de terminar contacto. Não é obrigatório esgotar uma conversa nem convencer a outra pessoa de que a tua decisão é justa.

Antes de bloquear, se for seguro, guarda os elementos necessários para denúncia: perfil, identificadores, mensagens completas, datas, ameaças e pedidos. Capturas isoladas podem perder contexto; inclui a sequência e não alteres os ficheiros originais.

### O que denunciar

Denuncia comportamentos, não apenas incompatibilidade. Exemplos: perfil falso, menor de idade, ameaça, chantagem, divulgação íntima, discriminação, violência, fraude, perseguição ou violação clara de consentimento. Descreve factos: o que foi dito ou feito, quando aconteceu e que risco existe. Evita diagnósticos ou suposições que não possas sustentar.

Se houver crime, perigo imediato ou risco físico, a denúncia na aplicação não substitui autoridades e apoio especializado. A plataforma pode limitar uma conta; não consegue garantir proteção fora dela.

### Depois do bloqueio

Revê se a pessoa tem outros canais: telefone, email, redes, calendário, localização partilhada ou acesso a fotografias. Ajusta privacidade e avisa pessoas próximas se houver risco de contacto indireto. Não respondas a novas contas; cada resposta confirma que o canal funciona.

Em casais, não permitam que a pessoa bloqueada contorne o limite através do outro parceiro. Um bloqueio individual deve ser respeitado e a informação não deve circular como recado informal.

### Quando recebes uma denúncia sobre alguém conhecido

Não exijas detalhes íntimos para “decidir quem tem razão”. Escuta, pergunta o que a pessoa precisa e evita alertar o alegado agressor se isso puder aumentar risco ou destruir provas. Apoio não obriga a atuar como investigador.

### Aplicação prática

Cria uma sequência simples: capturar, exportar quando possível, anotar contexto, denunciar, bloquear e rever canais externos. Dá aos ficheiros nomes com data e plataforma. Não recortes a primeira versão; guarda o original e cria cópias apenas para partilha.

Se o comportamento é insistente mas ainda não parece ameaçador, não esperes que escale para justificar um limite. Uma mensagem única — “Não quero mais contacto” — pode ser útil como registo, mas só se te sentires seguro/a. Depois não debates. A clareza não obriga a disponibilidade infinita.

**Leva contigo:** Bloquear fecha uma porta digital. Um plano de segurança confirma se ficaram janelas abertas.$article_6_3$, '⚑',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Bloquear, denunciar e guardar provas: ferramentas de proteção, não dramatismo', 'Não tens de oferecer uma última explicação a quem te ameaça, persegue ou ultrapassa limites. Segurança pode exigir terminar o contacto sem negociação.',
  603, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '95af8bfd-97cd-5d5a-aab4-0b40a58f911a', 'seguranca-da-conta-palavra-passe-dois-fatores-e-mensagens-perigosas', 'Segurança da conta: palavra-passe, dois fatores e mensagens perigosas', 'SAFETY'::"GuideCategory",
  'Numa aplicação sensível, proteger a conta é proteger relações, localização, imagens e identidade — não apenas um login.', $article_6_4$Usa uma palavra-passe longa e exclusiva. Se a mesma palavra-passe existir noutro serviço comprometido, um atacante pode testá-la automaticamente. Um gestor de palavras-passe permite criar credenciais únicas sem depender da memória.

Ativa autenticação de dois fatores sempre que disponível, preferindo uma aplicação autenticadora ou chave de segurança a SMS quando possível. Guarda códigos de recuperação num local protegido, fora da galeria de fotografias. Revê periodicamente sessões e dispositivos ligados.

### Phishing com contexto emocional

Uma mensagem perigosa pode imitar suporte da aplicação: “o teu perfil foi denunciado”, “confirma a idade” ou “vê quem guardou as tuas fotos”. Não abras ligações recebidas por conversa para iniciar sessão. Entra diretamente na aplicação e verifica notificações. O suporte legítimo não precisa da tua palavra-passe nem de um código enviado ao teu telemóvel.

Também não partilhes códigos com matches. Um pedido como “enviei-te um código por engano” pode ser tentativa de tomar uma conta tua.

### Separar identidades

Considera um email dedicado que não revele nome completo nem esteja associado publicamente às tuas redes. Protege o próprio email com dois fatores, porque ele permite recuperar a conta. Ajusta pré-visualizações de notificações no ecrã bloqueado se a discrição for importante.

Evita iniciar sessão em dispositivos partilhados. Se o fizeres, não guardes a palavra-passe, termina a sessão e apaga transferências locais. Um modo privado do navegador reduz histórico visível, mas não torna a atividade invisível à rede, ao dispositivo ou ao serviço.

### Se suspeitares de acesso

Muda primeiro a palavra-passe do email, depois a da aplicação. Termina todas as sessões, verifica dados de recuperação, ativa dois fatores e procura alterações a perfil ou mensagens. Informa contactos se a conta enviou pedidos estranhos.

### Aplicação prática

Faz uma revisão trimestral de cinco minutos: palavra-passe exclusiva, dois fatores ativo, dispositivos reconhecidos, email de recuperação seguro e notificações discretas. Remove sessões antigas e aplicações ligadas que já não usas.

Simula mentalmente a perda do telemóvel. Consegues recuperar a conta sem depender do próprio dispositivo? Os códigos de recuperação estão acessíveis apenas a ti? Se partilhas um computador, verifica downloads e preenchimento automático. Segurança eficaz não depende de te lembrares de agir bem durante uma crise; prepara caminhos antes.

**Leva contigo:** Uma conta sensível merece uma palavra-passe que nunca viveu noutra casa digital.$article_6_4$, '⚑',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Segurança da conta: palavra-passe, dois fatores e mensagens perigosas', 'Numa aplicação sensível, proteger a conta é proteger relações, localização, imagens e identidade — não apenas um login.',
  604, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Perfis: 4 artigos
+INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '12bb32fd-a4ee-569d-8812-73dbc75aaf44', 'um-perfil-que-atrai-sem-prometer-uma-personagem', 'Um perfil que atrai sem prometer uma personagem', 'PROFILES'::"GuideCategory",
  'Bons perfis não tentam agradar a toda a gente. Mostram intenção, personalidade e limites suficientes para facilitar compatibilidade real.', $article_7_1$Um perfil é um convite, não um currículo nem uma campanha publicitária. Quando tenta parecer universalmente desejável, torna-se genérico: “gosto de viajar, rir e aproveitar a vida”. Tudo verdade, quase nada útil. A compatibilidade começa onde aparece especificidade.

Escreve em quatro camadas. Primeiro, **quem és no quotidiano**: energia social, ritmo, interesses, forma de comunicar. Depois, **o que procuras**: conversa, experiência pontual, vínculo continuado, casal, pessoa individual ou exploração gradual. Em seguida, **como gostas de construir confiança**: mensagens, videochamada, encontro público, ritmo lento. Por fim, **limites essenciais**: discrição, distância, tabaco, formatos relacionais ou outras incompatibilidades relevantes.

### Mostrar sem exagerar

Troca adjetivos por pequenos sinais concretos. Em vez de “sou divertido”, diz “sou a pessoa que leva uma playlist para uma viagem de quinze minutos”. Em vez de “mente aberta”, explica a atitude: “gosto de fazer perguntas sem presumir respostas”. Uma linha específica vale mais do que cinco rótulos positivos.

Evita prometer disponibilidade, experiência ou confiança que ainda não tens. “Estamos a explorar pela primeira vez e queremos ir devagar” filtra melhor do que fingir domínio. Vulnerabilidade calibrada é mais credível do que performance.

### Limites sem lista hostil

Um perfil cheio de proibições pode transmitir cansaço e agressividade. Reformula limites como critérios de compatibilidade: “Procuro pessoas que comuniquem diretamente e respeitem um não à primeira” em vez de “sem dramas e sem pessoas complicadas”. Termos como “sem dramas”, “normal” ou “limpo/a” escondem preconceitos e não descrevem comportamento.

### Não contar a vida inteira

Deixa temas para a conversa e protege dados identificáveis. Um perfil deve responder “vale a pena falarmos?”, não oferecer material suficiente para alguém mapear a tua vida.

### Aplicação prática

Pede a alguém de confiança que leia o perfil e responda: “Que tipo de encontro imaginas com esta pessoa?” e “Que limite ficou claro?”. Se a resposta for apenas “parece simpática”, falta especificidade. Acrescenta uma imagem de quotidiano, uma intenção e uma preferência de ritmo.

Revê também cada frase que procura aprovação. Expressões como “não sei o que escrever” ou “surpreende-me” transferem todo o trabalho para quem lê. Um perfil acolhedor oferece pontos de entrada: um tema, uma pergunta ou uma sugestão de primeiro contacto.

**Mini-estrutura:** “Sou… / Neste momento procuro… / Gosto de ligações que… / Para mim é importante… / Podemos começar por…”

**Leva contigo:** O objetivo não é acumular likes. É reduzir matches errados e tornar os certos mais fáceis de reconhecer.$article_7_1$, '○',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Um perfil que atrai sem prometer uma personagem', 'Bons perfis não tentam agradar a toda a gente. Mostram intenção, personalidade e limites suficientes para facilitar compatibilidade real.',
  701, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  'e554e216-b03b-524b-b53f-92ec26165b77', 'perfil-de-casal-duas-vozes-nao-uma-marca-conjunta', 'Perfil de casal: duas vozes, não uma marca conjunta', 'PROFILES'::"GuideCategory",
  'Um casal é uma relação entre duas pessoas, não uma personalidade única. Um bom perfil mostra o conjunto sem apagar diferenças.', $article_7_2$Perfis de casal falham frequentemente num de dois extremos: parecem pertencer apenas à pessoa que escreve, ou apresentam o casal como entidade perfeitamente sincronizada. Nenhuma opção ajuda alguém a perceber com quem está realmente a falar.

Identifiquem quem gere a conta em cada momento e como a outra pessoa participa. Usem nomes escolhidos ou iniciais, mas distingam vozes: “A é mais conversadora e gosta de planear; B precisa de mais tempo e prefere conhecer primeiro em ambiente social”. Diferenças honestas não enfraquecem o casal; evitam surpresas.

### O que deve ficar claro

- procuram experiências apenas conjuntas ou também conversas individuais?
- ambos leem todas as mensagens?
- existe atração por géneros ou pessoas diferentes?
- estão a começar ou já têm experiência?
- que tipo de continuidade admitem?
- quem pode decidir avançar ou parar?

Não digam “ela é bi, ele é hetero” como se isso definisse automaticamente o papel da terceira pessoa. Orientação não é disponibilidade nem guião. Evitem ainda “procuramos uma mulher para nos completar”: parece romântico, mas coloca numa desconhecida a função de preencher o casal.

### Simetria impossível

Não prometam química igual entre três pessoas. Digam antes como lidam com ritmos diferentes. Se apenas aceitam interação quando todos estão presentes, sejam claros. Se admitem ligações individuais, expliquem que autonomia existe. O que não pode acontecer é mudar a regra depois de surgir mais química com uma pessoa.

### Fotografias e consentimento

Ambos devem aprovar imagens, texto e nível de exposição. Rever o perfil juntos não significa que tenham de falar sempre como um coro. Também não usem fotografias com antigos parceiros, filhos ou terceiros não consentidos.

**Pergunta para rever o perfil:** “Se alguém se sentir atraído apenas por um de nós, o nosso texto explica com honestidade o que acontece a seguir?”

### Aplicação prática

Escrevam primeiro dois mini-perfis individuais com cem palavras. Só depois criem a apresentação conjunta. As diferenças que aparecem — ritmo, interesses, limites — devem permanecer visíveis. Apagá-las produz um casal mais elegante no ecrã e menos previsível no encontro.

Acrescentem uma linha operacional: “As mensagens são lidas por ambos; indicamos quem responde” ou “A conversa inicial é gerida pela Ana e o Miguel entra antes de marcarmos”. Quem contacta convosco precisa de saber quantas pessoas estão realmente na conversa e quem conhece o conteúdo partilhado.

**Leva contigo:** Um perfil de casal credível não prova união perfeita. Mostra coordenação suficiente para respeitar uma terceira pessoa.$article_7_2$, '○',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Perfil de casal: duas vozes, não uma marca conjunta', 'Um casal é uma relação entre duas pessoas, não uma personalidade única. Um bom perfil mostra o conjunto sem apagar diferenças.',
  702, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '076407f5-0e71-5d3d-8c49-cf153e30d0da', 'fotografias-de-perfil-atracao-autenticidade-e-controlo-de-exposicao', 'Fotografias de perfil: atração, autenticidade e controlo de exposição', 'PROFILES'::"GuideCategory",
  'As melhores fotografias dão uma ideia real de presença sem revelar, por acidente, a identidade completa e a rotina.', $article_7_3$Escolhe imagens que respondam a três perguntas: como pareces, que energia transmites e que grau de discrição escolheste. Não precisas de mostrar o rosto publicamente para ser autêntico/a, mas deves explicar quando e como o partilhas.

Uma sequência equilibrada pode incluir uma imagem principal clara, uma fotografia de corpo inteiro vestida, um contexto de interesse e uma imagem mais discreta. Evita filtros que alterem demasiado traços, fotografias muito antigas e dez imagens quase iguais. Se uma imagem tem vários amigos, não obrigues ninguém a adivinhar quem és — e não publiques rostos alheios sem autorização.

### O fundo também fala

Verifica espelhos, crachás, matrículas, moradas em encomendas, uniforme, logótipo da empresa, fotografias de família e vista de casa. Um detalhe pode identificar-te mais depressa do que o rosto. Recorta e desfoca onde necessário, mas não uses o desfoque para esconder uma diferença relevante entre imagem e realidade.

### Fotografias íntimas não são cartão de visita obrigatório

Um contexto adulto não cria obrigação de nudez. Imagens explícitas podem atrair atenção, mas não garantem compatibilidade e aumentam risco de reutilização. Se escolheres partilhar, usa as ferramentas privadas da aplicação e revê os princípios de minimização de identificação.

### Casais

Incluam pelo menos uma imagem onde ambos aparecem de forma reconhecível no mesmo nível de clareza, se a exposição escolhida o permitir. Não construam um perfil “de casal” com oito fotografias de uma pessoa e a outra escondida. Isso cria expectativas erradas e pode sinalizar falta de participação real.

### Atualidade e honestidade

Usa fotografias recentes e representativas. Não deves nada a padrões estéticos; deves coerência entre perfil e encontro. A atração sobrevive melhor a uma verdade específica do que a uma surpresa calculada.

### Aplicação prática

Faz uma auditoria em ecrã pequeno. A fotografia principal continua clara? O corte sugere algo diferente? Depois amplia e verifica o fundo. Muitas falhas de privacidade só aparecem numa das duas escalas.

Escolhe ainda uma regra de atualização, por exemplo rever imagens a cada seis meses ou após mudança relevante. Não é necessário documentar cada transformação; basta evitar que o encontro dependa de uma versão antiga. Atualidade é uma forma de consentimento informado, porque permite à outra pessoa decidir com base no presente.

**Leva contigo:** Uma boa fotografia não revela tudo. Revela o suficiente, de forma verdadeira e deliberada.$article_7_3$, '○',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Fotografias de perfil: atração, autenticidade e controlo de exposição', 'As melhores fotografias dão uma ideia real de presença sem revelar, por acidente, a identidade completa e a rotina.',
  703, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '135bea02-f84a-53df-8f08-1d6ec5f5d85e', 'preferencias-sem-desumanizar-filtros-linguagem-e-compatibilidade', 'Preferências sem desumanizar: filtros, linguagem e compatibilidade', 'PROFILES'::"GuideCategory",
  'Podes ter preferências e limites. A forma como os expressas mostra se vês pessoas ou apenas categorias de consumo.', $article_7_4$Atração não se distribui por obrigação. É legítimo procurar determinada faixa etária, dinâmica, distância, género ou experiência. Mas uma preferência não precisa de ser anunciada como julgamento sobre todos os que ficam de fora.

“Procuro pessoas entre 35 e 50 anos” é claro. “Sem velhos/as” humilha. “Neste momento procuro uma mulher” descreve intenção. “Só mulheres femininas e sem complicações” mistura estereótipos e uma exigência vaga de docilidade.

### Filtros não substituem conversa

Rótulos ajudam a navegar, mas não garantem compatibilidade. Duas pessoas podem selecionar “relação aberta” e ter acordos opostos. “Experiente” pode significar anos de prática ou apenas conforto com um interesse. Usa filtros para encontrar possibilidades e perguntas para compreender significado.

### Fetichização

Procurar alguém principalmente pela raça, identidade trans, bissexualidade, corpo ou deficiência pode transformar a pessoa numa fantasia. A diferença entre atração e fetichização aparece no comportamento: estás curioso/a sobre quem ela é, ou esperas que represente um papel associado à categoria?

Evita perguntas invasivas sobre corpo, cirurgias, historial ou práticas antes de existir contexto. Identidade não é consentimento para educação gratuita nem para acesso íntimo.

### Critérios que realmente protegem

Alguns filtros comportamentais são mais úteis do que os estéticos: capacidade de respeitar limites, consistência, acordo relacional transparente, tabagismo, consumo, distância ou disponibilidade. Explica os não negociáveis que afetam a experiência, sem listar características humanas como defeitos.

### Rejeitar com respeito

Não precisas de justificar ausência de atração em detalhe. “Obrigado/a pela conversa, não senti a compatibilidade que procuro” basta. Uma crítica não pedida ao corpo ou identidade não é honestidade; é descarga.

### Aplicação prática

Relê cada preferência substituindo o grupo por uma característica tua. A frase continuaria respeitosa? Este teste revela facilmente linguagem que descreve pessoas como defeito. Depois reformula pelo positivo: o que procuras, não quem desprezas.

Quando um filtro produz poucos resultados, não transformes frustração em pressão sobre pessoas incompatíveis. Revê se é necessidade, preferência ou hábito. Podes alargar uma preferência; não deves negociar o limite de outra pessoa para aumentar opções. Compatibilidade é escassa por definição — é isso que lhe dá valor.

**Leva contigo:** Ter um tipo é humano. Tratar pessoas como tipos é opcional — e evitável.$article_7_4$, '○',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Preferências sem desumanizar: filtros, linguagem e compatibilidade', 'Podes ter preferências e limites. A forma como os expressas mostra se vês pessoas ou apenas categorias de consumo.',
  704, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Primeiros encontros: 4 artigos
+INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  'd73e36dd-d40a-5f1d-ac06-50fc22b9e45c', 'um-primeiro-encontro-seguro-plano-simples-saida-facil', 'Um primeiro encontro seguro: plano simples, saída fácil', 'FIRST_MEETINGS'::"GuideCategory",
  'Segurança não exige medo constante. Exige que o encontro não dependa totalmente da boa vontade de alguém que ainda não conheces.', $article_8_1$Escolhe um local público, com movimento, equipa presente e acesso fácil a transporte. Vai e regressa por meios próprios. Não partilhes morada cedo e evita aceitar boleia quando isso retiraria a tua capacidade de sair.

Conta a uma pessoa de confiança onde vais, com quem e a que horas esperas terminar. Partilha o perfil ou informação útil e combina um check-in. Uma palavra-código pode sinalizar que precisas de chamada, recolha ou ajuda sem explicar em frente a alguém.

### Verificação antes do encontro

Uma videochamada breve reduz risco de identidade falsa e confirma energia básica. Não é garantia de caráter. Mantém o primeiro encontro curto: café, bebida ou passeio numa zona frequentada. Se correr bem, haverá outro. Se alguém insiste que só vale a pena em casa ou hotel, isso é informação sobre a forma como respeita limites.

### Durante

Mantém controlo da bebida, não aceites substâncias desconhecidas e presta atenção à tua capacidade de decidir. Define previamente um limite de consumo. Se te sentires confuso/a, demasiado alterado/a ou pressionado/a, procura funcionários, chama transporte e contacta a tua pessoa de segurança.

O corpo capta inconsistências antes de conseguires explicá-las. Não precisas de provar que existe perigo para sair. “Vou terminar por aqui” é frase completa. Não reveles mais informação nem mudes de local para evitar parecer indelicado/a.

### Encontro com casal ou grupo

Confirma quem estará presente. Uma pessoa adicional não anunciada muda o consentimento. Fala com todos antes e identifica se alguém parece pressionado. Mantém o teu transporte e contacto de segurança independentes do casal.

### Depois

Faz o check-in combinado, mesmo que o encontro tenha corrido bem. Regista qualquer comportamento preocupante enquanto está fresco. Se existiu violação, procura apoio e não te culpes por teres ido.

### Aplicação prática

Envia à pessoa de confiança uma ficha curta: nome usado, ligação do perfil, local, hora e transporte. Combina duas mensagens — chegada e fim — e o que deve fazer se não responderes. “Liga à polícia” pode ser excessivo como primeiro passo; define uma sequência adequada ao risco.

Ao chegar, identifica saída, funcionários e zona com outras pessoas. Mantém bateria e dinheiro suficientes para regressar. Estes gestos devem ser discretos e automáticos, não dominar o encontro. Segurança bem preparada liberta atenção para conhecer alguém.

**Leva contigo:** Um bom plano de saída não prevê que tudo corra mal. Garante que não ficas preso/a se correr.$article_8_1$, '◉',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Um primeiro encontro seguro: plano simples, saída fácil', 'Segurança não exige medo constante. Exige que o encontro não dependa totalmente da boa vontade de alguém que ainda não conheces.',
  801, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '7315c7db-a94e-5241-9483-9efe4fbfb1a4', 'expectativas-alcool-e-ritmo-o-que-convem-dizer-antes-de-chegar', 'Expectativas, álcool e ritmo: o que convém dizer antes de chegar', 'FIRST_MEETINGS'::"GuideCategory",
  '“Vamos ver o que acontece” pode ser leve, mas não deve esconder expectativas incompatíveis sobre sexo, duração ou continuação.', $article_8_2$Antes do encontro, alinhem o formato: conversa social, possibilidade de intimidade, presença de ambos os membros do casal, duração aproximada e local. Não é necessário escrever um guião. É necessário evitar que alguém chegue a um café e descubra que os outros reservaram um quarto e consideram a decisão tomada.

Uma formulação saudável é: “Gostava de te conhecer sem expectativa de contacto físico; se houver vontade mútua, falamos no momento”. Se existe possibilidade de mudança de local, cada pessoa decide novamente. Aceitar o encontro não inclui automaticamente a segunda parte.

### Álcool não deve carregar a coragem toda

Uma bebida pode reduzir tensão, mas não deve ser a ferramenta que permite ultrapassar limites que sóbrios parecem importantes. Definam consumo e respeitem quem não bebe. Nunca uses álcool para “ajudar” outra pessoa a relaxar nem interpretes desinibição como consentimento.

Se o encontro tem uma componente íntima provável, conversem antes sobre proteção, limites e privacidade. No momento, confirmem de novo. Preparação e consentimento atual trabalham juntos.

### Ritmos diferentes

Uma pessoa pode sentir química por mensagem e precisar de tempo presencial. Outra pode ser calorosa sem desejar contacto. Pergunta em vez de testar: “Posso aproximar-me?” é melhor do que avançar para ver se a pessoa recua.

Em casais, não usem sinais secretos que excluam o convidado das decisões. Se precisam de uma conversa privada, digam-no e aceitem que a outra pessoa também possa refletir ou sair. Não criem uma sala onde duas pessoas deliberam e uma espera pela sentença.

### Encerrar sem ambiguidade

Combinar uma hora final reduz pressão. Se quiserem prolongar, todos escolhem. Se não houver química, não precisam de inventar emergência: “Gostei de conhecer-te, mas vou terminar por aqui” é respeitoso.

### Aplicação prática

Troquem uma mensagem de alinhamento no próprio dia: “Mantemos café de uma hora, sem expectativa física, e cada um regressa por conta própria?”. A confirmação reduz interpretações criadas pela conversa anterior e permite corrigir mudanças.

Se decidirem beber, escolham o limite antes da primeira bebida e alternem com água. Qualquer mudança importante — local privado, contacto íntimo, presença de outra pessoa — merece decisão ainda clara. Se alguém diz “depois vemos”, isso significa que a decisão permanece aberta, não que o passo está pré-aprovado.

**Leva contigo:** Espontaneidade saudável nasce dentro de limites compreendidos, não da surpresa imposta.$article_8_2$, '◉',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Expectativas, álcool e ritmo: o que convém dizer antes de chegar', '“Vamos ver o que acontece” pode ser leve, mas não deve esconder expectativas incompatíveis sobre sexo, duração ou continuação.',
  802, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '3bf49c73-0a80-523d-8fe3-18589dacfd77', 'encontrar-um-casal-sem-parecer-uma-entrevista-de-emprego', 'Encontrar um casal sem parecer uma entrevista de emprego', 'FIRST_MEETINGS'::"GuideCategory",
  'Três pessoas não formam automaticamente uma unidade. Um encontro equilibrado cria espaço para cada ligação, sem obrigar ninguém a candidatar-se ao casal.', $article_8_3$Casais chegam com história, linguagem interna e coordenação. A pessoa convidada chega sozinha a uma dinâmica já estabelecida. Mesmo sem intenção, existe desequilíbrio. Se o casal fizer perguntas em sequência, trocar olhares avaliativos e falar sempre em “nós”, o encontro pode parecer uma entrevista para uma vaga cujo contrato ninguém mostrou.

Comecem por conversar como pessoas. Cada membro do casal deve responder por si, não corrigir continuamente o outro. A pessoa convidada também deve poder fazer perguntas sobre acordos, ciúme, experiência anterior e poder de decisão. Essas perguntas não são invasivas; são avaliação de segurança.

### Evitar triangulação

Não usem o convidado para transmitir mensagens ao parceiro — elogios para provocar ciúme, confidências sobre problemas do casal ou comparações. E não peçam que escolha quem considera mais atraente. Química desigual é possível; transformá-la num teste público é desnecessário.

### Consentimento individual

Cada contacto envolve as pessoas diretamente participantes. Um parceiro não pode autorizar toque no corpo do outro. A pessoa convidada pode querer uma aproximação e não outra, parar com uma pessoa e continuar a conversar, ou concluir que prefere apenas amizade. O casal decide o que consegue sustentar, mas não reescreve a vontade dela como ofensa.

### Sinais de uma dinâmica saudável

- o casal admite diferenças sem entrar em crise;
- acordos relevantes são explicados sem evasão;
- ninguém exige atração simétrica;
- o “não” é recebido com normalidade;
- existe interesse pela pessoa além do papel que poderá ocupar;
- a saída é fácil e não há pressão por uma decisão imediata.

Uma terceira pessoa não “entra no casal”. Cria relações novas com cada pessoa e, talvez, com o conjunto. Essa distinção protege todos.

### Aplicação prática

Usem uma regra de equilíbrio: cada pessoa faz e responde a perguntas. O casal evita completar frases um do outro e reserva avaliações internas para depois. A pessoa convidada pode perguntar “o que acontece se eu sentir química diferente por cada um?”; uma resposta defensiva é informação importante.

No fim, cada pessoa decide individualmente antes de existir uma decisão conjunta. O casal pode concluir que o formato não serve, mas não deve declarar o que o convidado sentiu. Três vozes produzem uma resposta mais lenta e muito mais honesta do que um “nós” automático.

**Leva contigo:** Se o encontro só funciona enquanto a terceira pessoa agrada igualmente aos dois, não é um encontro a três; é uma audição.$article_8_3$, '◉',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Encontrar um casal sem parecer uma entrevista de emprego', 'Três pessoas não formam automaticamente uma unidade. Um encontro equilibrado cria espaço para cada ligação, sem obrigar ninguém a candidatar-se ao casal.',
  803, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  'fbcabac7-dce5-5249-a17a-b91d985a6629', 'depois-do-primeiro-encontro-interesse-rejeicao-e-silencio', 'Depois do primeiro encontro: interesse, rejeição e silêncio', 'FIRST_MEETINGS'::"GuideCategory",
  'Clareza breve é mais cuidadosa do que ambiguidade prolongada. Ninguém deve uma relação, mas todos podem evitar deixar o outro suspenso.', $article_8_4$Depois de um encontro, envia uma confirmação básica de chegada quando foi combinado. Se precisas de tempo para decidir, diz: “Gostei de conhecer-te e quero pensar com calma; respondo até sexta”. Um prazo reduz ansiedade e obriga-te a não transformar reflexão em desaparecimento.

Se queres repetir, sê específico/a: o que apreciaste e que tipo de próximo encontro imaginas. Evita prometer intensidade que ainda não consegues sustentar. Se não queres continuar, uma mensagem curta basta: “Obrigado/a pelo encontro. Não senti a compatibilidade que procuro e prefiro não avançar. Desejo-te o melhor.”

### Rejeição não é negociação

Receber um “não” pode doer, mas não autoriza interrogatório, tentativa de persuasão ou exigência de crítica detalhada. Responde com respeito e termina. Se a pessoa oferecer feedback, decide o que aproveitas sem transformar uma preferência individual em veredicto sobre o teu valor.

### Ghosting e segurança

Em condições normais, silêncio prolongado é evitável. Mas quando houve pressão, ameaça, insulto ou medo, ninguém deve uma mensagem de encerramento. Bloquear pode ser a opção correta. A etiqueta nunca está acima da segurança.

### Casais: uma resposta coordenada

Não façam a pessoa receber três versões: entusiasmo de um, silêncio do outro e recuo conjunto dois dias depois. Conversem e enviem uma mensagem clara, mas permitam que cada um reconheça a própria experiência. Se apenas uma ligação teve interesse e o vosso modelo não o permite, digam isso sem culpar quem sentiu atração.

### Processar sem expor

Não partilhes fotografias, detalhes íntimos ou avaliações do encontro em grupos sem consentimento. Pedir conselho é legítimo; oferece apenas a informação necessária e protege identidade.

### Aplicação prática

Escolhe uma das três mensagens: continuidade, tempo ou encerramento. Não combines sinais: “não estou pronto/a, mas continua a mandar fotografias” mantém acesso sem compromisso. Se pedes tempo, define quando respondes e cumpre.

Ao receber rejeição, responde uma vez e encerra. Se tens tendência para procurar explicações, escreve as perguntas num bloco privado e espera 24 horas. Muitas não precisam de ser enviadas. A dignidade após um “não” protege a outra pessoa e também a imagem que levarás de ti para a próxima ligação.

**Leva contigo:** Rejeitar com clareza não é crueldade. Manter alguém em reserva enquanto procuras melhor é que raramente é cuidado.$article_8_4$, '◉',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Depois do primeiro encontro: interesse, rejeição e silêncio', 'Clareza breve é mais cuidadosa do que ambiguidade prolongada. Ninguém deve uma relação, mas todos podem evitar deixar o outro suspenso.',
  804, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Interesses privados: 4 artigos
+INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  'fbf2a23b-dade-564b-a2a1-06e595b62d0e', 'desejo-fantasia-e-pratica-nem-tudo-o-que-excita-precisa-de-acontecer', 'Desejo, fantasia e prática: nem tudo o que excita precisa de acontecer', 'PRIVATE_INTERESTS'::"GuideCategory",
  'Uma fantasia pode ser significativa sem ser um plano. Compreender essa diferença permite falar de desejo sem criar obrigação.', $article_9_1$Interesses privados podem incluir fantasias, papéis, fetiches, dinâmicas de poder, contextos ou formas específicas de intimidade. Ter curiosidade não determina identidade, experiência nem intenção de agir. A mente explora sem obedecer às regras logísticas do mundo real; isso não torna a fantasia falsa nem exige que seja concretizada.

Vale a pena separar três perguntas: **O que me excita imaginar? O que gostaria de explorar em condições específicas? O que quero realmente integrar na minha vida?** As respostas podem ser diferentes. Uma fantasia pode funcionar precisamente porque permanece controlada, simbólica ou impossível.

### Fetiche, kink e preferência

Os rótulos ajudam algumas pessoas a encontrar linguagem e comunidade, mas não são diagnósticos. Podes usar o termo que te fizer sentido ou descrever simplesmente o interesse. O importante é não presumir que duas pessoas com o mesmo rótulo querem a mesma prática, intensidade ou papel.

Interroga o significado pessoal: o interesse está ligado a poder, entrega, estética, sensação, novidade, validação ou narrativa? Compreender a função permite encontrar alternativas mais seguras e compatíveis. Às vezes, aquilo que se procura não é a prática literal, mas sentir confiança, ser desejado/a ou abdicar temporariamente de decisões.

### Vergonha e comparação

Não existe obrigação de ser “avançado/a” nem de acumular experiências. Uma comunidade pode substituir a norma tradicional por outra pressão: ser mais ousado, disponível ou tecnicamente conhecedor. Maturidade não se mede pela extremidade do interesse, mas pela capacidade de consentir, preparar, parar e cuidar.

Se uma fantasia envolve ausência de consentimento, risco grave ou ilegalidade, não deve ser encenada sem uma estrutura segura, limites inequívocos e, quando necessário, aconselhamento especializado. Fantasia não elimina a lei nem o consentimento real de todos os participantes.

### Curiosidade sem compromisso

Podes registar um interesse como “curioso/a” ou “talvez” e alterá-lo. Ninguém deve usar o teu perfil como prova de consentimento: “Mas disseste que gostavas” nunca substitui uma conversa atual.

### Aplicação prática

Escreve a fantasia em três versões: imaginada, possível e desejada. Na primeira, não censures. Na segunda, retira elementos impossíveis, ilegais ou não consentidos. Na terceira, identifica o que realmente queres experimentar. Muitas vezes, a essência aparece sem ser necessário reproduzir o cenário literal.

Depois classifica o interesse: identidade importante, curiosidade ocasional ou estímulo privado. Esta distinção ajuda a decidir se deve constar do perfil, ser partilhado numa relação ou permanecer pessoal. Nem tudo o que é íntimo precisa de ser público para ser legítimo.

**Leva contigo:** O teu imaginário pertence-te. Partilhá-lo é escolha; praticá-lo é outra escolha; parar continua disponível em ambas.$article_9_1$, '✷',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Desejo, fantasia e prática: nem tudo o que excita precisa de acontecer', 'Uma fantasia pode ser significativa sem ser um plano. Compreender essa diferença permite falar de desejo sem criar obrigação.',
  901, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '38c6feb2-0863-5dda-88c0-a43f77942223', 'como-partilhar-um-interesse-sem-pressionar-quem-o-ouve', 'Como partilhar um interesse sem pressionar quem o ouve', 'PRIVATE_INTERESTS'::"GuideCategory",
  'Revelar um desejo é um ato de confiança. A forma segura cria espaço para curiosidade, neutralidade ou recusa — sem transformar a resposta num teste de amor.', $article_9_2$Escolhe um momento calmo, fora da intimidade e sem urgência. Começa por definir o pedido: queres apenas ser ouvido/a, explorar em conversa ou propor uma experiência? “Quero partilhar uma fantasia, sem expectativa de a fazermos” retira peso desnecessário.

Fala em nome próprio. Descreve o que te atrai e o que não sabes ainda. Evita preparar a revelação como confissão de algo terrível; isso obriga a outra pessoa a tranquilizar-te antes de processar. Também não a transformes numa prova: “Se fores mesmo aberto/a, vais aceitar”.

### Dar três respostas possíveis

Explicita que “sim”, “não” e “preciso de pensar” são respostas válidas. Quem ouve pode ter perguntas, desconforto ou nenhuma curiosidade. Uma reação inicial não é necessariamente a decisão final, mas deve ser respeitada no presente.

Se houver interesse, avancem para significado e limites antes da logística. O que cada pessoa imagina quando ouve o mesmo termo? Que partes atraem e quais assustam? O que teria de ser excluído? Muitas incompatibilidades aparentes são diferenças de definição; outras são limites reais que não precisam de solução.

### Quando a resposta é não

Não tentes vender uma versão “mais leve” imediatamente. Aceita e pergunta apenas se a pessoa quer explicar ou prefere encerrar o tema. Um parceiro pode apoiar que tenhas um desejo sem querer participar nele. O passo seguinte depende do modelo relacional e dos acordos existentes, não de pressão.

### Privacidade da revelação

Um interesse partilhado em confiança não deve virar anedota, argumento numa discussão ou informação para amigos. Se precisares de aconselhamento, anonimiza e, idealmente, combina antes o que pode ser partilhado.

### Aplicação prática

Pede consentimento para a conversa antes de revelar detalhes: “Tens disponibilidade para ouvir algo íntimo durante dez minutos?”. Se a resposta for não, combina outro momento. Isto impede que a outra pessoa receba conteúdo intenso quando está cansada, em público ou sem capacidade emocional.

Depois da partilha, não procures imediatamente conclusão. Pergunta: “Queres fazer perguntas, pensar ou encerrar por hoje?”. A pessoa pode precisar de pesquisar ou perceber a própria reação. Uma pausa respeitada vale mais do que um sim rápido dado para aliviar a tua vulnerabilidade.

**Frase possível:** “Há algo que me desperta curiosidade. Não quero que sintas obrigação e não preciso de resposta hoje. Posso contar-te?”

**Leva contigo:** Revelar vulnerabilidade não dá direito a uma resposta favorável. Dá oportunidade a uma conversa honesta.$article_9_2$, '✷',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Como partilhar um interesse sem pressionar quem o ouve', 'Revelar um desejo é um ato de confiança. A forma segura cria espaço para curiosidade, neutralidade ou recusa — sem transformar a resposta num teste de amor.',
  902, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  'a5a13cb4-37da-58c9-a739-2a555aad029f', 'lista-sim-nao-talvez-transformar-rotulos-em-decisoes-concretas', 'Lista Sim, Não, Talvez: transformar rótulos em decisões concretas', 'PRIVATE_INTERESTS'::"GuideCategory",
  'Uma lista de compatibilidade é o início da conversa, não um menu de serviços nem uma autorização antecipada.', $article_9_3$A ferramenta “Sim, Não, Talvez” ajuda cada pessoa a refletir individualmente antes de negociar. Para cada interesse ou prática, marca **sim**, **não**, **talvez** ou **não sei o suficiente**. Acrescenta condições: com quem, em que contexto, intensidade, privacidade, saúde, linguagem e cuidados posteriores.

Façam a lista separadamente para reduzir influência. Depois comparem apenas interseções relevantes. Um “sim” de uma pessoa e um “talvez” de outra continua a ser talvez; um “não” encerra aquela possibilidade no momento. Não se contam votos.

### Tornar o talvez útil

“Talvez” pode significar coisas diferentes:

- tenho curiosidade, mas preciso de informação;
- só com confiança maior;
- apenas numa versão específica;
- quero imaginar, não praticar;
- não sei dizer não diretamente.

Pergunta o que está por trás sem empurrar para o sim. Se uma pessoa usa “talvez” por medo de desapontar, a tarefa é aumentar segurança para recusar.

### Falar de condições observáveis

Evitem palavras vagas como “com cuidado” ou “sem exageros”. Definam sinais e ações: duração curta, ausência de substâncias, palavra de paragem, check-ins, proteção, nenhuma fotografia, possibilidade de sair sem discussão. Quanto maior o risco físico ou emocional, mais concreta deve ser a preparação.

### A lista envelhece

Revejam depois de experiências, mudanças de saúde, novos parceiros ou simplesmente tempo. Não usem uma versão antiga como contrato. Um “sim” é compatibilidade potencial; o consentimento acontece no momento e pode terminar no momento seguinte.

Num perfil, seleciona interesses ao nível de detalhe que te deixa confortável. A correspondência serve para iniciar conversa, não para permitir abordagem explícita imediata. Pergunta antes de entrar em detalhes.

### Aplicação prática

Acrescenta duas colunas à lista: “o que tornaria mais seguro” e “como paro”. Para cada talvez, escreve uma condição observável. “Com confiança” é vago; “depois de vários encontros, sóbrio/a e com palavra de paragem” pode ser negociado.

Compare apenas itens onde existe alguma compatibilidade e celebrem os nãos claros: poupam testes e ressentimento. Se uma pessoa tem poucos sins, não tentem equilibrar a lista. A ferramenta mede disponibilidade atual, não entusiasmo, experiência ou amor. Uma lista curta pode ser exatamente a mais honesta.

**Leva contigo:** A lista organiza linguagem. Não substitui confiança, conhecimento técnico, consentimento atual nem capacidade de parar.$article_9_3$, '✷',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Lista Sim, Não, Talvez: transformar rótulos em decisões concretas', 'Uma lista de compatibilidade é o início da conversa, não um menu de serviços nem uma autorização antecipada.',
  903, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "guide_articles" (
  "id", "slug", "title", "category", "summary", "body", "icon", "authorId",
  "published", "publishedAt", "readingTime", "locale", "seoTitle", "seoDescription",
  "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  '72e10cbd-91a8-5952-81b1-bc15be37dceb', 'explorar-com-consciencia-de-risco-preparacao-sinais-e-cuidados-posteriores', 'Explorar com consciência de risco: preparação, sinais e cuidados posteriores', 'PRIVATE_INTERESTS'::"GuideCategory",
  'Segurança não significa fingir que uma prática não tem risco. Significa conhecê-lo, reduzi-lo, reconhecer sinais e ter um plano de resposta.', $article_9_4$Interesses que envolvem restrição, impacto, poder, dor, substâncias, exposição ou intensidade emocional exigem preparação proporcional. Não copies uma prática apenas porque a viste num vídeo. Conteúdo performativo pode omitir negociação, pausas, experiência e medidas de segurança.

Antes de explorar, procura informação credível e específica, aprende contraindicações e combina o que fica fora. Em práticas com risco físico relevante, formação presencial com pessoas qualificadas pode ser mais adequada do que instruções online. Se existe condição médica, medicação, gravidez ou dúvida, consulta um profissional de saúde sem vergonha e com informação suficiente.

### Consentimento em dinâmicas de poder

Uma encenação de controlo continua assente em controlo real de todos sobre a sua participação. Definam palavra ou sinal de paragem, incluindo alternativa não verbal. A pessoa com papel dominante tem responsabilidade acrescida de observar, confirmar e parar; o papel nunca justifica ignorar um limite.

Evitem estreias sob álcool ou substâncias. A combinação reduz avaliação, comunicação e resposta a sinais físicos. Não explorem práticas novas com alguém que ridiculariza preparação ou afirma que “um verdadeiro praticante aguenta”.

### Sinais de paragem

Para além de uma palavra acordada, parem perante confusão, perda de resposta, dificuldade respiratória, alteração súbita de cor, dor inesperada, pânico, desorientação ou qualquer sensação de que algo não está certo. Não tentem diagnosticar no momento para decidir se “vale a pena continuar”. Em emergência, acionem ajuda adequada.

### Cuidados posteriores

Depois, algumas pessoas querem contacto físico, água, comida, calor, silêncio, validação ou espaço. Combinem preferências e façam check-in mais tarde, porque a reação emocional pode surgir horas depois. Cuidado posterior não apaga uma quebra de limite; se algo correu mal, é preciso reconhecer e reparar.

### Aprender sem transformar em culpa

Revejam: o que funcionou, o que surpreendeu, que sinais foram claros e o que não se repete. Curiosidade responsável inclui a possibilidade de concluir “não é para mim”.

### Aplicação prática

Antes de uma prática nova, façam um briefing de cinco pontos: objetivo, limites, sinal de pausa, risco principal e resposta se algo correr mal. Confirmem material, comunicação e estado físico. Se ninguém consegue explicar o risco em linguagem simples, falta preparação.

Depois, registem apenas o necessário: sensação física, resposta emocional e melhoria para a próxima vez. Não transformem o debriefing numa avaliação de desempenho. A pergunta central é “mantivemos capacidade real de escolher e parar?”. Técnica sem consentimento é perigo; consentimento sem conhecimento de risco também não chega.

**Leva contigo:** Quanto mais intensa a experiência, menos espaço existe para improvisar os fundamentos.$article_9_4$, '✷',
  COALESCE(
    (SELECT "id" FROM "users" WHERE LOWER("email") = 'ricardo.jgvf@gmail.com' LIMIT 1),
    (SELECT "id" FROM "users" WHERE LOWER(COALESCE("accountName", '')) = 'ricardo ferreira' LIMIT 1),
    (SELECT "id" FROM "users" WHERE "adminRole" = 'SUPER_ADMIN'::"AdminRole" ORDER BY "createdAt" ASC LIMIT 1)
  ),
  TRUE, CURRENT_TIMESTAMP, 2, 'pt', 'Explorar com consciência de risco: preparação, sinais e cuidados posteriores', 'Segurança não significa fingir que uma prática não tem risco. Significa conhecê-lo, reduzi-lo, reconhecer sinais e ter um plano de resposta.',
  904, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "category" = EXCLUDED."category",
  "summary" = EXCLUDED."summary",
  "body" = EXCLUDED."body",
  "icon" = EXCLUDED."icon",
  "authorId" = COALESCE(EXCLUDED."authorId", "guide_articles"."authorId"),
  "published" = TRUE,
  "publishedAt" = COALESCE("guide_articles"."publishedAt", CURRENT_TIMESTAMP),
  "readingTime" = EXCLUDED."readingTime",
  "locale" = 'pt',
  "seoTitle" = EXCLUDED."seoTitle",
  "seoDescription" = EXCLUDED."seoDescription",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Remove apenas os oito conteúdos curtos do seed beta que esta coleção
-- substitui. Artigos criados por utilizadores fora desta lista são preservados.
DELETE FROM "guide_articles"
WHERE "slug" IN (
  'como-definir-limites-em-casal',
  'privacidade-digital-principios-basicos',
  'consentimento-pode-mudar',
  'primeiro-encontro-seguranca',
  'como-criar-um-perfil-de-confianca',
  'poliamor-vocabulario-essencial',
  'relacoes-abertas-conversas-dificeis',
  'fetiches-privados-como-funciona'
);
