/**
 * Estado de carregamento.
 *
 * Aparece só depois de 180ms. Spinner que pisca em carregamento de 40ms deixa
 * a interface mais nervosa do que se não houvesse nada.
 */
import { useEffect, useState } from "react";
import "./Carregando.css";

export default function Carregando({ rotulo = "Carregando" }) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisivel(true), 180);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="mv-carregando" role="status" aria-live="polite" data-visivel={visivel}>
      <div className="mv-carregando__pulso" aria-hidden="true">
        <span /><span /><span />
      </div>
      <span className="mv-sr">{rotulo}</span>
    </div>
  );
}

/** Bloco de esqueleto, para quando se conhece a forma do que vem. */
export function Esqueleto({ largura = "100%", altura = "1em", raio = "var(--mv-r-sm)", estilo }) {
  return (
    <span
      className="mv-esqueleto"
      aria-hidden="true"
      style={{ width: largura, height: altura, borderRadius: raio, ...estilo }}
    />
  );
}
