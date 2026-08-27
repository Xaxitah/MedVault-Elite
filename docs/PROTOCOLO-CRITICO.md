# Protocolo do teste cego

O dono pediu: um crítico **sem contexto de como o código foi feito** compara o
nosso resultado com uma referência real, lado a lado, **às cegas**, respondendo
só qual parece melhor — escolha binária, sem nota. Se a referência ganhar, o
item volta ao início do ciclo com feedback destrutivo e concreto. Até 10 voltas.

Este documento é o que se cola no prompt do crítico. Escrito para ser
copiável sem edição.

---

## O adversário

**`https://developer.apple.com/design/human-interface-guidelines/typography`**

Escolhido pelo curador de referências por casar com o nosso **formato de
conteúdo**, não só com o gênero: conceito explicado com figuras inline pesadas,
taxonomia profunda, sem código. É de elite e imbatível em produção de figura.

Runner-up para testar navegação profunda especificamente: Stripe Docs.

## A pergunta — e por que ela mudou

A pergunta **não** é "qual parece mais profissional?".

Se ganharmos por parecer com a Apple, perdemos: viramos cópia. A linguagem
Prancha existe justamente para não sermos derivados. Então a pergunta é:

> **"Em qual destas duas páginas você preferiria estudar para uma prova
> amanhã? Escolha A ou B. Depois explique por quê."**

Ganhamos quando o crítico escolhe o nosso por ser **melhor para a tarefa**, e
consegue dizer por quê.

## O furo do protocolo original, e o conserto

A primeira versão deste documento mandava passar duas URLs ao crítico. **Isso
não consegue ser cego.** Entregar `localhost:5180` e `developer.apple.com` faz
o crítico saber na hora qual é a nossa — e ele ainda escreveria uma
justificativa plausível, então a gente nem perceberia que o resultado não vale
nada.

Conserto: comparar por **captura de tela**, sem origem nenhuma. Prints dos dois
lados, ordem sorteada, entregues como imagem A e imagem B.

Isso custa a interação: o crítico não rola, não clica, não redimensiona. Então
o ciclo se parte em duas passadas, e só a primeira precisa ser cega:

| Passada | Como | O que pega |
|---|---|---|
| **Cega** | prints A/B sorteados, escolha binária | qualidade visual, hierarquia, densidade, primeira impressão |
| **Aberta** | agente navegando de verdade no localhost | bugs, teclado, responsivo, estados vazios |

Misturar as duas foi erro do protocolo original.

## Restrição de ferramenta descoberta em uso

A extensão do Chrome entrega **uma captura por aba**: a primeira funciona, a
segunda expira com "renderer frozen". Não é bug do site — a página segue
respondendo. Cada print exige abrir aba nova, tirar uma foto e fechar.

Isso encarece a passada cega e precisa entrar no orçamento: N prints = N abas.

## Regras que fazem o teste valer alguma coisa

1. **O crítico não sabe qual é qual.** Nada de "o nosso" e "a referência". São
   A e B, e a ordem é sorteada a cada rodada.
2. **O crítico não vê o código, nem esta pasta, nem a linguagem Prancha.** Se
   ele souber da nossa intenção, ele avalia a intenção em vez do resultado.
3. **Escolha binária primeiro, justificativa depois.** Pedir nota produz 7/10
   em tudo. Pedir escolha força uma decisão de verdade.
4. **Se A e B empatarem na cabeça do crítico, isso conta como derrota nossa.**
   Empate contra a Apple significa que não demos motivo pra escolher.

## O prompt do crítico

```
Você vai comparar duas páginas web lado a lado.

Não sei nada sobre quem fez cada uma e você também não precisa saber. Não
procure pistas de autoria, não julgue por marca, não pesquise sobre elas.

PÁGINA A: <url ou caminho>
PÁGINA B: <url ou caminho>

Abra as duas. Olhe de verdade — role até o fim, redimensione para 375px e para
1440px, clique em coisas.

Depois responda, nesta ordem:

1. UMA LETRA. A ou B. Em qual destas você preferiria estudar para uma prova
   amanhã? Sem "depende", sem empate, sem nota.

2. Por quê. Seja concreto: aponte elementos específicos, não impressões. "A
   coluna de texto de B é larga demais e eu perdia a linha na volta" vale.
   "B parece mais limpo" não vale nada.

3. As cinco coisas mais fracas da que você NÃO escolheu. Implacável e
   específico: o quê, onde, e o que fazer em vez disso. Se algo estiver
   quebrado, diga que está quebrado.

4. Uma coisa que a perdedora faz melhor que a vencedora.
```

O item 4 existe porque crítico sem nenhuma ressalva costuma estar performando
severidade em vez de olhando.

## O ciclo

1. Roda o teste em uma página nossa contra a página equivalente do adversário.
2. **Se a nossa perder**: o feedback dos itens 3 e 4 vira o prompt do worker
   dono daquele arquivo. Ele corrige. Volta ao passo 1.
3. **Se a nossa ganhar**: a página passa. Registra a rodada e a justificativa
   em `docs/RODADAS-CRITICO.md`.
4. Limite de 10 rodadas por página. Se em 10 não passar, para e escala pro
   dono — insistir além disso é sinal de que o problema está no briefing, não
   na execução.
5. **Bug encontrado interrompe o ciclo.** O dono foi explícito: "se tiver algum
   bug, pare para revermos". Bug não é assunto de crítico de design.

## Páginas a testar, e contra o quê

| Nossa página | Página adversária |
|---|---|
| `/#/ler/<id>` (leitura) | a página de tipografia do HIG |
| `/#/disciplinas` | `https://developer.apple.com/design/human-interface-guidelines/foundations` |
| `/#/biblioteca` | Stripe Docs (índice) |
| `/#/` (home) | `https://developer.apple.com/design/human-interface-guidelines` |

A leitura é a mais importante das quatro. Se só der tempo de uma, é essa.
