/**
 * Vitrine de disciplinas.
 *
 * O agrupamento por período precisou ser repensado depois que o dono
 * confirmou a grade real: Biologia Geral no 1º e TODAS as outras no 7º, com a
 * turma hoje no 8º. Tratar cada período como uma cena de peso igual daria uma
 * cena com sete volumes e outra com um item solitário.
 *
 * Solução: o 7º é o corpo da página, ordenado por volume de acervo; o 1º
 * aparece como seção secundária honesta ("de períodos anteriores"); e o balde
 * "Outros" não vira volume — é material não classificado e fingir que é
 * disciplina engana quem lê.
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useIndice, contarTipos, rota } from "../lib/dados.js";
import Volume3D from "../components/Volume3D.jsx";
import Icone from "../components/Icones.jsx";
import Carregando from "../components/Carregando.jsx";
import "../styles/paginas.css";
import "./Disciplinas.css";

export default function Disciplinas() {
  const { dados: indice, carregando, erro } = useIndice();

  const grupos = useMemo(() => {
    if (!indice) return null;

    const comTipos = (d) => {
      const c = contarTipos(d);
      const tipos = Object.entries(c)
        .map(([chave, n]) => ({
          chave,
          n,
          icone: indice.tiposArtefato[chave]?.icone ?? "resumo",
          rotulo: indice.tiposArtefato[chave]?.rotulo ?? chave,
        }))
        .sort((a, b) => b.n - a.n);
      return { ...d, tipos };
    };

    const reais = indice.disciplinas.filter((d) => d.slug !== "outros");
    const outros = indice.disciplinas.find((d) => d.slug === "outros") ?? null;

    // Períodos com disciplina de verdade, do mais recente para o mais antigo —
    // o que a turma cursou por último é o que ela vai procurar primeiro.
    const porPeriodo = new Map();
    for (const d of reais) {
      if (!porPeriodo.has(d.periodo)) porPeriodo.set(d.periodo, []);
      porPeriodo.get(d.periodo).push(comTipos(d));
    }
    const periodos = [...porPeriodo.entries()]
      .map(([numero, discs]) => ({
        numero,
        rotulo: indice.periodos.find((p) => p.numero === numero)?.rotulo ?? `${numero}º Período`,
        discs: discs.sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.numero - a.numero);

    return { periodos, outros, total: reais.reduce((s, d) => s + d.total, 0) };
  }, [indice]);

  if (carregando) return <Carregando rotulo="Carregando disciplinas" />;

  if (erro) {
    return (
      <div className="mv-pag">
        <div className="mv-vazio">
          <p className="mv-vazio__t">O acervo não carregou</p>
          <p className="mv-vazio__d">
            O índice de conteúdo não respondeu. Recarregue a página; se
            persistir, o conteúdo precisa ser gerado de novo.
          </p>
        </div>
      </div>
    );
  }

  if (!grupos) return null;

  const [principal, ...anteriores] = grupos.periodos;

  return (
    <div className="mv-pag mv-discs">
      <header className="mv-heroi">
        <p className="mv-heroi__sobre mv-sobrelinha">
          Acervo do grupo
          {indice.periodoAtual ? ` · ${indice.periodoAtual}º período` : ""}
        </p>
        <h1 className="mv-heroi__titulo">Disciplinas</h1>
        <p className="mv-heroi__desc">
          Cada volume reúne o que o grupo já produziu numa matéria — resumos,
          mapas, flashcards, questões, podcasts. A espessura da lombada mostra
          o tamanho do acervo.
        </p>

        <div className="mv-fatos">
          <span className="mv-fato">
            <span className="mv-fato__n">
              {grupos.periodos.reduce((s, p) => s + p.discs.length, 0)}
            </span>
            <span className="mv-fato__r">disciplinas</span>
          </span>
          <span className="mv-fato">
            <span className="mv-fato__n">{grupos.total.toLocaleString("pt-BR")}</span>
            <span className="mv-fato__r">materiais classificados</span>
          </span>
          <span className="mv-fato">
            <span className="mv-fato__n">
              {indice.stats.figuras.toLocaleString("pt-BR")}
            </span>
            <span className="mv-fato__r">figuras</span>
          </span>
        </div>
      </header>

      {principal && <Periodo periodo={principal} atual />}

      {anteriores.map((p) => (
        <Periodo key={p.numero} periodo={p} />
      ))}

      {grupos.outros && grupos.outros.total > 0 && (
        <section className="mv-secao mv-discs__outros" data-acento="neutro">
          <div className="mv-secao__topo">
            <h2 className="mv-secao__titulo">Ainda sem disciplina</h2>
            <p className="mv-secao__nota">
              {grupos.outros.total.toLocaleString("pt-BR")} materiais
            </p>
          </div>
          <p className="mv-discs__outros-desc">
            Material que existe no vault mas ainda não foi atribuído a uma
            matéria. Continua acessível pela busca e pela biblioteca — só não
            aparece na navegação por disciplina.
          </p>
          <Link className="mv-acao mv-acao--fantasma" to={rota.disciplina("outros")}>
            Ver esses materiais
            <Icone nome="seta" tamanho={15} />
          </Link>
        </section>
      )}
    </div>
  );
}

function Periodo({ periodo, atual = false }) {
  return (
    <section className="mv-secao">
      <div className="mv-secao__topo">
        <h2 className="mv-secao__titulo">
          {periodo.rotulo}
          {atual && <span className="mv-discs__selo">mais recente</span>}
        </h2>
        <p className="mv-secao__nota">
          {periodo.discs.length}{" "}
          {periodo.discs.length === 1 ? "disciplina" : "disciplinas"}
        </p>
      </div>

      <div className="mv-discs__grade">
        {periodo.discs.map((d) => (
          <Volume3D key={d.slug} disc={d} tipos={d.tipos} destaque={atual} />
        ))}
      </div>
    </section>
  );
}
