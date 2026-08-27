/**
 * Volume — o objeto físico que representa uma disciplina.
 *
 * Traduz a mecânica da Stripe Press (objeto 3D que responde ao ponteiro e ao
 * scroll) para a linguagem Prancha: não é capa dura brilhante de livro de
 * tecnologia, é um FASCÍCULO DE ATLAS — papel, lombada costurada, etiqueta
 * impressa, pigmento contido.
 *
 * CSS 3D puro. Sem WebGL, sem three.js: são 11 objetos numa página e a
 * biblioteca custaria mais que o efeito.
 */

import { useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import Icone from "./Icones.jsx";
import { rota } from "../lib/dados.js";
import "./Volume3D.css";

/** Espessura da lombada em px, proporcional ao acervo — raiz para comprimir
 *  a faixa (128 a 315 materiais) num intervalo visual legível. */
function espessura(total) {
  const t = Math.max(0, Number(total) || 0);
  return Math.round(10 + Math.sqrt(t) * 1.5);
}

export default function Volume3D({ disc, tipos = [], destaque = false }) {
  const ref = useRef(null);
  const pendente = useRef(0);

  /**
   * A inclinação é escrita DIRETO no DOM, não em estado do React.
   *
   * Guardar num useState re-renderizava toda a subárvore a cada evento de
   * pointermove — que dispara ~120×/s — e com 8 volumes na tela isso travava
   * o renderer de verdade. Transform seguindo ponteiro é justamente o caso em
   * que estado do React é a ferramenta errada: o valor não descreve a UI, só
   * pinta um pixel.
   *
   * requestAnimationFrame coalesce vários eventos num único write por quadro.
   */
  const aoMover = useCallback((e) => {
    const el = ref.current;
    if (!el || pendente.current) return;
    pendente.current = requestAnimationFrame(() => {
      pendente.current = 0;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      // Limitado a 12°: acima disso vira brinquedo, e a gente quer que
      // pareça caro, não divertido.
      el.style.setProperty("--incl-x", `${(-py * 12).toFixed(2)}deg`);
      el.style.setProperty("--incl-y", `${(px * 12).toFixed(2)}deg`);
    });
  }, []);

  const aoSair = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(pendente.current);
    pendente.current = 0;
    el.style.setProperty("--incl-x", "0deg");
    el.style.setProperty("--incl-y", "0deg");
  }, []);

  const larg = espessura(disc.total);

  return (
    <Link
      to={rota.disciplina(disc.slug)}
      className={`mv-vol${destaque ? " mv-vol--destaque" : ""}`}
      data-acento={disc.acento}
      ref={ref}
      onPointerMove={aoMover}
      onPointerLeave={aoSair}
      onBlur={aoSair}
    >
      <span className="mv-vol__palco" aria-hidden="true">
        <span className="mv-vol__corpo" style={{ "--lombada": `${larg}px` }}>
          {/* Capa: etiqueta impressa de fascículo. */}
          <span className="mv-vol__face mv-vol__face--capa">
            <span className="mv-vol__etiqueta">
              <span className="mv-vol__periodo">{disc.periodo}º</span>
              <span className="mv-vol__regua" />
              <span className="mv-vol__nome">{disc.rotulo}</span>
              <span className="mv-vol__n mv-num">
                {disc.total.toLocaleString("pt-BR")}
              </span>
            </span>
            {/* Fios de costura — a marca de fascículo encadernado. */}
            <span className="mv-vol__costura">
              <i /><i /><i />
            </span>
          </span>
          {/* Lombada. */}
          <span className="mv-vol__face mv-vol__face--lombada" />
          {/* Miolo: as folhas empilhadas aparecendo na borda. */}
          <span className="mv-vol__folhas" />
        </span>
      </span>

      <span className="mv-vol__legenda">
        <span className="mv-vol__legenda-topo">
          <span className="mv-vol__ponto" aria-hidden="true" />
          <span className="mv-vol__legenda-nome">{disc.rotulo}</span>
        </span>
        <span className="mv-vol__legenda-desc">{disc.descricao}</span>
        {tipos.length > 0 && (
          <span className="mv-vol__tipos">
            {tipos.slice(0, 5).map((t) => (
              <span key={t.chave} className="mv-vol__tipo" title={t.rotulo}>
                <Icone nome={t.icone} tamanho={14} />
                <span className="mv-num">{t.n}</span>
              </span>
            ))}
          </span>
        )}
      </span>
    </Link>
  );
}
