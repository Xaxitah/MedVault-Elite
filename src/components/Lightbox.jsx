/**
 * Lightbox de figura.
 *
 * Sem biblioteca: são ~70 linhas e evita 40 KB de dependência. O que uma
 * biblioteca daria de graça e aqui é feito à mão — e não pode faltar:
 *   - Esc fecha
 *   - foco preso enquanto aberto
 *   - foco devolvido a quem abriu
 *   - rolagem do fundo travada
 *   - clicar fora fecha, clicar na imagem não
 */

import { useEffect, useRef } from "react";
import Icone from "./Icones.jsx";
import "./Lightbox.css";

export default function Lightbox({ figura, aoFechar }) {
  const refCaixa = useRef(null);
  const refAnterior = useRef(null);

  useEffect(() => {
    refAnterior.current = document.activeElement;
    refCaixa.current?.focus();

    // Trava a rolagem do fundo compensando a barra, senão a página dá um
    // pulo lateral ao abrir.
    const largura = window.innerWidth - document.documentElement.clientWidth;
    const overflowAntes = document.body.style.overflow;
    const padAntes = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (largura > 0) document.body.style.paddingRight = `${largura}px`;

    const aoTeclar = (e) => {
      if (e.key === "Escape") { e.preventDefault(); aoFechar(); return; }
      if (e.key !== "Tab") return;

      // Prende o foco: só o botão de fechar é focável aqui dentro.
      const focaveis = refCaixa.current?.querySelectorAll(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (!focaveis?.length) { e.preventDefault(); return; }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault(); ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault(); primeiro.focus();
      }
    };

    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAntes;
      document.body.style.paddingRight = padAntes;
      refAnterior.current?.focus?.();
    };
  }, [aoFechar]);

  return (
    <div
      className="mv-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Figura ${figura.indice || ""} ampliada`}
      onClick={(e) => { if (e.target === e.currentTarget) aoFechar(); }}
    >
      <div className="mv-lightbox__caixa" ref={refCaixa} tabIndex={-1}>
        <button className="mv-lightbox__fechar" onClick={aoFechar} aria-label="Fechar figura">
          <Icone nome="fechar" tamanho={20} />
        </button>

        <img className="mv-lightbox__img" src={figura.src} alt={figura.alt} />

        {figura.legenda && (
          <p className="mv-lightbox__legenda">{figura.legenda}</p>
        )}
      </div>
    </div>
  );
}
