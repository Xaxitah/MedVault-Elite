/**
 * Página de tema — o clímax do caminho.
 *
 * "dentro dos temas quero que os materiais estejam separados em ícones:
 *  resumos, resumos de véspera, mapas mentais, flashcards, questões,
 *  Podcast, infográfico, vídeos etc." — é isto aqui.
 *
 * Tipo sem material NÃO aparece apagado. Mostrar "Podcast (0)" em cinza
 * enche a tela de ausência; o tema mostra o que tem.
 */

import { useParams, Link } from "react-router-dom";
import {
  useIndice, acharDisciplina, acharParcial, acharTema, rota,
} from "../lib/dados.js";
import { GrupoTipo } from "../components/CartaoArtefato.jsx";
import Icone from "../components/Icones.jsx";
import Carregando from "../components/Carregando.jsx";
import NaoAchou from "../components/NaoAchou.jsx";
import "../styles/paginas.css";
import "./Tema.css";

export default function Tema() {
  const { disciplina, parcial, tema } = useParams();
  const { dados: indice, carregando } = useIndice();

  if (carregando) return <Carregando rotulo="Carregando tema" />;

  const disc = acharDisciplina(indice, disciplina);
  const parc = acharParcial(disc, parcial);
  const tem = acharTema(parc, tema);

  if (!disc || !parc || !tem) {
    return (
      <NaoAchou
        titulo="Tema não encontrado"
        descricao={
          parc
            ? `${parc.rotulo} de ${disc.rotulo} não tem um tema chamado "${tema}".`
            : `Endereço inválido: "${disciplina}/${parcial}/${tema}".`
        }
        paraRotulo={parc ? `Ver ${parc.rotulo}` : "Ver todas as disciplinas"}
        para={parc ? rota.parcial(disc.slug, parc.chave) : rota.disciplinas()}
      />
    );
  }

  const totalFiguras = tem.tipos.reduce(
    (s, tp) => s + tp.docs.reduce((n, d) => n + (d.figuras || 0), 0), 0,
  );
  const totalMinutos = tem.tipos.reduce(
    (s, tp) => s + tp.docs.reduce((n, d) => n + (d.minutos || 0), 0), 0,
  );

  return (
    <div className="mv-pag" data-acento={disc.acento}>
      <header className="mv-heroi">
        <p className="mv-heroi__sobre mv-sobrelinha">
          <Link to={rota.disciplina(disc.slug)}>{disc.rotulo}</Link>
          <span aria-hidden="true"> · </span>
          <Link to={rota.parcial(disc.slug, parc.chave)}>{parc.rotulo}</Link>
        </p>
        <h1 className="mv-heroi__titulo">{tem.rotulo}</h1>

        <div className="mv-fatos">
          <span className="mv-fato">
            <span className="mv-fato__n">{tem.total}</span>
            <span className="mv-fato__r">
              {tem.total === 1 ? "material" : "materiais"}
            </span>
          </span>
          <span className="mv-fato">
            <span className="mv-fato__n">{tem.tipos.length}</span>
            <span className="mv-fato__r">
              {tem.tipos.length === 1 ? "formato" : "formatos"}
            </span>
          </span>
          {totalFiguras > 0 && (
            <span className="mv-fato">
              <span className="mv-fato__n">{totalFiguras.toLocaleString("pt-BR")}</span>
              <span className="mv-fato__r">figuras</span>
            </span>
          )}
          <span className="mv-fato">
            <span className="mv-fato__n">{totalMinutos}</span>
            <span className="mv-fato__r">min de leitura</span>
          </span>
        </div>
      </header>

      {tem.tipos.length === 0 ? (
        <div className="mv-vazio">
          <p className="mv-vazio__t">Este tema ainda não tem material</p>
          <p className="mv-vazio__d">
            Se você tem resumo, slide ou gravação deste tema, enviar aqui
            alimenta o vault e vira material para o grupo todo.
          </p>
          <Link className="mv-acao" to={rota.contribuir()}>
            <Icone nome="enviar" tamanho={16} />
            Enviar material
          </Link>
        </div>
      ) : (
        <div className="mv-tema__grupos">
          {tem.tipos.map((tp) => (
            <GrupoTipo key={tp.chave} tipo={tp} />
          ))}
        </div>
      )}
    </div>
  );
}
