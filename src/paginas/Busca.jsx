/**
 * Busca.
 *
 * O termo vive na URL, não no estado: assim o resultado é compartilhável, que
 * é como grupo de estudo conversa ("olha esse link"). A digitação atualiza a
 * URL com `replace`, para não entulhar o histórico com uma entrada por letra.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useIndice, buscar, rota } from "../lib/dados.js";
import Icone from "../components/Icones.jsx";
import Carregando from "../components/Carregando.jsx";
import "../styles/paginas.css";
import "./Busca.css";

export default function Busca() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [texto, setTexto] = useState(q);
  const { dados: indice, carregando } = useIndice();

  // Reflete mudança externa da URL (voltar, link colado) na caixa de texto.
  useEffect(() => { setTexto(q); }, [q]);

  // Debounce da URL, não da busca. A busca é local e instantânea; o que custa
  // é mexer no histórico a cada tecla.
  useEffect(() => {
    if (texto === q) return;
    const t = setTimeout(() => {
      setParams(texto.trim() ? { q: texto.trim() } : {}, { replace: true });
    }, 150);
    return () => clearTimeout(t);
  }, [texto, q, setParams]);

  const resultados = useMemo(
    () => (indice && texto.trim().length >= 2 ? buscar(indice, texto, 120) : []),
    [indice, texto],
  );

  // Agrupado por DISCIPLINA, não por tipo: quem busca "anamnese" quer saber
  // de qual matéria é o resultado antes de saber se é resumo ou flashcard.
  const grupos = useMemo(() => {
    if (!indice || !resultados.length) return [];
    const porDisc = new Map();
    for (const r of resultados) {
      if (!porDisc.has(r.d)) porDisc.set(r.d, []);
      porDisc.get(r.d).push(r);
    }
    return [...porDisc.entries()]
      .map(([slug, itens]) => {
        const d = indice.disciplinas.find((x) => x.slug === slug);
        return {
          slug,
          rotulo: d?.rotulo ?? slug,
          acento: d?.acento ?? "neutro",
          itens,
        };
      })
      .sort((a, b) => b.itens.length - a.itens.length);
  }, [indice, resultados]);

  // Temas mais ricos, para o estado inicial não ser uma tela vazia.
  const sugestoes = useMemo(() => {
    if (!indice) return [];
    const t = [];
    for (const d of indice.disciplinas) {
      if (d.slug === "outros") continue;
      for (const p of d.parciais)
        for (const tema of p.temas)
          if (tema.total >= 4 && tema.slug !== "sem-tema")
            t.push({ ...tema, disc: d, parcial: p });
    }
    return t.sort((a, b) => b.total - a.total).slice(0, 12);
  }, [indice]);

  if (carregando) return <Carregando rotulo="Carregando índice" />;

  const curto = texto.trim().length > 0 && texto.trim().length < 2;

  return (
    <div className="mv-pag mv-busca">
      <header className="mv-heroi">
        <p className="mv-heroi__sobre mv-sobrelinha">Busca</p>
        <h1 className="mv-heroi__titulo">
          {q ? <>Resultados para <em className="mv-busca__termo">{q}</em></> : "O que você procura?"}
        </h1>
      </header>

      <form className="mv-busca__campo" role="search" onSubmit={(e) => e.preventDefault()}>
        <Icone nome="buscar" tamanho={19} />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Tema, disciplina, palavra do título…"
          aria-label="Buscar material"
          autoFocus
        />
        {texto && (
          <button
            type="button"
            className="mv-busca__limpar"
            onClick={() => setTexto("")}
            aria-label="Limpar busca"
          >
            <Icone nome="fechar" tamanho={16} />
          </button>
        )}
      </form>

      {curto && (
        <p className="mv-busca__dica">Digite pelo menos duas letras.</p>
      )}

      {!texto.trim() && (
        <section className="mv-secao">
          <div className="mv-secao__topo">
            <h2 className="mv-secao__titulo">Temas com mais material</h2>
            <p className="mv-secao__nota">um bom lugar para começar</p>
          </div>
          <div className="mv-busca__sugestoes">
            {sugestoes.map((s) => (
              <Link
                key={`${s.disc.slug}-${s.parcial.chave}-${s.slug}`}
                to={rota.tema(s.disc.slug, s.parcial.chave, s.slug)}
                className="mv-busca__sugestao"
                data-acento={s.disc.acento}
              >
                <span className="mv-busca__sug-disc">{s.disc.rotulo}</span>
                <span className="mv-busca__sug-tema">{s.rotulo}</span>
                <span className="mv-busca__sug-n mv-num">{s.total}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {texto.trim().length >= 2 && resultados.length === 0 && (
        <div className="mv-vazio">
          <p className="mv-vazio__t">Nada encontrado para “{texto.trim()}”</p>
          <p className="mv-vazio__d">
            A busca casa por começo de palavra no título e no tema. Tente um
            termo mais curto, ou procure pelo nome do tema em vez do assunto —
            o material do vault usa muito termo em espanhol.
          </p>
          <Link className="mv-acao mv-acao--fantasma" to={rota.biblioteca()}>
            Vasculhar a biblioteca inteira
            <Icone nome="seta" tamanho={15} />
          </Link>
        </div>
      )}

      {resultados.length > 0 && (
        <>
          <p className="mv-busca__conta mv-num">
            <strong>{resultados.length}</strong>{" "}
            {resultados.length === 1 ? "resultado" : "resultados"} em{" "}
            {grupos.length} {grupos.length === 1 ? "disciplina" : "disciplinas"}
          </p>

          {grupos.map((g) => (
            <section key={g.slug} className="mv-secao" data-acento={g.acento}>
              <div className="mv-secao__topo">
                <h2 className="mv-secao__titulo">{g.rotulo}</h2>
                <p className="mv-secao__nota">{g.itens.length}</p>
              </div>

              <ul className="mv-busca__lista">
                {g.itens.map((r) => (
                  <li key={r.id}>
                    <Link to={rota.leitura(r.id)} className="mv-busca__item">
                      <Icone
                        nome={indice.tiposArtefato[r.tp]?.icone ?? "resumo"}
                        tamanho={16}
                        className="mv-busca__icone"
                      />
                      <span className="mv-busca__corpo">
                        <span className="mv-busca__titulo">
                          <Realce texto={r.t} termo={texto.trim()} />
                        </span>
                        <span className="mv-busca__meta">
                          {indice.tiposArtefato[r.tp]?.rotulo ?? r.tp}
                          <span aria-hidden="true"> · </span>
                          {r.tm}
                          <span aria-hidden="true"> · </span>
                          <span className="mv-num">{r.m} min</span>
                        </span>
                      </span>
                      <Icone nome="seta" tamanho={15} className="mv-busca__seta" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

/** Realça cada termo da consulta dentro do título. */
function Realce({ texto, termo }) {
  const termos = termo.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  if (!termos.length) return texto;

  const re = new RegExp(
    `(${termos.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );
  const partes = String(texto).split(re);

  return partes.map((p, i) =>
    termos.includes(p.toLowerCase())
      ? <mark key={i} className="mv-busca__realce">{p}</mark>
      : p,
  );
}
