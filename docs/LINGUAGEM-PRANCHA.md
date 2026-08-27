# Prancha — a linguagem de design do MedVault

Nossa, não emprestada. Este documento manda mais que qualquer referência
externa. Quando o dossiê e a Prancha discordarem, **a Prancha ganha** — o
dossiê vira insumo, não lei.

---

## De onde ela vem

Toda referência que estudamos é de tecnologia: Stripe, Linear, Apple, Vercel.
São excelentes resolvendo os problemas **delas** — vender software, documentar
API, converter estranho. Nenhum desses é o nosso problema.

O nosso é: um grupo de medicina estudando sob pressão de prova, num acervo de
1.503 documentos e 4.534 figuras, em português com termos em espanhol.

Medicina tem tradição visual própria, com séculos de refinamento, e ninguém na
web usa: **a prancha de atlas anatômico**. Bourgery, Gray, Netter, Sobotta.

A prancha resolve, por convenção antiga, quase tudo que a gente precisa:

| Convenção | O problema que resolve |
|---|---|
| Papel creme, tinta profunda, cor contida | A tese pastel, já validada em AAA |
| Figura numerada + legenda pareada | 4.534 figuras precisando de ordem |
| Fio fino; sem caixa, sem sombra | Medido no Ciechanowski e na Stripe |
| Serifada nativa, densidade alta sem fadiga | "Só de olhar já cansa de ler" |
| Legenda que sobrevive sem a ilustração | **As 611 figuras descritas** |

Esse último é o ponto. Nosso problema mais esquisito — figura que só existe
como descrição — é *nativo* dessa linguagem. Numa prancha, a legenda sempre
foi um artefato de primeira classe, com valor próprio.

---

## Os sete princípios

### 1. A página é uma prancha, não uma tela
Margem generosa, um bloco de texto com medida disciplinada, figuras ancoradas
em posições previsíveis. A pessoa devia sentir vontade de imprimir e passar
marca-texto. Nada de "seções" empilhadas de landing page.

### 2. O fio antes da caixa
Hierarquia por **fio fino e espaço**, nunca por caixa. Card com borda E sombra
E fundo colorido é o vício nº1 de portal de estudo — vira folheto. Se precisa
separar duas coisas: primeiro tente espaço; depois um fio; caixa é o último
recurso e precisa de justificativa.

### 3. Tudo que é figura é numerado
Fig. 1, Fig. 2, na ordem do documento, com legenda pareada. Vale para imagem
real E para figura descrita. A numeração dá ao leitor um jeito de apontar
("olha a fig. 4") — que é como grupo de estudo conversa de verdade.

### 4. Cor é etiqueta, nunca decoração
Cada disciplina tem seu pigmento, e ele aparece **só** onde identifica: fio de
seção, chip, marcador de nav, número da figura. O fundo do texto é papel em
toda página do site. Onze cores decorando viram circo; onze cores etiquetando
viram sistema.

### 5. Densidade é respeito
Nosso usuário está estudando para uma prova, não navegando por lazer. Ele quer
**muita informação legível de uma vez**, não três cards com uma frase cada.
Densidade alta com hierarquia clara — o oposto de apertado e o oposto de vazio.
A prancha antiga é densíssima e nunca cansa, porque tudo tem lugar.

### 6. O movimento revela estrutura, nunca chama atenção
Animação só é permitida quando **explica onde você está** ou **de onde a coisa
veio**: a árvore que abre, a figura que amplia, o progresso que sobe. Animação
que só enfeita é ruído em cima de quem está tentando decorar farmacologia.
Nada acima de 420ms. Entrada rápida, assentamento lento.

### 7. A véspera tem outro registro
Material de véspera é lido em pânico, à noite, na hora errada. Merece
tratamento próprio: mais direto, mais contrastado, mais compacto, respiro
menor. É o único lugar do site onde a gente troca calma por urgência — e é
deliberado.

---

## O que isto proíbe explicitamente

- Card com borda + sombra + fundo ao mesmo tempo (princípio 2)
- Cor de disciplina no fundo de área de leitura (princípio 4)
- Grade de três cards "features" (princípio 5)
- Fade-in em texto de leitura (princípio 6)
- Emoji como ícone (não é da tradição, e não escala)
- Figura em caixa com sombra (princípio 2 — a prancha nunca emoldura)
- Ilustração genérica de banco de imagem (nossas figuras são o conteúdo)

---

## Assinaturas visuais — o que faz alguém reconhecer que é o MedVault

Um design próprio precisa de marcas identificáveis. Estas são as nossas:

1. **O número da figura em pigmento da disciplina**, em versalete, à esquerda
   da legenda. Aparece em toda figura do site.
2. **O fio de disciplina**: régua de 2px no pigmento, abrindo cada seção
   principal. É o elemento mais repetido do site.
3. **A legenda-prancha**: serifada, corpo menor, cor `--mv-ink-muted`, com o
   número em pigmento. Nunca centralizada.
4. **O marcador de progresso na nav**: círculo vazado que enche no item atual.
   Já implementado no Shell.
5. **Versalete para rótulo estrutural** (DISCIPLINA, PARCIAL, TEMA) —
   `--mv-sobrelinha`. Nunca para conteúdo.
6. **Figura descrita como prancha sem ilustração**: moldura de fio pontilhado
   fino, selo em versalete, a descrição em serifada, procedência em pé de
   página. Precisa parecer *deliberado*, e ser bonito o bastante pra alguém não
   sentir falta da imagem.

---

## Como isto muda o teste cego

O adversário continua sendo a página de tipografia do Apple HIG. Mas a pergunta
para o crítico deixa de ser "qual parece mais profissional?" e passa a ser
**"qual você preferiria usar para estudar?"** — porque é essa a tarefa.

Se ganharmos por parecer com a Apple, perdemos: viramos cópia. Ganhamos quando
o crítico escolhe o nosso por ser **melhor para a tarefa**, e consegue dizer
por quê.
