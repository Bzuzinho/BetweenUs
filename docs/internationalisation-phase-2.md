# Internacionalização — Fase 2

Esta fase continua o trabalho aplicado no PR #19, mantendo o escopo separado da internacionalização principal da aplicação.

## Objetivos

1. Internacionalizar os catálogos devolvidos pelo backend:
   - intenções;
   - géneros;
   - orientações;
   - limites;
   - categorias;
   - regras e descrições configuráveis.

2. Substituir mensagens de erro e estado dependentes de texto por códigos semânticos estáveis, resolvidos no cliente conforme o idioma ativo.

3. Internacionalizar a área administrativa, preservando nomes técnicos, enums, slugs, permissões e valores enviados à API.

4. Normalizar a suite backend global e separar falhas preexistentes de regressões introduzidas por alterações futuras.

## Princípios

- Idiomas suportados: Português de Portugal (`pt-PT`), Inglês (`en`) e Francês (`fr`).
- Fallback obrigatório para `pt-PT`.
- Slugs, enums, IDs e contratos da API não são traduzidos.
- O backend deve devolver valores técnicos estáveis e, quando necessário, códigos semânticos em vez de frases portuguesas.
- A localização dos textos de interface deve permanecer no cliente, exceto conteúdo editorial ou administrativo armazenado como dados.
- Alterações a catálogos devem manter compatibilidade com dados e perfis existentes.

## Validação prevista

- Prisma validate e geração do Prisma Client.
- Typecheck backend.
- Build frontend.
- Testes dos códigos semânticos e respetivo fallback.
- Testes dos catálogos nos três idiomas.
- Smoke tests da área administrativa.
- Deteção automatizada de novos textos fixos em superfícies internacionalizadas.
