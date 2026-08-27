/**
 * Página de disciplina — as parciais disponíveis.
 * Primeiro degrau do caminho: disciplina → parcial → tema → artefatos.
 */

import { useParams, Link } from "react-router-dom";
import { useIndice, acharDisciplina, contarTipos, rota } from "../lib/dados.js";
import Icone from "../components/Icones.jsx";
import Carregando from "../components/Carregando.jsx";
import NaoAchou from "../components/NaoAchou.jsx";
import "../styles/paginas.css";
import "./Disciplina.css";

export default function Disciplina() {
  const { disciplina } = useParams();
  const { dados: indice, carregando } = useIndice();

  if (carregando) return <Carregando rotulo="Carregando disciplina" />;

  const disc = acharDisciplina(indice, disciplina);
  if (!disc) {
    return (
      <NaoAchou
        titulo="Disciplina não encontrada"
        descricao={`Não existe nenhuma disciplina com o endereço "${disciplina}". Ela pode ter sido renomeada.`}
        paraRotulo="Ver todas as disciplinas"
        para={rota.disciplinas()}
      />
    );
  }

  const contagem = contarTipos(disc);
  const tipos = Object.entries(contagem)
    .map(([chave, n]) => ({ chave, n, ...indice.tiposArtefato[chave] }))
    .sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));

  return (
    <div className="mv-pag" data-acento={disc.acento}>
      <header className="mv-heroi">
        <p className="mv-heroi__sobre mv-sobrelinha">
          {indice.periodos.find((p) => p.numero === disc.periodo)?.rotulo ??
            "Sem período"}
        </p>
        <h1 className="mv-heroi__titulo">{disc.rotulo}</h1>
        {disc.descricao && <p className="mv-heroi__desc">{disc.descricao}</p>}

        <div className="mv-fatos">
          <span className="mv-fato">
            <span className="mv-fato__n">{disc.total.toLocaleString("pt-BR")}</span>
            <span className="mv-fato__r">materiais</span>
          </span>
          <span className="mv-fato">
            <span className="mv-fato__n">{disc.parciais.length}</span>
            <span className="mv-fato__r">
              {disc.parciais.length === 1 ? "parcial" : "parciais"}
            </span>
          </span>
          <span className="mv-fato">
            <span className="mv-fato__n">
              {disc.parciais.reduce((s, p) => s + p.temas.length, 0)}
            </span>
            <span className="mv-fato__r">temas</span>
          </span>
        </div>

        {tipos.length > 0 && (
          <div className="mv-chips mv-disc__tipos">
            {tipos.map((t) => (
              <span key={t.chave} className="mv-chip">
                <Icone nome={t.icone ?? "resumo"} tamanho={14} />
                {t.rotulo ?? t.chave}
                <span className="mv-chip__n">{t.n}</span>
              </span>
            ))}
          </div>
        )}
      </header>

      <section className="mv-secao">
        <div className="mv-secao__topo">
          <h2 className="mv-secao__titulo">Parciais</h2>
          <p className="mv-secao__nota">
            {disc.total.toLocaleString("pt-BR")} materiais no total
          </p>
        </div>

        {disc.parciais.length === 0 ? (
          <div className="mv-vazio">
            <p className="mv-vazio__t">Ainda sem material</p>
            <p className="mv-vazio__d">
              Esta disciplina existe no vault mas nada foi processado ainda.
              Assim que alguém enviar resumos ou aulas, eles aparecem aqui.
            </p>
            <Link className="mv-acao" to={rota.contribuir()}>
              <Icone nome="enviar" tamanho={16} />
              Enviar material
            </Link>
          </div>
        ) : (
          <div className="mv-parciais">
            {disc.parciais.map((p) => (
              <Link
                key={p.chave}
                to={rota.parcial(disc.slug, p.chave)}
                className="mv-parcial"
              >
                <span className="mv-parcial__cabeca">
                  <span className="mv-parcial__rotulo">{p.rotulo}</span>
                  <span className="mv-parcial__n mv-num">
                    {p.total} {p.total === 1 ? "material" : "materiais"}
                    <span aria-hidden="true"> · </span>
                    {p.temas.length} {p.temas.length === 1 ? "tema" : "temas"}
                  </span>
                </span>

                <span className="mv-parcial__amostra">
                  {p.temas.slice(0, 4).map((t) => (
                    <span key={t.slug} className="mv-parcial__tema">
                      {t.rotulo}
                    </span>
                  ))}
                  {p.temas.length > 4 && (
                    <span className="mv-parcial__mais mv-num">
                      +{p.temas.length - 4}
                    </span>
                  )}
                </span>

                <Icone nome="seta" tamanho={17} className="mv-parcial__seta" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
