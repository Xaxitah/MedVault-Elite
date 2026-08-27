/**
 * Cartão de artefato — usado nas páginas de tema, biblioteca e busca.
 *
 * Prancha, princípio 2: sem borda, sem sombra, sem fundo. A separação vem do
 * espaço e de um fio no hover. Card com moldura tripla é o que transforma
 * portal de estudo em folheto.
 */

import { Link } from "react-router-dom";
import Icone from "./Icones.jsx";
import { rota } from "../lib/dados.js";
import "./CartaoArtefato.css";

export default function CartaoArtefato({ doc, icone = "resumo", mostrarCapa = true }) {
  const temCapa = mostrarCapa && Boolean(doc.capa);

  return (
    <Link
      to={rota.leitura(doc.id)}
      className={`mv-cart${temCapa ? " mv-cart--capa" : ""}`}
    >
      {temCapa && (
        <span className="mv-cart__capa" aria-hidden="true">
          <img src={doc.capa} alt="" loading="lazy" decoding="async" />
        </span>
      )}

      <span className="mv-cart__corpo">
        <span className="mv-cart__topo">
          <Icone nome={icone} tamanho={16} className="mv-cart__icone" />
          <span className="mv-cart__titulo">{doc.titulo}</span>
        </span>

        <span className="mv-cart__meta mv-num">
          <span>{doc.minutos} min</span>
          {doc.figuras > 0 && (
            <>
              <span className="mv-cart__ponto" aria-hidden="true" />
              <span>{doc.figuras} {doc.figuras === 1 ? "figura" : "figuras"}</span>
            </>
          )}
        </span>
      </span>

      <Icone nome="seta" tamanho={15} className="mv-cart__seta" />
    </Link>
  );
}

/**
 * Grupo de artefatos de um mesmo tipo, com o ícone que o dono pediu
 * nominalmente ("dentro dos temas quero que os materiais estejam separados
 * em ícones").
 */
export function GrupoTipo({ tipo }) {
  return (
    <section className="mv-grupo">
      <header className="mv-grupo__topo">
        <span className="mv-grupo__selo">
          <Icone nome={tipo.icone} tamanho={19} />
        </span>
        <span className="mv-grupo__texto">
          <span className="mv-grupo__rotulo">{tipo.rotulo}</span>
          {tipo.descricao && <span className="mv-grupo__desc">{tipo.descricao}</span>}
        </span>
        <span className="mv-grupo__n mv-num">{tipo.docs.length}</span>
      </header>

      <div className="mv-grupo__itens">
        {tipo.docs.map((d) => (
          <CartaoArtefato key={d.id} doc={d} icone={tipo.icone} />
        ))}
      </div>
    </section>
  );
}
