# Internacionalização — Fase 2

## Objetivo

Completar a internacionalização que ficou deliberadamente fora do PR #19, mantendo o trabalho dividido em blocos pequenos, verificáveis e fáceis de rever.

## Princípios

- Português de Portugal (`pt-PT`) é o idioma predefinido e o fallback obrigatório.
- Inglês (`en`) e Francês (`fr`) são os restantes idiomas suportados.
- Slugs, enums, IDs, permissões e contratos técnicos da API não são traduzidos.
- Textos de interface são resolvidos por chaves estáveis no cliente.
- Conteúdo editorial criado por administradores continua a ser tratado como dados, não como texto fixo da aplicação.
- Entradas de catálogo desconhecidas usam como fallback o nome ou descrição devolvidos pelo backend.
- Cada bloco deve manter Prisma, typecheck, build, gitleaks e Playwright verdes.

## Bloco 1 — Catálogos dos formulários de perfil

Estado: implementado.

- Intenções traduzidas por `slug`.
- Géneros traduzidos por `slug`.
- Orientações traduzidas por `slug`.
- Limites traduzidos por `slug`.
- Categorias dos limites traduzidas pela chave técnica existente.
- Integração concluída em `CreateProfilePage.jsx` e `EditProfilePage.jsx`.
- Valores enviados ao backend permanecem inalterados.
- Entradas futuras ou personalizadas continuam visíveis através do fallback para o texto do backend.

## Próximos blocos

1. Aplicar as traduções de intenções aos fluxos de casal e restantes superfícies de perfil.
2. Introduzir códigos semânticos para erros e estados do backend atualmente dependentes de frases portuguesas.
3. Internacionalizar a área administrativa.
4. Normalizar a suite backend global e separar falhas preexistentes de regressões.
5. Adicionar testes de catálogos, fallback, administração e deteção de texto fixo.
