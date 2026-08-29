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

Isto vem antes de propósito, e por um motivo verificado.

Uma versão anterior deste guia mandava criar a política de Access para o
endereço do site antes dele existir. Ao conferir na documentação, **não achei
nada confirmando que política para endereço inexistente funciona** — era
aposta, e errar significaria deixar 2.423 figuras vindas de livros abertas.

O caminho abaixo não depende de aposta: **"Protect all Workers" é uma
configuração da CONTA e vale para todo Worker, inclusive os que ainda não
existem.** Ligando antes, o site nasce trancado.

### 4a. Criar o Zero Trust (só na primeira vez)

Enquanto a conta não tiver Zero Trust, o painel mostra **"Set up Zero Trust"**
no lugar da opção de proteger — é o que aparece hoje.

1. Em **Workers & Pages**, clique em **Set up Zero Trust**
2. Escolha um **team name** — vira o endereço do login
   (`<time>.cloudflareaccess.com`). Algo como `medvault` ou o nome do grupo.
   Anote: é o que as pessoas verão ao entrar.
3. Escolha o plano **Free** — até 50 usuários, suficiente para o grupo

> **Se pedir cartão:** o plano é US$ 0, mas a Cloudflare às vezes solicita
> forma de pagamento no cadastro. Não consegui confirmar na documentação se
> isso acontece hoje. Se aparecer, a decisão é sua — não é cobrança, é
> cadastro. Se preferir não informar, avise que eu monto a alternativa por
> GitHub Pages com repositório privado.

### 4b. Definir como o grupo entra

Ainda no Zero Trust, em **Settings → Authentication**, confirme que
**One-time PIN** está ativo. É o método mais simples e o certo para este caso:
cada pessoa digita o e-mail e recebe um código. **Não precisa** de Google
Workspace, nem que ninguém crie conta na Cloudflare.

### 4c. Proteger todos os Workers

Volte para **Workers & Pages**. Onde antes estava "Set up Zero Trust" agora
aparece o cartão **Protect all Workers**:

1. Clique em **Enable Access**
2. Em *traffic scope*, escolha **All traffic** — não "Previews only"
3. Em **Authentication policy**, escolha uma:
   - **Email domain** → `gmail.com` (libera qualquer Gmail — prático, porém amplo)
   - ou abra a política depois e troque para **Emails**, listando um por linha
     (mais restrito, e o que eu recomendo para material de estudo)
4. *Session duration*: **1 month**, para ninguém precisar logar toda hora
5. **Apply Access**

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
`https://medvault.bughipr.workers.dev`.

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
