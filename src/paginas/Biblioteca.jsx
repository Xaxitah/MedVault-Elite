/**
 * Biblioteca — o acervo inteiro, 1.503 documentos.
 *
 * Decisão de desempenho: **janela incremental**, não virtualização.
 * Renderizar 1.503 linhas de uma vez engasga a rolagem; virtualizar de
 * verdade custaria altura fixa por item (que a gente não tem, porque título
 * quebra em duas linhas no celular) ou medição por item. Uma janela que
 * cresce ao chegar perto do fim entrega rolagem fluida com ~40 linhas de
 * código e nenhuma dependência. O filtro roda sobre a lista completa, então
 * a contagem exibida é sempre a real — nunca a da janela.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useIndice, rota } from "../lib/dados.js";
import PainelFiltros, { facetar, somar } from "../components/Filtros.jsx";
import CartaoArtefato from "../components/CartaoArtefato.jsx";
import Icone from "../components/Icones.jsx";
import Carregando from "../components/Carregando.jsx";
import "../styles/paginas.css";
import "./Biblioteca.css";

const PASSO = 60;
const CHAVE_VISTA = "mv:biblioteca:vista";

const ORDENS = [
  { chave: "titulo", rotulo: "Título" },
  { chave: "minutos", rotulo: "Tempo de leitura" },
  { chave: "figuras", rotulo: "Figuras" },
];

export default function Biblioteca() {
  const { dados: indice, carregando, erro } = useIndice();
  const [selecao, setSelecao] = useState({ d: [], tp: [], p: [] });
  const [ordem, setOrdem] = useState("titulo");
  const [vista, setVista] = useState(
    () => localStorage.getItem(CHAVE_VISTA) || "lista",
  );
  const [janela, setJanela] = useState(PASSO);
  const refFim = useRef(null);

  useEffect(() => { localStorage.setItem(CHAVE_VISTA, vista); }, [vista]);

  // Qualquer mudança de filtro ou ordem devolve a janela ao início — senão a
  // pessoa filtra e continua vendo 300 itens carregados do filtro anterior.
  useEffect(() => { setJanela(PASSO); }, [selecao, ordem]);

  // Itens enriquecidos: o índice plano guarda slugs; a UI precisa de rótulos.
  const itens = useMemo(() => {
    if (!indice) return [];
    const disc = new Map(indice.disciplinas.map((d) => [d.slug, d]));
    return indice.busca.map((b) => ({
      id: b.id,
      titulo: b.t,
      disciplina: b.d,
      tipo: b.tp,
      parcial: b.p,
      tema: b.tm,
      minutos: b.m,
      figuras: 0,
      acento: disc.get(b.d)?.acento ?? "neutro",
      discRotulo: disc.get(b.d)?.rotulo ?? b.d,
      tipoRotulo: indice.tiposArtefato[b.tp]?.rotulo ?? b.tp,
      tipoIcone: indice.tiposArtefato[b.tp]?.icone ?? "resumo",
      parcialRotulo: b.p,
    }));
  }, [indice]);

  const eixos = useMemo(() => {
    if (!indice) return [];
    return [
      {
        chave: "d", rotulo: "Disciplina", campo: "disciplina",
        opcoes: indice.disciplinas.map((d) => ({
          valor: d.slug, rotulo: d.rotulo, acento: d.acento, icone: "grade",
        })),
      },
      {
        chave: "tp", rotulo: "Formato", campo: "tipo",
        opcoes: Object.entries(indice.tiposArtefato).map(([k, v]) => ({
          valor: k, rotulo: v.rotulo, icone: v.icone,
        })),
      },
      {
        chave: "p", rotulo: "Parcial", campo: "parcial",
        opcoes: ["P1", "P2", "P3", "P4", "FINAL", "GERAL"].map((k) => ({
          valor: k,
          rotulo: { P1: "1ª Parcial", P2: "2ª Parcial", P3: "3ª Parcial",
                    P4: "4ª Parcial", FINAL: "Prova Final", GERAL: "Geral" }[k],
          icone: "prova",
        })),
      },
    ];
  }, [indice]);

  const { resultado, contagens } = useMemo(
    () => facetar(itens, eixos, selecao),
    [itens, eixos, selecao],
  );

  const ordenado = useMemo(() => {
    const c = [...resultado];
    if (ordem === "titulo") c.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
    else if (ordem === "minutos") c.sort((a, b) => b.minutos - a.minutos);
    else if (ordem === "figuras") c.sort((a, b) => b.figuras - a.figuras || a.titulo.localeCompare(b.titulo, "pt-BR"));
    return c;
  }, [resultado, ordem]);

  // Cresce a janela ao aproximar do fim. IntersectionObserver, não evento de
  // scroll: o evento dispara dezenas de vezes por segundo e briga com a
  // própria rolagem que deveria estar suavizando.
  useEffect(() => {
    const alvo = refFim.current;
    if (!alvo) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setJanela((j) => Math.min(j + PASSO, ordenado.length)); },
      { rootMargin: "600px 0px" },
    );
    obs.observe(alvo);
    return () => obs.disconnect();
  }, [ordenado.length]);

  const alternar = (eixo, valor) =>
    setSelecao((s) => {
      const atual = s[eixo] ?? [];
      return {
        ...s,
        [eixo]: atual.includes(valor)
          ? atual.filter((v) => v !== valor)
          : [...atual, valor],
      };
    });

  const eixosComContagem = eixos.map((e) => ({
    ...e,
    opcoes: e.opcoes
      .map((o) => ({ ...o, contagem: contagens[e.chave]?.get(o.valor) ?? 0 }))
      .filter((o) => o.contagem > 0 || (selecao[e.chave] ?? []).includes(o.valor)),
  }));

  if (carregando) return <Carregando rotulo="Carregando biblioteca" />;

  if (erro) {
    return (
      <div className="mv-pag">
        <div className="mv-vazio">
          <p className="mv-vazio__t">O acervo não carregou</p>
          <p className="mv-vazio__d">
            O índice não respondeu. Recarregue a página.
          </p>
        </div>
      </div>
    );
  }

  const visiveis = ordenado.slice(0, janela);
  const totalAtivos = eixos.reduce((s, e) => s + (selecao[e.chave]?.length ?? 0), 0);

  return (
    <div className="mv-pag mv-bib">
      <header className="mv-heroi">
        <p className="mv-heroi__sobre mv-sobrelinha">Acervo completo</p>
        <h1 className="mv-heroi__titulo">Biblioteca</h1>
        <p className="mv-heroi__desc">
          Tudo que o grupo já produziu, num lugar só. Combine os filtros para
          chegar no que precisa.
        </p>
      </header>

      <div className="mv-bib__grade">
        <aside className="mv-bib__trilho" aria-label="Filtros">
          <PainelFiltros
            eixos={eixosComContagem}
            selecao={selecao}
            aoAlternar={alternar}
            aoLimparEixo={(e) => setSelecao((s) => ({ ...s, [e]: [] }))}
            aoLimparTudo={() => setSelecao({ d: [], tp: [], p: [] })}
            idPainel="mv-filtros-biblioteca"
          />
        </aside>

        <div className="mv-bib__corpo">
          <div className="mv-bib__barra">
            <p className="mv-bib__conta mv-num">
              <strong>{ordenado.length.toLocaleString("pt-BR")}</strong>{" "}
              {ordenado.length === 1 ? "material" : "materiais"}
              {totalAtivos > 0 && (
                <span className="mv-bib__de">
                  {" "}de {itens.length.toLocaleString("pt-BR")}
                </span>
              )}
            </p>

            <div className="mv-bib__controles">
              <label className="mv-bib__ordem">
                <span className="mv-sr">Ordenar por</span>
                <select value={ordem} onChange={(e) => setOrdem(e.target.value)}>
                  {ORDENS.map((o) => (
                    <option key={o.chave} value={o.chave}>{o.rotulo}</option>
                  ))}
                </select>
              </label>

              <div className="mv-bib__vistas" role="group" aria-label="Modo de exibição">
                <button
                  type="button"
                  className="mv-bib__vista"
                  aria-pressed={vista === "lista"}
                  onClick={() => setVista("lista")}
                >
                  <Icone nome="menu" tamanho={16} />
                  <span className="mv-sr">Lista</span>
                </button>
                <button
                  type="button"
                  className="mv-bib__vista"
                  aria-pressed={vista === "grade"}
                  onClick={() => setVista("grade")}
                >
                  <Icone nome="grade" tamanho={16} />
                  <span className="mv-sr">Grade</span>
                </button>
              </div>
            </div>
          </div>

          {ordenado.length === 0 ? (
            <SemResultado
              eixos={eixosComContagem}
              selecao={selecao}
              contagens={contagens}
              aoLimparEixo={(e) => setSelecao((s) => ({ ...s, [e]: [] }))}
              aoLimparTudo={() => setSelecao({ d: [], tp: [], p: [] })}
            />
          ) : (
            <>
              <div className={`mv-bib__itens mv-bib__itens--${vista}`}>
                {visiveis.map((it) => (
                  <div key={it.id} data-acento={it.acento} className="mv-bib__item">
                    <CartaoArtefato doc={it} icone={it.tipoIcone} mostrarCapa={false} />
                    <p className="mv-bib__proc">
                      <span className="mv-bib__disc">{it.discRotulo}</span>
                      <span aria-hidden="true"> · </span>
                      {it.tipoRotulo}
                      {it.tema && (
                        <>
                          <span aria-hidden="true"> · </span>
                          {it.tema}
                        </>
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <div ref={refFim} className="mv-bib__fim" aria-hidden="true" />

              {janela < ordenado.length && (
                <p className="mv-bib__restante mv-num">
                  mostrando {visiveis.length.toLocaleString("pt-BR")} de{" "}
                  {ordenado.length.toLocaleString("pt-BR")}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Estado vazio que serve pra alguma coisa.
 *
 * `somar(contagens[eixo])` é quantos itens sobrariam se AQUELE eixo fosse
 * solto — então dá pra dizer exatamente qual filtro afrouxar e quanto ele
 * devolve, em vez de "nenhum resultado encontrado".
 */
function SemResultado({ eixos, selecao, contagens, aoLimparEixo, aoLimparTudo }) {
  const sugestoes = eixos
    .filter((e) => (selecao[e.chave] ?? []).length > 0)
    .map((e) => ({ eixo: e, devolve: somar(contagens[e.chave] ?? new Map()) }))
    .filter((s) => s.devolve > 0)
    .sort((a, b) => b.devolve - a.devolve);

  return (
    <div className="mv-vazio">
      <p className="mv-vazio__t">Nenhum material com essa combinação</p>
      <p className="mv-vazio__d">
        {sugestoes.length > 0
          ? "Os filtros se contradizem. Soltar um deles devolve resultado:"
          : "Não há nada no acervo que case com o que você marcou."}
      </p>

      {sugestoes.length > 0 && (
        <div className="mv-bib__sugestoes">
          {sugestoes.slice(0, 3).map((s) => (
            <button
              key={s.eixo.chave}
              type="button"
              className="mv-acao mv-acao--fantasma"
              onClick={() => aoLimparEixo(s.eixo.chave)}
            >
              Soltar {s.eixo.rotulo.toLowerCase()}
              <span className="mv-num"> → {s.devolve.toLocaleString("pt-BR")}</span>
            </button>
          ))}
        </div>
      )}

      <button type="button" className="mv-acao" onClick={aoLimparTudo}>
        Limpar todos os filtros
      </button>
    </div>
  );
}
