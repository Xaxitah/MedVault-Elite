# MedVault

Portal de estudos do grupo de medicina. Resumos, mapas mentais, flashcards,
questões, podcasts e infográficos organizados por disciplina, período, parcial
e tema.

**Colocar no ar:** `docs/DEPLOY.md` — Worker de assets estáticos + Cloudflare Access

## O que tem dentro

| | |
|---|---|
| Documentos | 1.503 |
| Disciplinas | 8 (+ material a classificar) |
| Figuras | 5.145 |
| Origem | vault Obsidian + banco de imagens no Google Drive |

## Rodar aqui

```bash
npm install
npm run build:content   # lê o vault e o Drive (~5 min)
npm run dev             # http://localhost:5180
```

`build:content` só precisa rodar quando o vault muda.

## Como está organizado

```
tools/build-content.mjs      vault -> JSON + HTML + imagens
tools/curriculum.config.json mapa disciplina -> período  (EDITE AQUI)
src/styles/tokens.css        cores, tipografia, espaçamento — fonte única
src/styles/conteudo.css      estilo de todo HTML vindo do vault
src/lib/dados.js             carregamento e busca
src/lib/backend.js           adaptador: modo local ou Supabase
```

## Documentação

| Arquivo | Para quê |
|---|---|
| `docs/DEPLOY.md` | publicar o site |
| `docs/BACKEND.md` | ligar contas, agenda e envios (Supabase) |
| `docs/LINGUAGEM-PRANCHA.md` | a linguagem de design e o porquê dela |
| `docs/MARCA.md` | a logo, as alternativas guardadas, regras de uso |
| `docs/RODADAS-CRITICO.md` | teste cego contra referência + pendências abertas |
| `docs/REFERENCE-DOSSIER.md` | pesquisa de referências, com valores medidos |
| `docs/ESTADO.md` | onde o trabalho parou |

## Duas coisas que valem saber

**As imagens moram fora do vault.** O banco real está em
`G:\Meu Drive\MED-Imagens` (6.443 arquivos), não dentro do Obsidian. O pipeline
indexa as duas raízes; sem o Drive montado, a maioria das figuras some.

**O conteúdo gerado não está no git.** `public/data/` e `public/media/` somam
~324 MB e são reproduzíveis com `npm run build:content`. Ficam fora do
histórico de propósito, e o deploy os envia direto para a Cloudflare.
