/**
 * Filtros — peças compartilhadas entre a Biblioteca e a Busca.
 *
 * A lista de filtros é a nav da Stripe Docs medida no dossiê (2.2), aplicada a
 * outro problema: indentação ZERO — todo item no mesmo x —, cabeçalho de grupo
 * no mesmo corpo do item (só versalete e peso o distinguem), e estado ativo
 * TIPOGRÁFICO. Sem pílula, sem caixa, sem borda à esquerda. A hierarquia vive
 * em dois eixos (grupo × item), não no recuo.
 *
 * O marcador é a assinatura visual nº4 — círculo vazado que enche. Aqui ele
 * não é enfeite: tokens.css mediu petroleo e eucalipto colapsando um no outro
 * em deuteranopia, então todo filtro carrega FORMA + RÓTULO além da cor.
 */

import "./Filtros.css";

/* Glifos locais. O conjunto compartilhado (Icones.jsx) não tem "lista" nem
   "check", e nesta rodada ele é de outro agente — pedido de inclusão está no
   relatório. Mesma grade de 24 e mesmo traço de 1.5, para não destoar. */
const baseGlifo = {
  viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round",
  "aria-hidden": "true", focusable: "false",
};

export function GlifoLista({ tamanho = 18 }) {
  return (
    <svg {...baseGlifo} width={tamanho} height={tamanho}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </svg>
  );
}

export function GlifoX({ tamanho = 14 }) {
  return (
    <svg {...baseGlifo} width={tamanho} height={tamanho}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
    </svg>
  );
}

// ── faceteamento ────────────────────────────────────────────────────────────

/**
 * Filtra e conta as facetas na MESMA passada.
 *
 * A contagem de cada eixo ignora o filtro DELE e aplica o dos outros — é o que
 * faz "Farmacologia 230" continuar dizendo algo depois que você já marcou
 * "Resumos". Contar com o próprio filtro aplicado daria sempre 0 nas opções
 * não marcadas, e a pessoa perderia o mapa de para onde ainda dá pra ir.
 *
 * Truque que evita uma passada por eixo: um item que falha em NENHUM eixo
 * entra no resultado e conta em todos; um item que falha em EXATAMENTE UM
 * conta só naquele. Quem falha em dois ou mais não conta em lugar nenhum.
 */
export function facetar(itens, eixos, selecao) {
  const ativos = eixos.map((e) => {
    const marcados = selecao?.[e.chave];
    return {
      chave: e.chave,
      campo: e.campo,
      conjunto: marcados && marcados.length ? new Set(marcados) : null,
    };
  });

  const contagens = {};
  for (const e of eixos) contagens[e.chave] = new Map();

  const resultado = [];

  for (const item of itens) {
    let falhas = 0;
    let qualFalhou = -1;

    for (let i = 0; i < ativos.length; i++) {
      const a = ativos[i];
      if (a.conjunto && !a.conjunto.has(item[a.campo])) {
        falhas++;
        qualFalhou = i;
        if (falhas > 1) break;
      }
    }

    if (falhas === 0) {
      resultado.push(item);
      for (let i = 0; i < ativos.length; i++) {
        const a = ativos[i];
        const m = contagens[a.chave];
        const v = item[a.campo];
        m.set(v, (m.get(v) ?? 0) + 1);
      }
    } else if (falhas === 1) {
      const a = ativos[qualFalhou];
      const m = contagens[a.chave];
      const v = item[a.campo];
      m.set(v, (m.get(v) ?? 0) + 1);
    }
  }

  return { resultado, contagens };
}

/**
 * Quantos itens sobrariam se este eixo fosse solto.
 *
 * Sai de graça da contagem de facetas: somar o mapa de um eixo é exatamente
 * "quantos itens casam com todos os OUTROS eixos". É isso que alimenta o
 * estado vazio útil — dizer qual filtro afrouxar, e quanto ele devolve.
 */
export const somar = (mapa) => {
  let t = 0;
  for (const n of mapa.values()) t += n;
  return t;
};

// ── painel (rail) ───────────────────────────────────────────────────────────

/**
 * @param eixos   [{ chave, rotulo, campo, opcoes:[{ valor, rotulo, contagem, acento, icone }] }]
 * @param selecao { [chave]: string[] }
 */
export default function PainelFiltros({
  eixos, selecao, aoAlternar, aoLimparEixo, aoLimparTudo, idPainel,
}) {
  const totalAtivos = eixos.reduce((s, e) => s + (selecao?.[e.chave]?.length ?? 0), 0);

  return (
    <div className="mv-filtros" id={idPainel}>
      <div className="mv-filtros__topo">
        <p className="mv-sobrelinha">Filtrar</p>
        {totalAtivos > 0 && (
          <button type="button" className="mv-filtros__limpar" onClick={aoLimparTudo}>
            Limpar {totalAtivos}
          </button>
        )}
      </div>

      {eixos.map((eixo) => {
        const marcados = selecao?.[eixo.chave] ?? [];
        return (
          <section key={eixo.chave} className="mv-filtros__grupo">
            <div className="mv-filtros__cabecalho">
              <h2 className="mv-filtros__grupo-rotulo" id={`mv-eixo-${eixo.chave}`}>
                {eixo.rotulo}
              </h2>
              {marcados.length > 0 && (
                <button
                  type="button"
                  className="mv-filtros__soltar"
                  onClick={() => aoLimparEixo(eixo.chave)}
                >
                  soltar
                </button>
              )}
            </div>

            <ul className="mv-filtros__lista" aria-labelledby={`mv-eixo-${eixo.chave}`}>
              {eixo.opcoes.map((o) => {
                const ativo = marcados.includes(o.valor);
                const vazio = !ativo && o.contagem === 0;
                return (
                  <li key={o.valor}>
                    <button
                      type="button"
                      className="mv-filtros__opcao"
                      data-acento={o.acento}
                      aria-pressed={ativo}
                      disabled={vazio}
                      onClick={() => aoAlternar(eixo.chave, o.valor)}
                    >
                      <span className="mv-filtros__marcador" aria-hidden="true" />
                      {o.glifo}
                      <span className="mv-filtros__opcao-rotulo">{o.rotulo}</span>
                      <span className="mv-filtros__contagem mv-num">
                        {o.contagem.toLocaleString("pt-BR")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ── chips ───────────────────────────────────────────────────────────────────

/**
 * Chip de filtro. Glifo E rótulo, sempre — nunca só a cor (tokens.css, regra
 * 3 da paleta). O glifo do tipo de artefato é a marca que sobrevive à
 * simulação de deuteranopia; a cor só reforça.
 */
export function Chip({ glifo, rotulo, contagem, ativo, acento, aoClicar, titulo }) {
  return (
    <button
      type="button"
      className="mv-chip"
      data-acento={acento}
      aria-pressed={ativo}
      title={titulo}
      onClick={aoClicar}
    >
      {glifo}
      <span className="mv-chip__rotulo">{rotulo}</span>
      {contagem != null && (
        <span className="mv-chip__contagem mv-num">{contagem.toLocaleString("pt-BR")}</span>
      )}
    </button>
  );
}

/** Faixa horizontal de chips — o refino da Busca, e os filtros ativos. */
export function FaixaChips({ rotulo, children }) {
  return (
    <div className="mv-faixa">
      {rotulo && <span className="mv-faixa__rotulo mv-sobrelinha">{rotulo}</span>}
      <div className="mv-faixa__chips">{children}</div>
    </div>
  );
}

/** Chip de filtro já aplicado: some quando clicado. O × é o glifo. */
export function ChipAtivo({ rotulo, valor, acento, aoRemover }) {
  return (
    <button
      type="button"
      className="mv-chip mv-chip--ativo-remover"
      data-acento={acento}
      onClick={aoRemover}
      aria-label={`Remover filtro ${rotulo}: ${valor}`}
    >
      <span className="mv-chip__eixo">{rotulo}</span>
      <span className="mv-chip__rotulo">{valor}</span>
      <GlifoX tamanho={13} />
    </button>
  );
}
