/**
 * Bloco de "não encontrado" reaproveitável.
 *
 * Existe para que slug inválido na URL nunca dê tela branca — que é o jeito
 * mais barato de um site parecer quebrado.
 */

import { Link } from "react-router-dom";
import Icone from "./Icones.jsx";
import "../styles/paginas.css";

export default function NaoAchou({ titulo, descricao, para, paraRotulo }) {
  return (
    <div className="mv-pag">
      <div className="mv-vazio">
        <p className="mv-vazio__t">{titulo}</p>
        <p className="mv-vazio__d">{descricao}</p>
        {para && (
          <Link className="mv-acao" to={para}>
            {paraRotulo}
            <Icone nome="seta" tamanho={15} />
          </Link>
        )}
      </div>
    </div>
  );
}
