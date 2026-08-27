# Loop de crítica cega — registro

Protocolo em `PROTOCOLO-CRITICO.md`. Adversário: página de tipografia do
Apple Human Interface Guidelines.

**Placar: 3 vitórias, 0 derrotas.** Três críticos independentes, sem contexto
do código, sem saber qual página era de quem.

## Como o teste é montado

Prints capturados por `scratchpad/tirar.mjs` (Puppeteer headless, viewport
1440×900 @2x, rolagem 1400px — meio do conteúdo, onde a leitura acontece).
Ordem A/B sorteada por moeda a cada rodada; o gabarito fica em
`gabarito-rN.json`, **fora** da pasta que o crítico acessa. Os arquivos que
ele vê chamam `pagina-A.png` e `pagina-B.png`.

A pergunta nunca é "qual parece mais profissional" — é **"em qual você
preferiria estudar para uma prova amanhã?"**. Ganhar por parecer com a
referência seria perder.

---

## Rodada 1 — vencemos

**Argumento decisivo:** densidade útil por tela. Na mesma janela, o nosso
entrega 2 parágrafos + 2 callouts + início de seção; a referência entrega 3
linhas de prosa.

> "Linha mais longa **com** entrelinha mais apertada é a combinação exata que
> faz o olho perder o retorno de linha."

**Nossa maior fraqueza apontada:** a barra lateral era só chrome de aplicativo
(Início, Disciplinas, Biblioteca…) e não dizia nada sobre a estrutura da
disciplina. Quem lia litíase urinária e queria o tema vizinho tinha de voltar
a "Disciplinas" e recomeçar.
→ **Corrigido.** O Shell agora deriva a disciplina do documento aberto; a
árvore contextual aparece na leitura com parciais, temas e contagens.

## Rodada 2 — vencemos

A correção da rodada 1 foi citada como **força**: *"a sidebar dá contagens —
isso é planejamento de estudo, eu sei onde está o volume antes de clicar."*

**Achado mais valioso:** ele mediu ~85 caracteres por linha na nossa coluna.
O token dizia `--medida: 66ch`.
→ **`ch` não é caractere** — é a largura do algarismo "0", bem mais estreito
que a letra média numa serifada. `66ch` rendia ~76 caracteres. O projeto
inteiro estava calibrado errado, e essa é exatamente a causa raiz do "cansa só
de olhar" que o dono relatou do site antigo.
→ **Corrigido** para `54ch` (~600px, ~61 caracteres), com comentário no CSS
explicando a armadilha da unidade.

## Rodada 3 — vencemos

Pergunta plantada de propósito: *comparar os dois índices e dizer qual dá para
varrer e qual precisa ser lido*. Teste direto da reescrita do sumário. Resposta:

> "A eu VARRO. B eu tenho que LER item por item. E a causa é específica, não é
> impressão. O olho salta pela coluna de números, não pelas palavras."

Na rodada 2 o índice era onde perdíamos; na 3 é onde ganhamos.

---

# PENDÊNCIAS ABERTAS

## 1. Scroll-spy nunca atualiza ao rolar — NÃO RESOLVIDO

**Severidade: alta.** Um índice em que não se confia é pior que nenhum.

### O sintoma verdadeiro (diferente do que parecia)

O índice fica **travado no primeiro item** o documento inteiro. Isso enganou o
diagnóstico inicial: no topo da página o valor default coincide com a resposta
certa, então parecia funcionar e só quebrar mais adiante. Não é atraso de um
item — é ausência total de atualização.

```
y=   0  na tela "0. Fontes Usadas"          índice "0. Fontes Usadas"   OK (coincidência: é o default)
y=1800  na tela "1. Visão Geral"            índice "0. Fontes Usadas"   ERRADO
y=3200  na tela "3.1 Definição e Mecanismo" índice "0. Fontes Usadas"   ERRADO
y=5000  na tela "3.3 Componentes"           índice "0. Fontes Usadas"   ERRADO
```

### Hipóteses ELIMINADAS com medição (não repetir)

| Hipótese | Como foi descartada |
|---|---|
| Ids duplicados no sumário | 0 duplicados em 45 entradas |
| Ordem do array ≠ ordem do HTML | idênticas, comparação exata de strings |
| Cabeçalhos fora de ordem vertical | 0 quebras de monotonia em 45 |
| `CSS.escape` falhando em id que começa com dígito | 45/45 resolvem por `querySelector` E por `getElementById` |
| Eventos de scroll não chegam | chegam; `window.scrollY` correto |
| `else break` parando cedo | removido; comportamento idêntico |
| `refArtigo.current` null na montagem | alvos passaram a ser resolvidos sob demanda; comportamento idêntico |

O algoritmo, **quando executado**, dá a resposta certa: em y=3200 o
`3-1-definicao-e-mecanismo` está a 209px com a linha em 270px, e é o candidato
correto. O problema não é o cálculo.

### Onde a investigação parou

`setSecaoAtiva` parece não estar sendo chamada após a montagem, ou a chamada
não provoca re-render do `Sumario`. As duas coisas ainda não foram observadas
diretamente.

**Próximo passo concreto:** instrumentar de dentro do componente — um
`console.log` em `apurar()` e outro no corpo de `Sumario` — e ler via
`read_console_messages` para responder às duas perguntas em aberto:

1. `apurar()` executa mais de uma vez? (isolar listener vs. cálculo)
2. Se executa e chama `setSecaoAtiva`, o `Sumario` re-renderiza com o `ativo` novo?

Se (1) for não, o listener não está ligado — investigar se o efeito está sendo
limpo imediatamente por identidade instável de `doc`. Se (1) for sim e (2) não,
o problema é de propagação de estado, não do spy.

**Reproduzir:** `node scratchpad/vspy.mjs` (documento `ce4ce9899b`).
Arquivos de diagnóstico já prontos no scratchpad: `vspy.mjs`, `vspy2.mjs`,
`vdiag.mjs`, `vmono.mjs`, `vesc.mjs`, `vlive.mjs`.

## 2. Numeração do vault fora de ordem no índice

O crítico observou: `3. Explicação` → `4. Classificação` → `3.4 Clínica` →
`3.5` → `3.7` → `5. Comparações`. Os filhos de 3 aparecem depois do 4, e não
existem 3.1–3.3 no índice.

Parte disso é dado do vault (a numeração dos títulos está inconsistente na
origem), parte é o agrupamento da pendência 1. **Ordenar estritamente por
posição no documento**, ignorando a numeração escrita nos títulos, resolve o
lado que é nosso.

## 3. Dado sujo do vault vazando para a interface

- Acentos faltando em títulos de tema: "Infeccoes Inespecificas",
  "Infeccoes Especificas" — nome de arquivo virando título de exibição.
- "Pipeline NotebookLM - Orientacao de Geracao" aparece como capítulo de um
  resumo clínico; é metadado de processo, não conteúdo de estudo.
- Glosa redundante no ponto de maior destaque da página:
  **"Litiasis urinaria"** *(litiasis urinaria)* — dois recursos tipográficos
  gastos para transmitir zero informação.

Correção pertence ao vault, não ao pipeline.

## 4. Ritmo vertical: linha de estatísticas gruda no parágrafo

Medido pelo crítico: entre parágrafos há ~52px; entre o parágrafo e a linha
"Prevalência: ~10% · Recorrência: 50%" há **35px — exatamente a entrelinha
interna**. Os dois números se fundem visualmente no parágrafo acima e passam
batido na varredura, sendo justamente o tipo de dado que cai em prova.

**Sugestão dele, que vale:** promover linhas de números soltas a uma faixa de
dados-chave (par rótulo/valor, número em corpo maior) em vez de negrito inline.

## 5. Excesso de negrito nos primeiros parágrafos

Um terço do texto em negrito faz o negrito virar textura em vez de sinal.
Origem no conteúdo do vault.

---

## Próxima rodada

Só vale rodar a rodada 4 depois de fechar a pendência 1 — é a única que o
crítico já apontou duas vezes por ângulos diferentes, e gastar uma rodada para
ouvir de novo seria desperdício.
