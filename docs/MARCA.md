# Marca MedVault

Escolhida: **O Fólio**. Duas alternativas salvas e prontas para troca.
Prova visual: `docs/prova-marca.html` (abra pelo servidor de dev).

---

## O levantamento crítico

O mercado de educação médica se divide em dois campos, e os dois são
armadilhas para este projeto:

| Campo | Quem | Lógica | Por que não serve |
|---|---|---|---|
| Cartoon amigável | Osmosis, Sketchy, Picmonic | reduzir a ansiedade de prova com traço lúdico | infantiliza um acervo denso e sério |
| Azul clínico-corporativo | UpToDate, Medscape, Lecturio, AMBOSS | transmitir autoridade institucional | genérico — qualquer um desses logos serviria para uma seguradora |

O terceiro campo — **acadêmico-editorial**, o registro de um grande atlas ou de
uma editora universitária — está praticamente vazio. É exatamente onde a
linguagem Prancha vive (ver `LINGUAGEM-PRANCHA.md`). A jogada é não competir em
nenhum dos dois campos e ocupar o vazio.

*Ressalva honesta: isto é caracterização do padrão dominante a partir das marcas
públicas dessas plataformas, não auditoria exaustiva do setor.*

---

## As três direções, e o que o teste revelou

Cada uma foi renderizada em 16 / 24 / 34 / 96px, em cor, em monocromático,
sobre fundo escuro, no lockup ao lado da palavra "MedVault" em Fraunces 600, e
simulada como favicon entre outras abas. **Duas mudaram de nota depois de
renderizadas** — é por isso que o teste existe.

### ✅ B — O Fólio *(escolhida)*

Volume encadernado visto de frente: lombada sólida à esquerda, três réguas
decrescentes à direita.

As réguas são as camadas da hierarquia do site — disciplina, parcial, tema — e
ao mesmo tempo a abstração de texto numa página. A marca *é* a estrutura do
produto.

**Por que ganhou:**
- **Não é uma letra num quadrado.** Monograma é o destino padrão de marca de
  projeto, e sair dele foi um pedido explícito.
- **Sobrevive a 16px.** É só massa e fio: nada de traço fino que suma, nada de
  detalhe que vire borrão na aba.
- Ganha presença ao crescer, em vez de só esticar.
- Funciona monocromática e sobre fundo escuro sem ajuste.

### 🔸 A — O Vinco *(salva)*

O M de Med contém um V — o vértice central de um M *é* um V. Aqui esse vértice
é o vinco de uma prancha aberta, duas folhas encontrando-se na dobra.

**Veredito:** funciona em todos os tamanhos e é o conceito mais bem amarrado ao
nome. Mas renderizada, **lê como letra** — o conceito de prancha aberta não
chega ao olho, e cai na mesma armadilha do logo provisório, só que melhor
executada.

**Quando trocar para ela:** se o reconhecimento imediato importar mais que a
distinção. Alguém que bate o olho entende "MedVault" sem precisar do texto ao
lado — o Fólio não entrega isso.

### 🔸 C — A Chave *(salva, revisada)*

A linha de chamada numerada, que aponta de um rótulo para uma estrutura, é a
assinatura visual do atlas anatômico. Ninguém no mercado usa como marca.

**Veredito da primeira versão: falhou.** Ponto redondo embaixo à esquerda mais
haste vertical lia como **colcheia**. Leitura acidental fatal num site de
medicina, e nenhum argumento conceitual salva isso.

**Revisão salva:** quadrado no lugar do círculo (cabeça de nota é redonda, o
quadrado mata a leitura musical) e a chamada termina numa barra horizontal de
rótulo, fechando a forma como chave em vez de haste.

**Quando trocar para ela:** é a mais original das três e a de maior risco —
depende de o leitor reconhecer a convenção do atlas. Vale se o grupo for de
gente que estuda por Netter e Sobotta e vai captar a referência.

---

## Como trocar

Edite `src/components/Logo.jsx` para reexportar a alternativa:

```jsx
export { LogoVinco as default } from "./Logo.alternativas.jsx";
// ou
export { LogoChave as default } from "./Logo.alternativas.jsx";
```

Nada mais muda — o Shell consome só o export padrão de `Logo.jsx`.
**Troque `public/favicon.svg` junto**, senão a aba e o site divergem.

## Regras de uso

- **Área livre:** metade da altura da marca em todos os lados. No Shell isso já
  é o `gap` de 12px ao lado do texto.
- **Tamanho mínimo:** 16px. Abaixo disso, use só a lombada como quadrado sólido.
- **Cor:** herda `--acento-ink`, então recolore junto com a disciplina ativa.
  Em contexto neutro, o verde eucalipto `#01614D` é a cor da casa.
- **Nunca:** girar, esticar, aplicar sombra ou gradiente, pôr dentro de um
  quadrado arredondado (foi disso que a gente saiu), nem usar sobre fundo de
  contraste menor que 3:1.
- **Favicon** leva fundo papel próprio, porque a marca sozinha some numa aba
  de tema escuro.
