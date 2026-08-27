# Colocar o site no ar

Escrito para ser seguido do começo ao fim sem precisar saber programar.
Cada bloco de comando pode ser copiado inteiro.

**O que vamos fazer:** publicar na Cloudflare Pages com login obrigatório, para
que só o grupo veja o conteúdo.

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

## Passo 4 — Trancar o acesso ANTES de publicar

Isto vem antes de propósito. A política pode ser criada para um endereço que
ainda não existe — e assim o site nunca fica aberto, nem por um minuto. Fazer
na ordem contrária deixaria 2.423 figuras de livro públicas até você terminar.

É feito no site da Cloudflare, não por comando:

1. Entre em https://one.dash.cloudflare.com
2. No menu, **Access → Applications → Add an application**
3. Escolha **Self-hosted**
4. Preencha:
   - *Application name*: `MedVault`
   - *Session duration*: `1 month` (assim ninguém precisa logar toda hora)
   - *Subdomain*: `medvault` · *Domain*: `pages.dev`
5. Em **Add policy**:
   - *Policy name*: `Grupo de estudo`
   - *Action*: `Allow`
   - *Include* → `Emails` → cole os e-mails do grupo, um por linha
6. Salve.

Pronto. Quem abrir o endereço recebe um código por e-mail e só entra se
estiver na lista. Para adicionar alguém depois, é só voltar nessa política e
incluir o e-mail — não precisa mexer no site.

## Passo 5 — Publicar

Na primeira vez ele abre o navegador para você entrar na Cloudflare.

```bash
npx wrangler pages deploy dist --project-name=medvault
```

No fim aparece o endereço `https://medvault.pages.dev`.

**Confira agora, numa janela anônima:** tem que pedir e-mail. Se abrir o site
direto, a política do passo 4 não pegou — não divulgue o link até corrigir.

---

## Publicar de novo, depois de mudar algo

Se mudou o **conteúdo do vault**:
```bash
npm run build:content && node tools/otimizar-media.mjs && npm run build
npx wrangler pages deploy dist --project-name=medvault
```

Se mudou só o **site** (código, cores, layout):
```bash
npm run build
npx wrangler pages deploy dist --project-name=medvault
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
| Site abre sem pedir e-mail | A política do passo 5 não foi salva ou o subdomínio está errado |
