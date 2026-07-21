# Decomposição e internacionalização da área administrativa

## Objetivo

Aplicar o catálogo trilingue já existente ao painel administrativo e reduzir progressivamente o `AdminPage.jsx`, atualmente com cerca de 3.700 linhas, sem alterar permissões, rotas, contratos da API ou comportamento funcional.

## Escopo deste PR

1. Extrair o shell administrativo para componentes pequenos:
   - navegação e tabs;
   - cabeçalho e menu de conta;
   - notificações e fila de trabalho;
   - estado de serviço;
   - modais e estados comuns.
2. Integrar `useI18n` e o catálogo `adminTranslations` nesses componentes.
3. Extrair os separadores funcionais por blocos independentes.
4. Internacionalizar cada separador em `pt-PT`, `en` e `fr`.
5. Adicionar testes de regressão, paridade de traduções e deteção de textos fixos.

## Restrições

- Não alterar permissões por função.
- Não alterar URLs administrativas.
- Não alterar payloads ou contratos de sucesso da API.
- Preservar auditoria, notificações e contagens de fila.
- Fazer alterações incrementais com CI verde entre blocos.

## Ordem recomendada

1. Shell comum.
2. Dashboard.
3. Reports e moderação visual.
4. Perfis, utilizadores e verificações.
5. Conversas e auditoria.
6. Beta e configurações.
7. Deteção automática de textos fixos remanescentes.

## Critérios de conclusão

- O shell e todos os separadores administrativos usam `useI18n`.
- Não existem textos de interface fixos em português nas superfícies abrangidas.
- PT-PT é o fallback obrigatório.
- Build, testes backend direcionados e Playwright passam.
- O `AdminPage.jsx` deixa de concentrar a maioria da lógica e apresentação do painel.
