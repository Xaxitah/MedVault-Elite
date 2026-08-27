/**
 * Sessão da pessoa que está usando o site.
 *
 * Deliberadamente SEM Provider de contexto. O botão de conta vai morar dentro
 * do Shell, e o Shell é de outro agente — se `useConta()` exigisse um
 * `<ProvedorConta>` na raiz, encaixar o botão obrigaria a mexer em `App.jsx` e
 * `main.jsx`, que não são meus. Uma loja de módulo com `useSyncExternalStore`
 * dá o mesmo resultado (uma sessão só, compartilhada, reativa) e `<Conta />`
 * pode ser colada em qualquer lugar da árvore sem preparo nenhum.
 *
 *   const { conta, carregando, erro, entrarComGoogle, entrarLocal, sair } = useConta();
 *
 * `conta` é `null` quando ninguém entrou — o estado normal, não um erro.
 */

import { useSyncExternalStore } from "react";
import { backend, AVISO_MODO } from "./backend.js";

let estado = { conta: null, carregando: true, erro: null };
const inscritos = new Set();

function definir(parcial) {
  estado = { ...estado, ...parcial };
  inscritos.forEach((fn) => fn());
}

// Primeira leitura + escuta contínua. Roda uma vez por carregamento de página,
// no import do módulo, então a primeira tela já sabe se há sessão.
backend
  .sessaoAtual()
  .then((conta) => definir({ conta, carregando: false, erro: null }))
  .catch((e) => definir({ conta: null, carregando: false, erro: e }));

backend.aoMudarSessao((conta) => definir({ conta, carregando: false }));

const inscrever = (fn) => {
  inscritos.add(fn);
  return () => inscritos.delete(fn);
};

const instantaneo = () => estado;

/** Entrar com Google (Supabase) ou com um nome local, conforme o modo. */
async function entrarComGoogle() {
  definir({ erro: null });
  try {
    await backend.entrarComGoogle();
  } catch (e) {
    definir({ erro: e });
    throw e;
  }
}

async function entrarLocal(dados) {
  definir({ erro: null });
  try {
    const conta = await backend.entrarLocal(dados);
    definir({ conta, carregando: false });
    return conta;
  } catch (e) {
    definir({ erro: e });
    throw e;
  }
}

async function sair() {
  definir({ erro: null });
  try {
    await backend.sair();
    definir({ conta: null });
  } catch (e) {
    definir({ erro: e });
    throw e;
  }
}

export function useConta() {
  const s = useSyncExternalStore(inscrever, instantaneo, instantaneo);
  return {
    ...s,
    entrarComGoogle,
    entrarLocal,
    sair,
    modo: backend.modo,
    ehLocal: backend.ehLocal,
    avisoModo: AVISO_MODO,
  };
}

/** Iniciais para o avatar quando o Google não devolve foto. Duas letras no
 *  máximo — três já viram sopa de letra num círculo de 32px. */
export function iniciais(nome) {
  const partes = String(nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export { backend };
