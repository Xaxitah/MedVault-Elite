/**
 * Página de parcial — os temas disponíveis.
 * Segundo degrau: disciplina → PARCIAL → tema → artefatos.
 */

import { useParams, Link } from "react-router-dom";
import { useIndice, acharDisciplina, acharParcial, rota } from "../lib/dados.js";
import Icone from "../components/Icones.jsx";
import Carregando from "../components/Carregando.jsx";
import NaoAchou from "../components/NaoAchou.jsx";
import "../styles/paginas.css";
import "./Parcial.css";

export default function Parcial() {
  const { disciplina, parcial } = useParams();
  const { dados: indice, carregando } = useIndice();

  if (carregando) return <Carregando rotulo="Carregando parcial" />;

  const disc = acharDisciplina(indice, disciplina);
  const parc = acharParcial(disc, parcial);

  if (!disc || !parc) {
    return (
      <NaoAchou
        titulo="Parcial não encontrada"
        descricao={
          disc
            ? `${disc.rotulo} não tem uma parcial chamada "${parcial}".`
            : `Não existe disciplina com o endereço "${disciplina}".`
        }
        paraRotulo={disc ? `Ver ${disc.rotulo}` : "Ver todas as disciplinas"}
        para={disc ? rota.disciplina(disc.slug) : rota.disciplinas()}
      />
    );
  }

  return (
    <div className="mv-pag" data-acento={disc.acento}>
      <header className="mv-heroi">
        <p className="mv-heroi__sobre mv-sobrelinha">
          <Link to={rota.disciplina(disc.slug)}>{disc.rotulo}</Link>
        </p>
        <h1 className="mv-heroi__titulo">{parc.rotulo}</h1>
        <p className="mv-heroi__desc">
          {parc.temas.length} {parc.temas.length === 1 ? "tema" : "temas"} com{" "}
          {parc.total.toLocaleString("pt-BR")}{" "}
          {parc.total === 1 ? "material" : "materiais"}.
        </p>
      </header>

      <section className="mv-secao">
        <div className="mv-secao__topo">
          <h2 className="mv-secao__titulo">Temas</h2>
          <p className="mv-secao__nota">clique para ver os materiais</p>
        </div>

        {parc.temas.length === 0 ? (
          <div className="mv-vazio">
            <p className="mv-vazio__t">Nenhum tema nesta parcial ainda</p>
            <p className="mv-vazio__d">
              O material desta parcial ainda não foi organizado por tema.
            </p>
          </div>
        ) : (
          <ul className="mv-temas">
            {parc.temas.map((t) => (
              <li key={t.slug}>
                <Link
                  to={rota.tema(disc.slug, parc.chave, t.slug)}
                  className="mv-tema"
                >
                  <span className="mv-tema__num mv-num" aria-hidden="true">
                    {t.num < 999 ? String(t.num).padStart(2, "0") : "—"}
                  </span>

                  <span className="mv-tema__corpo">
                    <span className="mv-tema__rotulo">{t.rotulo}</span>
                    <span className="mv-tema__tipos">
                      {t.tipos.map((tp) => (
                        <span key={tp.chave} className="mv-tema__tipo" title={tp.rotulo}>
                          <Icone nome={tp.icone} tamanho={15} />
                          <span className="mv-num">{tp.docs.length}</span>
                        </span>
                      ))}
                    </span>
                  </span>

                  <span className="mv-tema__total mv-num">{t.total}</span>
                  <Icone nome="seta" tamanho={16} className="mv-tema__seta" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
