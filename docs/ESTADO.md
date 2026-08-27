# Estado do projeto — retomada

Última atualização: 15/08/2026. Interrompido por **limite de sessão da conta**
(reseta 4:30, America/Asuncion), não por problema técnico.

## Pronto e verificado

| Peça | Arquivo | Verificação |
|---|---|---|
| Pipeline de conteúdo | `tools/build-content.mjs` | Rodou: 1.503 docs, 9 disciplinas, 3.122 mídias |
| Config de currículo | `tools/curriculum.config.json` | **Editável pelo dono** — ver abaixo |
| Tokens de design | `src/styles/tokens.css` | Paleta medida, 11 acentos em AAA (7,02–7,86:1) |
| Reset + tipografia | `src/styles/base.css` | |
| Camada de dados | `src/lib/dados.js` | Hooks, seletores, busca, rotas |
| Shell + nav esquerda | `src/components/Shell.{jsx,css}` | Árvore contextual, busca com `/`, trilha, mobile |
| Ícones | `src/components/Icones.jsx` | 16 artefatos + 13 de interface |
| Carregando/Esqueleto | `src/components/Carregando.{jsx,css}` | |
| Dossiê de referências | `docs/REFERENCE-DOSSIER.md` | 543 linhas, valores medidos ao vivo |
| Briefing dos workers | `docs/BRIEFING-WORKERS.md` | Contrato compartilhado |

`npx vite build` **passa** (4,3s).

## O bug das imagens: resolvido

Causa raiz: o vault usa embed Obsidian `![[arquivo.png]]`, que o `marked` não
entende. O portal antigo mapeava 64 de 3.297 imagens à mão (~2%).

Segunda causa, maior: **o banco de imagens real não está no vault** — está em
`G:\Meu Drive\MED-Imagens` (6.443 arquivos). O pipeline agora indexa as duas
raízes.

| | antes | agora |
|---|---|---|
| Imagens reais resolvidas | 1.082 (18,5%) | **4.534 (77,5%)** |
| Figuras descritas | — | 611 (10,4%) |
| Órfãs | 2.511 (42,9%) | **707 (12,1%)** |
| Embeds mostrando algo | 57,1% | **87,9%** |

"Figura descrita" = o vault tem 4.892 notas que descrevem uma figura de livro
em detalhe (título, fonte, capítulo, página) sem que a imagem exista. Os PDFs
de origem também não estão. Em vez de imagem quebrada, o pipeline promove a
descrição a conteúdo: `figure.mv-fig--descrita`.

## A linguagem de design: Prancha

Ver `docs/LINGUAGEM-PRANCHA.md`. **Ela manda mais que o dossiê de referências.**

Resumo: em vez de imitar Stripe/Linear/Apple (que resolvem problemas de
tecnologia), a linguagem vem da **prancha de atlas anatômico** — Bourgery,
Gray, Netter. Papel creme, tinta profunda, figura numerada com legenda pareada,
fio fino em vez de caixa, densidade alta sem fadiga. É autenticamente médica,
ninguém na web usa, e resolve de graça o nosso problema mais estranho: numa
prancha, a legenda sempre foi artefato de primeira classe — então "figura
descrita sem imagem" é forma legítima, não erro.

Implementada em `src/styles/conteudo.css` (estilo de todo HTML do vault).

## Correção aplicada depois da primeira rodada

**`<h1>` duplicado em 1.462 dos 1.503 documentos.** O título aparecia no
cabeçalho da página E de novo no corpo — quebra a árvore de cabeçalhos para
leitor de tela e duplica o título na tela. Corrigido em duas camadas:
remoção do H1 de abertura no markdown, e rebaixamento de qualquer H1
remanescente para H2 no HTML. Reverificado: **0 vazamentos**.

## Bugs encontrados POR OLHAR, e corrigidos

Nenhum destes apareceu no build — todos passavam compilação.

| # | Defeito | Causa raiz | Estado |
|---|---|---|---|
| 1 | `<h1>` duplicado em 1.462 de 1.503 docs | título saía no cabeçalho E no corpo | corrigido, reverificado: 0 |
| 2 | Renderer **congelava ao rolar** | `backdrop-filter: blur()` no cabeçalho fixo obrigava o compositor a re-borrar a cada quadro | removido; scroll fluido |
| 3 | Re-render a cada evento de ponteiro/scroll | `setState` em `pointermove` e `scroll` — 60–120×/s, re-renderizando árvore com o documento inteiro | trocado por escrita direta no DOM via `requestAnimationFrame` |
| 4 | Vão de 7rem no meio do texto | `.mv-prancha` é grid, e **grid não colapsa margens**: `margin-bottom` somava com `margin-top` | ritmo passou a vir de `row-gap` |
| 5 | Temas duplicados na navegação | slug vinha da pasta OU do nome do arquivo → mesmo tema, dois slugs | slug agora é sempre `tema-NN`; Semio P1 caiu de 16→11 temas, P2 de 18→9, 0 duplicatas |
| 6 | Rodapé dizia 9 disciplinas, herói dizia 8 | um contava o balde "Outros" como matéria | ambos contam 8 |

## Marca: resolvida

**"O Fólio"** — ver `docs/MARCA.md`, prova visual em `docs/prova-marca.html`.

Volume encadernado de frente: lombada sólida + três réguas decrescentes que
são as camadas da hierarquia (disciplina → parcial → tema). Implementada em
`src/components/Logo.jsx`; favicon em `public/favicon.svg`.

Duas alternativas salvas em `src/components/Logo.alternativas.jsx`, prontas
para troca de uma linha: **O Vinco** (mais reconhecível, mas lê como letra) e
**A Chave** (mais original, maior risco).

O teste de renderização mudou a nota de duas das três direções. A primeira
versão d'A Chave lia como **colcheia** em 96px — ponto redondo mais haste
vertical. Nenhum argumento conceitual sobrevive a isso; foi revisada com
quadrado e barra de rótulo.

## Estado das páginas

**Todas as 11 são reais** (nenhum stub). `npx vite build` passa em ~12s.

Verificadas visualmente no browser: Disciplinas, Disciplina, Parcial, Tema,
Leitura. **Não verificadas visualmente**: Início, Biblioteca, Busca, Agenda,
Contribuir, NaoEncontrado — compilam e foram escritas contra os mesmos
contratos, mas ninguém as abriu ainda.

## Falta fazer Os 6 workers foram despachados com
briefing completo e morreram antes de escrever qualquer arquivo.

| Worker | Arquivos que possui |
|---|---|
| Leitura ← **maior valor** | `paginas/Leitura.{jsx,css}`, `styles/conteudo.css`, `components/Lightbox.{jsx,css}` |
| Disciplinas (3D) | `paginas/Disciplinas.{jsx,css}`, `components/Volume3D.{jsx,css}` |
| Drill-down | `paginas/{Disciplina,Parcial,Tema}.{jsx,css}`, `components/CartaoArtefato.{jsx,css}` |
| Home | `paginas/Inicio.{jsx,css}` |
| Marca/logo | `components/Logo.{jsx,css}`, `docs/MARCA.md`, `public/favicon.svg` |
| Biblioteca+Busca | `paginas/{Biblioteca,Busca}.{jsx,css}`, `components/Filtros.{jsx,css}` |

Ainda **não despachados** (dependem de decisão do dono ou de credencial):

| Worker | Escopo | Bloqueio |
|---|---|---|
| Auth Supabase | `lib/auth.js`, `components/Conta.*` | Precisa projeto Supabase + chaves |
| Contribuir/upload | `paginas/Contribuir.*` + watcher local | Idem, e definir o caminho do Drive |
| Agenda | `paginas/Agenda.*` | Precisa do Supabase para ser compartilhada |
| Estados/movimento | `paginas/NaoEncontrado.*`, `components/Movimento.jsx` | — |

Depois disso: **loop de crítica cega** contra
`https://developer.apple.com/design/human-interface-guidelines/typography`
(adversário escolhido pelo curador), até 10 rodadas.

## Pendências para o dono

1. ~~Mapa disciplina→período~~ **RESOLVIDO em 15/08/2026.** O dono confirmou:
   Biologia Geral = 1º período, todas as demais = 7º, turma atualmente no 8º.
   Aplicado em `tools/curriculum.config.json` e no índice
   (`indice.periodoAtual === 8`). Para mudar no futuro, é só esse arquivo.
2. **Supabase** — criar projeto, ativar login Google, passar URL e anon key.
3. **Caminho do Drive** — o dono citou `G:\Meu Drive\ClaudeSync` para receber
   os envios. Caminho local do cliente do Drive; o site não escreve nele
   direto. Plano: envio → Supabase Storage → watcher local sincroniza pra lá.
4. **`public/media` está com 357 MB.** Cabe no GitHub Pages mas é pesado.
   Baixar `LARGURA_MAX` de 1600 para 1400 e a qualidade webp de 82 para 76 em
   `build-content.mjs` deve cortar perto da metade.

## Comandos

```bash
cd "E:/Work/Obsidian Claud/Med Test/MedVault-Elite"
npm run dev              # http://localhost:5180
npx vite build           # tem que passar
npm run build:content    # ~6 min (lê o Drive) — só quando o vault mudar
```
