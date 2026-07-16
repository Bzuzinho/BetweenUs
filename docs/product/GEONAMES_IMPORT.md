# Import do catálogo GeoNames — runbook

> Ver `LOCATION_SYSTEM.md` para a arquitectura completa. Este documento é só o "como correr
> isto", incluindo a limitação de rede conhecida neste ambiente de desenvolvimento.

## Atribuição (obrigatória — licença CC BY 4.0)

Os dados de localidades vêm de [GeoNames](https://www.geonames.org/), disponibilizados sob
[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Qualquer
superfície pública que mostre ou derive destes dados (ex.: uma página "Sobre"/"Créditos" da
aplicação, se vier a existir) deve incluir uma atribuição visível a "GeoNames.org", com
link para https://www.geonames.org/.

## O que o script faz

`server/src/scripts/importGeoNames.ts` lê o dump principal de um país (formato GeoNames, 19
colunas separadas por tab, sem cabeçalho — ver `readme.txt` do próprio GeoNames), filtra
para "populated places" (`featureClass === 'P'`, `featureCode` numa allowlist de 9 códigos —
ver `LOCATION_SYSTEM.md`), e faz upsert de cada linha na tabela `geo_locations` por
`geonamesId` (idempotente — correr duas vezes produz o mesmo estado final).

Os ficheiros auxiliares `admin1CodesASCII.txt`/`admin2Codes.txt` (também do GeoNames)
resolvem `admin1Name`/`admin2Name` (nome de distrito/concelho) a partir dos códigos que vêm
no dump principal — são **opcionais**: sem eles, o import continua, `admin1Name`/
`admin2Name` ficam `null` nas linhas afectadas, e isso é reportado explicitamente no resumo
final (nunca escondido).

## Uso

```bash
# 1) Dry-run — mostra o que seria importado, nunca escreve na BD
npm run geo:import -- --country=PT --dry-run

# 2) Import real (upsert — idempotente, seguro correr outra vez)
npm run geo:import -- --country=PT

# 3) --replace: além do upsert, desactiva (nunca apaga) localidades desse
#    país que já estavam na BD mas já não aparecem na fonte desta corrida
#    (ex.: uma re-importação depois do GeoNames remover/fundir uma entrada)
npm run geo:import -- --country=PT --replace

# 4) Apontar para um ficheiro específico (fora da pasta por omissão)
npm run geo:import -- --country=PT --file=/caminho/para/PT.txt

# 5) Descarregar automaticamente (ver limitação de rede abaixo)
npm run geo:import -- --country=PT --download

# Estatísticas do catálogo já importado
npm run geo:stats
```

Sem `--file` nem `--download`, o script procura em `server/data/geonames/{PAIS}.txt` (pasta
ignorada pelo Git — **nunca comitar dumps do GeoNames no repositório**; o repositório só
precisa do resultado do import, a tabela `geo_locations`, não da fonte em bruto). Os
ficheiros `admin1CodesASCII.txt`/`admin2Codes.txt`, se existirem, são procurados na mesma
pasta.

## Passo a passo manual (recomendado, sempre funciona)

1. Ir a https://download.geonames.org/export/dump/ e descarregar `PT.zip` (ou o país
   pretendido), mais opcionalmente `admin1CodesASCII.txt` e `admin2Codes.txt` (na raiz do
   mesmo directório de download, não dentro de subpastas por país).
2. Descomprimir `PT.zip` → `PT.txt`.
3. Colocar `PT.txt` (e os dois ficheiros admin, se descarregados) em
   `server/data/geonames/`.
4. Correr `npm run geo:import -- --country=PT --dry-run` para conferir o resumo antes de
   escrever.
5. Correr `npm run geo:import -- --country=PT` para importar a sério.
6. Correr `npm run geo:stats` para confirmar a contagem final.

## Limitação de rede conhecida neste ambiente de desenvolvimento

Confirmado nesta sessão: `download.geonames.org` está bloqueado pela allowlist de rede
deste sandbox (`403 Forbidden`, `X-Proxy-Error: blocked-by-allowlist`), testado tanto em
`https://www.geonames.org` como em `http://download.geonames.org/export/dump/PT.zip`. Por
isso:

- **`--download` não funciona neste sandbox** — falha explicitamente com uma mensagem a
  apontar para o passo a passo manual acima, nunca falha silenciosamente nem finge sucesso.
- **Nenhum import real foi executado nesta sessão.** O script foi escrito e revisto, mas
  nunca corrido contra dados reais aqui — a tabela `geo_locations` está vazia em qualquer
  base de dados que só tenha corrido as migrations desta sessão, até alguém correr o import
  num ambiente com acesso de rede a `download.geonames.org` (produção/Railway, ou uma
  máquina de desenvolvimento local sem esta restrição).
- Em produção (Railway) ou numa máquina de desenvolvimento sem allowlist restrito,
  `--download` deve funcionar normalmente — mas isso não foi verificado aqui, só o passo a
  passo manual está confirmado como caminho garantido.

## Resultado esperado (não verificado nesta sessão)

Um import de Portugal com a allowlist de feature codes usada aqui tipicamente ronda várias
dezenas de milhares de localidades (o próprio GeoNames lista uns milhares de entradas na
categoria `P` só para Portugal, a maioria concelhos/freguesias/lugares). **Este número é uma
estimativa geral do GeoNames, não uma contagem verificada por este import** — a contagem
exacta só fica disponível depois de alguém correr `npm run geo:import -- --country=PT`
seguido de `npm run geo:stats` num ambiente com acesso à fonte.

## Depois do import: migrar perfis existentes

Ver `LOCATION_SYSTEM.md#migração-de-perfis-existentes` —
`npm run geo:audit-profiles` (auditoria, só leitura) e depois
`npm run geo:map-profiles -- --dry-run` (simulação) →
`npm run geo:map-profiles` (aplica, nunca resolve ambiguidade sozinho).
