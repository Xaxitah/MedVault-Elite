# Briefing — leia antes de escrever qualquer linha

Você é um dos ~10 agentes construindo o MedVault em paralelo. Este documento é o
contrato entre nós. Divergir dele quebra o trabalho de outra pessoa.

---

## O produto

Portal de estudos de um grupo de medicina. Conteúdo em português com termos
médicos em espanhol (o curso é em espanhol — isso é normal, não é erro de
digitação, não "conserte").

Hierarquia: **Disciplina → Período → Parcial → Tema → Artefatos**
Artefatos: resumos, revisão de véspera, mapas mentais, flashcards, questões,
quiz, podcast, infográficos, vídeos, slides, tabelas, provas antigas.

## LEIA `docs/LINGUAGEM-PRANCHA.md` — é a nossa linguagem de design

**Ela manda mais que qualquer referência externa.** Quando o dossiê e a Prancha
discordarem, a Prancha ganha; o dossiê é insumo, não lei.

O dono disse "não tenho ideia de padrão, vamos criar o nosso". Então criamos.
Em vez de imitar Stripe/Linear/Apple — que resolvem problemas de tecnologia —
a linguagem vem da **prancha de atlas anatômico** (Bourgery, Gray, Netter):
papel creme, tinta profunda, figura numerada com legenda pareada, fio fino em
vez de caixa, densidade alta sem fadiga.

Os três princípios que mais decidem o seu trabalho:

- **O fio antes da caixa.** Hierarquia por fio fino e espaço, NUNCA por caixa.
  Se precisa separar duas coisas: primeiro espaço, depois um fio; caixa é
  último recurso e exige justificativa. Card com borda E sombra E fundo
  colorido é proibido.
- **Cor é etiqueta, nunca decoração.** O pigmento da disciplina aparece só onde
  identifica: fio de seção, chip, marcador, número de figura. Fundo de leitura
  é papel em toda página do site.
- **Densidade é respeito.** O usuário está estudando para uma prova, não
  passeando. Quer muita informação legível de uma vez — o oposto de três cards
  com uma frase cada. Densidade alta COM hierarquia clara.

Já implementada em `src/styles/conteudo.css` e `src/paginas/Leitura.{jsx,css}`
— leia os dois antes de começar. São o exemplo de referência do que se espera.

## A barra de qualidade

O dono foi explícito: **não pode ser "bom o suficiente"**. A referência é site
profissional de elite. Um crítico cego vai comparar seu trabalho lado a lado
com um site real de referência e escolher qual é melhor. Se a referência
ganhar, seu trabalho volta pro início do ciclo.

Direção estética, nas palavras dele: tons **pastéis**, moderno, **dinâmico e
animável**, navegação **à esquerda**, leitura que **não canse**.

Ele citou https://press.stripe.com/the-big-score como inspiração, mas achou
**pesado**. Queremos as MECÂNICAS dela num registro claro:
- objetos 3D imersivos que respondem ao scroll
- encenação cinematográfica (mas em luz, não em preto)
- tipografia editorial: serifada para leitura, sem-serifa para interface
- navegação vertical com indicador de progresso
- seções com cor própria por item

---

## Fundação já construída — CONSUMA, não reinvente

### `src/styles/tokens.css` — leia inteiro antes de começar

**Nenhum componente escreve hex, tamanho de fonte, duração ou sombra na mão.**
Se falta um valor, o certo é adicionar token, não driblar.

A tese cromática: pastel só funciona como **tinta clara de um pigmento real**.
A paleta foi gerada em OKLCH com ajuste de gamut e **todas as razões de
contraste foram calculadas**, não estimadas. Cada disciplina tem cinco papéis:

| token | papel | regra |
|---|---|---|
| `--acento-ink` | texto, título, ícone sobre claro | 7.02–7.86:1 no papel — **AAA** |
| `--acento-mid` | ícone, marca de gráfico, barra ≥3px | 3.73–4.26:1 — **NUNCA carrega texto** |
| `--acento-tint` | fundo de bloco, chip, callout | `--mv-ink-body` em cima dá 9.5:1+ |
| `--acento-hair` | borda sobre o tint | |
| `--acento-glow` | halo de foco, profundidade | |

**A regra que mais pega gente:** `mid` reprova no limiar de 4.5:1 de texto.
Ícone pode, texto não. Texto sempre `ink`.

**Cor nunca é o único canal.** Simulação de deuteranopia mostra `petroleo` e
`eucalipto` colapsando um no outro. Todo chip de disciplina precisa de glifo
**e** rótulo de texto — nunca só a cor.

**Não tinja o fundo da página de leitura por disciplina.** O acento aparece na
nav, no herói, nas réguas de seção, nos chips e nos callouts; o fundo do artigo
é `--mv-ground` em todas as páginas. É essa disciplina que impede 11 cores de
virarem circo.

Fundo é **papel quente** (`--mv-ground: #FAF7F1`). Nunca `#fff` puro (deixa o
pastel sujo) nem cinza-azulado (vira painel corporativo). Sombras têm matiz
quente — sombra cinza sobre papel quente parece sujeira.

Trocar acento: `data-acento="anil"` em qualquer container recolore toda a
subárvore. Não escreva CSS por disciplina.

### Tipografia — três famílias, papéis que não se sobrepõem
- `--mv-fonte-display` (Fraunces) — só display: herói, título de disciplina, números grandes
- `--mv-fonte-leitura` (Newsreader) — só corpo de texto longo
- `--mv-fonte-ui` (Inter) — nav, rótulos, botões, metadados

Medida de leitura: `--mv-medida` (34rem ≈ 65 caracteres). Passar de ~75
caracteres é a causa nº1 de "cansa só de olhar".

### Movimento — duas regras
1. Nada acima de 420ms, exceto transição de cena deliberada (`--mv-d-cena`).
2. Curva **assimétrica**: `--mv-ease-saida` é o padrão. Ease-in-out simétrico é
   o que faz interface parecer lenta e barata.

`prefers-reduced-motion` já está tratado globalmente — não reimplemente, mas
**não crie animação que só faça sentido em movimento** sem alternativa estática.

### `src/lib/dados.js` — camada de dados
```js
import { useIndice, useDoc, acharDisciplina, acharParcial, acharTema,
         porPeriodo, docsDaDisciplina, contarTipos, buscar, rota } from "../lib/dados.js";
```
- `useIndice()` / `useDoc(id)` → sempre `{ dados, carregando, erro }`. **Trate os três.**
- **Nunca** faça `fetch` direto de `/data/*` — perde o cache compartilhado.
- **Nunca** monte URL na mão — use `rota.*`.

### `src/components/Icones.jsx`
```jsx
import Icone from "../components/Icones.jsx";
<Icone nome="resumo" tamanho={20} />
```
Nomes de artefato: `resumo vespera mapa flashcard questao quiz podcast
infografico video slide tabela espacada clinica transcricao livro prova`
Interface: `inicio grade biblioteca agenda enviar buscar seta fechar menu
relogio imagem usuario externo`
O campo `icone` de cada tipo de artefato no índice já bate com esses nomes.

### `src/components/Carregando.jsx`
`<Carregando />` e `<Esqueleto largura="60%" altura="1.2em" />`.

---

## Forma dos dados

`useIndice()` devolve:
```js
{
  stats: { documentos, figuras, embedsNaoResolvidos, midiaEmitida, disciplinas },
  ciclos: [{ id, rotulo, periodos:[n] }],
  periodos: [{ numero, rotulo, ciclo, disciplinas:[slug] }],
  disciplinas: [{
    slug, rotulo, periodo, acento, descricao, total,
    parciais: [{
      chave: "P1", rotulo: "1ª Parcial", ordem, total,
      temas: [{
        slug, rotulo, num, total,
        tipos: [{ chave:"resumo", rotulo:"Resumos", icone:"resumo", ordem, descricao,
                  docs: [{ id, titulo, minutos, figuras, capa, palavras }] }]
      }]
    }]
  }],
  tiposArtefato: { resumo: { rotulo, icone, ordem, descricao }, … },
  busca: [{ id, t:titulo, d:disciplina, tp:tipo, p:parcial, tm:tema, m:minutos }]
}
```

`useDoc(id)` devolve o de cima mais:
```js
{ html,                       // string HTML já renderizada
  sumario: [{ id, texto, nivel }],   // cabeçalhos h2–h4, para índice lateral
  listaFiguras: [ … ] }
```

### Classes dentro do `html` que você precisa estilizar (quem faz a Leitura)
- `figure.mv-fig` + `figcaption` + `.mv-fig__num` — figura normal
- `button.mv-fig__zoom` — o `<img>` vem embrulhado nele, para lightbox
- `figure.mv-fig--descrita` + `.mv-descrita__{selo,titulo,texto,proc}` — figura que
  **não tem arquivo**, só descrição textual rica vinda do vault. **Não é erro** e
  **não é placeholder feio**: é conteúdo de estudo legítimo e precisa ficar bonito.
- `aside.mv-callout.mv-callout--{note,tip,important,warning,danger,success,question,example,quote,abstract}`
  com `.mv-callout__titulo` e `.mv-callout__corpo`
- `h2/h3/h4.mv-h.mv-h--N` com `a.mv-ancora` dentro
- `mark.mv-mark`, `a.mv-link-interno`, `audio.mv-audio`, `video.mv-video`, `a.mv-anexo`

---

## Regras inegociáveis

1. **Português** em tudo que aparece na tela e nos nomes de identificadores.
   O código existente usa `carregando`, `dados`, `erro`, `rotulo`. Siga.
2. **Só os arquivos que te deram.** Outro agente está no arquivo vizinho agora.
   Se precisa de algo fora do seu escopo, escreva no relatório final — não edite.
3. **Trate os três estados**: carregando, erro, vazio. Estado vazio esquecido é
   o que faz um site parecer quebrado. Vazio deve ser bonito e dizer o que fazer.
4. **Acessibilidade não é opcional**: HTML semântico, alvos de toque ≥44px,
   `aria-label` em botão só de ícone, foco visível (já tem no base.css),
   contraste AA. Navegação por teclado tem que funcionar.
5. **Responsivo de verdade.** Testado em 375px, 768px, 1440px. Nada de scroll
   horizontal no body — tabela e bloco largo rolam dentro do próprio container.
6. **CSS junto do componente**: `Pagina.jsx` + `Pagina.css`, importado no topo.
   Prefixo `mv-`, nomes em português.
7. **Verifique antes de declarar pronto**: rode `npx vite build` e garanta que
   passa. Se não roda, não está pronto.
8. Comentário explica **por quê**, não o quê. Comentário óbvio é ruído.

## Anti-padrões que reprovam no teste cego

- Emoji como ícone de interface
- Gradiente arco-íris, ou gradiente em texto
- `box-shadow` genérico cinza
- Tudo com o mesmo peso visual — sem hierarquia, sem ponto focal
- Espaçamento apertado. Site de elite respira; na dúvida, dobre o espaço
- Card com borda E sombra E fundo colorido ao mesmo tempo — escolha um
- Animação que atrasa a leitura (fade-in de 800ms em texto)
- Hover que só troca a cor de fundo
- Texto centralizado em parágrafo longo
- Estado vazio escrito "Nenhum dado encontrado"
- Cantos arredondados inconsistentes na mesma tela

---

## Como verificar

```bash
cd "E:/Work/Obsidian Claud/Med Test/MedVault-Elite"
npx vite build          # tem que passar
npm run dev             # http://localhost:5180
```
Dados já construídos em `public/data/`. Não rode `build:content` (leva 6 min).
