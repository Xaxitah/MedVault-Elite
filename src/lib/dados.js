/**
 * Camada de dados — o único lugar que sabe como o conteúdo chega.
 *
 * Contrato para quem constrói páginas: use os hooks. Não faça fetch direto de
 * /data/*, senão a gente perde o cache compartilhado e o índice é baixado
 * várias vezes.
 */

import { useEffect, useState } from "react";

const BASE = import.meta.env.BASE_URL || "/";

let cacheIndice = null;
let promessaIndice = null;
const cacheDocs = new Map();

/** Índice de navegação inteiro. ~500 KB, buscado uma vez e compartilhado. */
export function carregarIndice() {
  if (cacheIndice) return Promise.resolve(cacheIndice);
  if (promessaIndice) return promessaIndice;

  promessaIndice = fetch(`${BASE}data/index.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`índice HTTP ${r.status}`);
      return r.json();
    })
    .then((d) => {
      cacheIndice = d;
      return d;
    })
    .catch((e) => {
      promessaIndice = null;
      throw e;
    });

  return promessaIndice;
}

/** Um documento renderizado, com html e sumário. */
export function carregarDoc(id) {
  // Sem id resolve para null em vez de rejeitar: o Shell chama este hook em
  // toda rota (hooks não podem ser condicionais) e só há documento na rota de
  // leitura. Rejeitar aqui pintaria estado de erro em página que não errou.
  if (!id) return Promise.resolve(null);
  if (cacheDocs.has(id)) return Promise.resolve(cacheDocs.get(id));

  return fetch(`${BASE}data/docs/${id}.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`documento HTTP ${r.status}`);
      return r.json();
    })
    .then((d) => {
      cacheDocs.set(id, d);
      return d;
    });
}

/**
 * Hook genérico de carregamento. Devolve sempre a mesma forma —
 * { dados, carregando, erro } — pra toda página tratar os três estados igual.
 * Estado de erro esquecido é o que faz site parecer quebrado.
 */
function useAssincrono(fn, deps) {
  const [estado, setEstado] = useState({ dados: null, carregando: true, erro: null });

  useEffect(() => {
    let vivo = true;
    setEstado((s) => ({ ...s, carregando: true, erro: null }));
    fn()
      .then((d) => vivo && setEstado({ dados: d, carregando: false, erro: null }))
      .catch((e) => vivo && setEstado({ dados: null, carregando: false, erro: e }));
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return estado;
}

export const useIndice = () => useAssincrono(carregarIndice, []);
export const useDoc = (id) => useAssincrono(() => carregarDoc(id), [id]);

// ── seletores ───────────────────────────────────────────────────────────
// Funções puras sobre o índice. Deixe a busca aqui, não espalhada em página.

export const acharDisciplina = (indice, slug) =>
  indice?.disciplinas.find((d) => d.slug === slug) ?? null;

export const acharParcial = (disc, chave) =>
  disc?.parciais.find((p) => p.chave === chave) ?? null;

export const acharTema = (parcial, slug) =>
  parcial?.temas.find((t) => t.slug === slug) ?? null;

/** Disciplinas agrupadas por período, prontas pra renderizar. */
export function porPeriodo(indice) {
  if (!indice) return [];
  return indice.periodos.map((p) => ({
    ...p,
    disciplinas: p.disciplinas
      .map((s) => acharDisciplina(indice, s))
      .filter(Boolean),
  }));
}

/** Todo documento de uma disciplina, achatado — para contagens e listagens. */
export function docsDaDisciplina(disc) {
  if (!disc) return [];
  const saida = [];
  for (const p of disc.parciais)
    for (const t of p.temas)
      for (const tp of t.tipos)
        for (const d of tp.docs)
          saida.push({ ...d, parcial: p.chave, tema: t.slug, tipo: tp.chave });
  return saida;
}

/** Quantos documentos de cada tipo a disciplina tem. */
export function contarTipos(disc) {
  const contagem = {};
  for (const d of docsDaDisciplina(disc)) contagem[d.tipo] = (contagem[d.tipo] ?? 0) + 1;
  return contagem;
}

/**
 * Busca no índice enxuto. Casa por prefixo de palavra, não por substring solta:
 * "ana" acha "Anamnese" mas não "Ciências Humanas", que é o que a pessoa espera.
 */
export function buscar(indice, consulta, limite = 40) {
  const q = String(consulta ?? "").trim().toLowerCase();
  if (q.length < 2 || !indice) return [];

  const termos = q.split(/\s+/);
  const pontuados = [];

  for (const it of indice.busca) {
    const alvo = `${it.t} ${it.tm}`.toLowerCase();
    let pontos = 0;
    let todosBatem = true;

    for (const termo of termos) {
      const i = alvo.indexOf(termo);
      if (i === -1) { todosBatem = false; break; }
      // Começo do alvo vale mais que começo de palavra, que vale mais que meio.
      if (i === 0) pontos += 10;
      else if (/\s/.test(alvo[i - 1])) pontos += 6;
      else pontos += 1;
    }
    if (!todosBatem) continue;
    if (alvo.startsWith(q)) pontos += 20;
    pontuados.push({ ...it, pontos });
  }

  return pontuados.sort((a, b) => b.pontos - a.pontos).slice(0, limite);
}

/** Rotas — em um lugar só, pra ninguém montar URL na mão. */
export const rota = {
  inicio: () => "/",
  disciplinas: () => "/disciplinas",
  disciplina: (d) => `/disciplina/${d}`,
  parcial: (d, p) => `/disciplina/${d}/${p}`,
  tema: (d, p, t) => `/disciplina/${d}/${p}/${t}`,
  leitura: (id) => `/ler/${id}`,
  biblioteca: () => "/biblioteca",
  agenda: () => "/agenda",
  contribuir: () => "/contribuir",
  buscar: (q) => `/buscar?q=${encodeURIComponent(q ?? "")}`,
};
