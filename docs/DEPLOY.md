# Colocar o site no ar

Escrito para ser seguido do começo ao fim sem precisar saber programar.
Cada bloco de comando pode ser copiado inteiro.

**O que vamos fazer:** publicar como Worker de arquivos estáticos na Cloudflare,
com login obrigatório, para que só o grupo veja o conteúdo.

**Por que com login, e não aberto:** 2.423 das 5.145 figuras do site vêm de
livros protegidos (Guyton, Llanio, Goodman & Gilman, Flórez, Smith/Tanagho).
Compartilhar num grupo de estudo é uma coisa; deixar numa página aberta e
indexada pelo Google é outra. O login resolve isso e ainda adianta metade do
cadastro de usuários que você queria.

---

## Antes de começar

Você precisa de:
- Uma conta na Cloudflare (grátis) — https://dash.cloudflare.com/sign-up
- O Node.js já instalado (já está, é o que roda o projeto)
- A lista de e-mails do grupo

Nada disso custa dinheiro. O plano grátis da Cloudflare cobre até **50 pessoas**
com login e tráfego ilimitado.

---

## Passo 1 — Gerar o conteúdo

Isto lê o vault e o `G:\Meu Drive\MED-Imagens` e monta as 1.503 páginas.
Demora uns 5 minutos porque lê o Google Drive.

```bash
cd "E:/Work/Obsidian Claud/Med Test/MedVault-Elite"
npm install
npm run build:content
```

No fim ele imprime um resumo. Confira se diz `documentos 1503` — se der um
número muito menor, o Drive provavelmente não estava montado.

## Passo 2 — Encolher as imagens

Corta ~28% do peso sem perda visível na tela. Roda uma vez só, depois de gerar.

```bash
node tools/otimizar-media.mjs
```

## Passo 3 — Montar o site

```bash
npm run build
```

Cria a pasta `dist/` com tudo pronto. São ~325 MB e ~4.400 arquivos.

## Passo 4 — Trancar ANTES de publicar

Isto vem antes de propósito, e agora por um motivo verificado.

A versão anterior deste guia mandava criar uma política de Access para o
endereço `medvault.pages.dev` antes do site existir. Fui checar na
documentação e **não achei nada confirmando que isso funciona** — política
para um endereço inexistente é aposta, e o preço de errar seria deixar 2.423
figuras de livro abertas na internet.

O caminho abaixo não depende de aposta: **"Protect all Workers" vale para todo
Worker da conta, inclusive os que ainda não existem.** Ligando antes, o site
já nasce trancado.

1. Entre em https://dash.cloudflare.com e vá em **Workers & Pages**
2. Na tela de visão geral, ache o cartão **Protect all Workers**
3. Se estiver escrito *Not enabled*, clique em **Enable Access**
4. Em *traffic scope*, escolha **All traffic** (não "Previews only")
5. Em **Authentication policy**, escolha:
   - **Email domain** → o domínio do grupo (ex.: `gmail.com`), ou
   - **Cloudflare account** → só quem estiver na sua conta
6. Confira a *session duration* — 1 mês evita login toda hora
7. Clique em **Apply Access**

> **Se a conta ainda não tem Zero Trust:** o painel vai pedir para ativar antes.
> É grátis e leva um minuto — siga o assistente e volte para o passo 3.

Para uma lista de e-mails específicos em vez de um domínio inteiro, entre em
https://one.dash.cloudflare.com → **Access → Policies**, abra a política que
acabou de ser criada e troque o critério para **Emails**, um por linha.

## Passo 5 — Publicar

Na primeira vez abre o navegador para você entrar na Cloudflare.

```bash
npx wrangler login
```

Depois:

```bash
npm run deploy
```

Sobem os ~4.400 arquivos do `dist`. No fim aparece o endereço
`https://medvault.<sua-conta>.workers.dev`.

**Confira numa janela anônima antes de divulgar:** tem que pedir login. Se
abrir o site direto, volte ao passo 4 — a proteção não pegou.

---

## Publicar de novo, depois de mudar algo

Se mudou o **conteúdo do vault**:
```bash
npm run build:content && node tools/otimizar-media.mjs && npm run build
npm run deploy
```

Se mudou só o **site** (código, cores, layout):
```bash
npm run build
npm run deploy
```

---

## O que ainda não está ligado

O site funciona hoje em **modo local**: contas, agenda e envio de material
operam, mas os dados ficam no navegador de cada pessoa e não são
compartilhados. A interface avisa isso na tela — não finge que salvou.

Para ligar de verdade, veja `docs/BACKEND.md`: criar o projeto no Supabase,
ativar o login com Google, e colar as duas chaves num arquivo `.env`. Enquanto
isso não acontece, o login da Cloudflare (passo 5) já garante que só o grupo
entra.

## Se algo der errado

| Sintoma | Causa provável |
|---|---|
| `build:content` acha poucos documentos | Google Drive não montado — abra o `G:` e rode de novo |
| Imagens não aparecem no site publicado | Faltou rodar `npm run build` depois do `build:content` |
| `wrangler` pede login toda vez | Normal na primeira; se persistir, rode `npx wrangler logout` e repita |
| Site abre sem pedir login | O *Protect all Workers* está como *Previews only* em vez de *All traffic* |
