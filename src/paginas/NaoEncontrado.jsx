/**
 * Rota inválida.
 *
 * Sóbria, não engraçadinha: quem cai aqui geralmente clicou num link velho
 * mandado por um colega, e piada não devolve o material que ele queria.
 */

import { Link, useLocation } from "react-router-dom";
import { rota } from "../lib/dados.js";
import Icone from "../components/Icones.jsx";
import "../styles/paginas.css";
import "./NaoEncontrado.css";

export default function NaoEncontrado() {
  const local = useLocation();

  return (
    <div className="mv-pag mv-404">
      <p className="mv-heroi__sobre mv-sobrelinha">Endereço não encontrado</p>
      <h1 className="mv-404__titulo">Esta página não existe</h1>

      <p className="mv-404__texto">
        O endereço <code className="mv-404__url">{local.pathname}</code> não
        corresponde a nada no site. Se você chegou por um link que alguém
        mandou, o material pode ter sido reorganizado no vault — o conteúdo
        provavelmente continua lá, com outro endereço.
      </p>

      <div className="mv-404__saidas">
        <Link className="mv-acao" to={rota.buscar("")}>
          <Icone nome="buscar" tamanho={16} />
          Buscar o material
        </Link>
        <Link className="mv-acao mv-acao--fantasma" to={rota.disciplinas()}>
          Ver disciplinas
        </Link>
        <Link className="mv-acao mv-acao--fantasma" to={rota.inicio()}>
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
