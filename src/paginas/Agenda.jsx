/**
 * Agenda do grupo — provas, entregas e prazos, editáveis por qualquer pessoa
 * com conta.
 *
 * Duas vistas: LISTA (o padrão, porque a pergunta real é "o que vem agora?") e
 * MÊS (para enxergar aglomeração de provas na mesma semana). O vault já
 * registra isso à mão em `01-Agenda/Calendario-P1.md`, com as colunas
 * Disciplina / Data / Conteúdo / Status — as mesmas quatro informações que o
 * formulário pede, para ninguém precisar reaprender nada.
 *
 * Autoria é parte do conteúdo, não rodapé técnico: numa agenda coletiva, saber
 * quem marcou é saber a quem perguntar quando a data parecer errada.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIndice, acharDisciplina } from "../lib/dados.js";
import { backend, AVISO_MODO } from "../lib/backend.js";
import { useConta } from "../lib/auth.js";
import Icone from "../components/Icones.jsx";
import Carregando from "../components/Carregando.jsx";
import Conta from "../components/Conta.jsx";
import "./Agenda.css";

const TIPOS = [
  { chave: "prova",   rotulo: "Prova",   icone: "prova" },
  { chave: "entrega", rotulo: "Entrega", icone: "enviar" },
  { chave: "aula",    rotulo: "Aula",    icone: "livro" },
];

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

// ── datas ────────────────────────────────────────────────────────────────
// `new Date("2026-09-12")` é lido como meia-noite UTC e, em Assunção (UTC-4),
// volta como dia 11. Toda data aqui é montada campo a campo, no fuso local.

const paraData = (iso) => {
  const [a, m, d] = String(iso).split("-").map(Number);
  return new Date(a, (m ?? 1) - 1, d ?? 1);
};
const paraIso = (data) =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
const hojeIso = () => paraIso(new Date());

const rotuloMes = (iso) => {
  const d = paraData(iso);
  return `${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};
const chaveMes = (iso) => String(iso).slice(0, 7);

const diasAte = (iso) => {
  const dia = 86400000;
  const a = paraData(iso).setHours(0, 0, 0, 0);
  const b = new Date().setHours(0, 0, 0, 0);
  return Math.round((a - b) / dia);
};

/** "hoje", "amanhã", "em 5 dias", "há 3 dias" — o que a pessoa quer saber. */
function proximidade(iso) {
  const n = diasAte(iso);
  if (n === 0) return { texto: "hoje", grau: "hoje" };
  if (n === 1) return { texto: "amanhã", grau: "amanha" };
  if (n === -1) return { texto: "ontem", grau: "passado" };
  if (n > 1 && n <= 30) return { texto: `em ${n} dias`, grau: n <= 7 ? "perto" : "longe" };
  if (n > 30) return { texto: `em ${Math.round(n / 7)} semanas`, grau: "longe" };
  return { texto: `há ${Math.abs(n)} dias`, grau: "passado" };
}

/** Momento de edição, no registro humano: "hoje", "há 4 dias", "12/09". */
function quando(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const horas = (Date.now() - d.getTime()) / 3600000;
  if (horas < 1) return "agora há pouco";
  if (horas < 24) return `há ${Math.round(horas)} h`;
  const dias = Math.round(horas / 24);
  if (dias < 30) return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

// ══════════════════════════════════════════════════════════════════════════

export default function Agenda() {
  const { dados: indice } = useIndice();
  const { conta } = useConta();

  const [eventos, setEventos] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [vista, setVista] = useState("lista");
  const [editando, setEditando] = useState(null); // null | {} | evento
  const [mostrarPassados, setMostrarPassados] = useState(false);
  const [mesVisivel, setMesVisivel] = useState(() => hojeIso().slice(0, 7));

  const recarregar = useCallback(() => {
    setCarregando(true);
    return backend
      .listarEventos()
      .then((e) => { setEventos(e); setErro(null); })
      .catch((e) => setErro(e))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const { proximos, passados } = useMemo(() => {
    const h = hojeIso();
    const lista = eventos ?? [];
    return {
      proximos: lista.filter((e) => e.data >= h),
      passados: lista.filter((e) => e.data < h).reverse(),
    };
  }, [eventos]);

  const porMes = useMemo(() => {
    const mapa = new Map();
    for (const e of proximos) {
      const k = chaveMes(e.data);
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k).push(e);
    }
    return [...mapa.entries()];
  }, [proximos]);

  const abrirNovo = (data) => setEditando({ data: data ?? hojeIso() });

  return (
    <div className="mv-agenda">
      <header className="mv-agenda__cabecalho">
        <div className="mv-agenda__intro">
          <p className="mv-sobrelinha">Agenda do grupo</p>
          <h1 className="mv-agenda__titulo">Provas, entregas e prazos</h1>
          <p className="mv-agenda__linha-fina">
            Qualquer pessoa com conta registra e corrige. Cada data guarda quem
            marcou — quando parecer errada, você sabe a quem perguntar.
          </p>
          <p className="mv-agenda__modo">
            <span className="mv-agenda__modo-ponto" aria-hidden="true" data-local={backend.ehLocal} />
            {AVISO_MODO}
          </p>
        </div>

        <div className="mv-agenda__ferramentas">
          <div className="mv-agenda__vistas" role="group" aria-label="Trocar de vista">
            {[
              { chave: "lista", rotulo: "Lista" },
              { chave: "mes", rotulo: "Mês" },
            ].map((v) => (
              <button
                key={v.chave}
                type="button"
                className={`mv-agenda__vista${vista === v.chave ? " esta-ativo" : ""}`}
                onClick={() => setVista(v.chave)}
                aria-pressed={vista === v.chave}
              >
                {v.rotulo}
              </button>
            ))}
          </div>

          {conta && (
            <button type="button" className="mv-agenda__novo" onClick={() => abrirNovo()}>
              <Icone nome="agenda" tamanho={17} />
              Registrar data
            </button>
          )}
        </div>
      </header>

      {carregando && !eventos && <Carregando rotulo="Carregando a agenda" />}

      {erro && (
        <div className="mv-agenda__falha" role="alert">
          <p className="mv-sobrelinha">Não deu para carregar</p>
          <p>{erro.message}</p>
          <button type="button" className="mv-agenda__novo" onClick={recarregar}>
            Tentar de novo
          </button>
        </div>
      )}

      {eventos && !erro && (
        eventos.length === 0 ? (
          <Vazio conta={conta} aoCriar={() => abrirNovo()} />
        ) : vista === "lista" ? (
          <>
            {porMes.length === 0 && (
              <p className="mv-agenda__nada-adiante">
                Nada marcado daqui para a frente. O que já passou está logo abaixo.
              </p>
            )}

            {porMes.map(([mes, itens]) => (
              <section key={mes} className="mv-agenda__mes-bloco" aria-label={rotuloMes(itens[0].data)}>
                <h2 className="mv-agenda__mes-titulo">
                  <span className="mv-sobrelinha">{rotuloMes(itens[0].data)}</span>
                  <span className="mv-agenda__mes-conta mv-num">{itens.length}</span>
                </h2>
                <ol className="mv-agenda__lista">
                  {itens.map((ev) => (
                    <Linha
                      key={ev.id}
                      evento={ev}
                      indice={indice}
                      podeEditar={Boolean(conta)}
                      aoEditar={() => setEditando(ev)}
                    />
                  ))}
                </ol>
              </section>
            ))}

            {passados.length > 0 && (
              <section className="mv-agenda__passados">
                <button
                  type="button"
                  className="mv-agenda__alternar-passados"
                  onClick={() => setMostrarPassados((v) => !v)}
                  aria-expanded={mostrarPassados}
                >
                  <Icone nome="seta" tamanho={13} data-aberta={mostrarPassados} />
                  {mostrarPassados ? "Esconder" : "Ver"} o que já passou
                  <span className="mv-agenda__mes-conta mv-num">{passados.length}</span>
                </button>
                {mostrarPassados && (
                  <ol className="mv-agenda__lista mv-agenda__lista--passada">
                    {passados.map((ev) => (
                      <Linha
                        key={ev.id}
                        evento={ev}
                        indice={indice}
                        podeEditar={Boolean(conta)}
                        aoEditar={() => setEditando(ev)}
                      />
                    ))}
                  </ol>
                )}
              </section>
            )}
          </>
        ) : (
          <Mes
            mes={mesVisivel}
            aoTrocarMes={setMesVisivel}
            eventos={eventos}
            indice={indice}
            podeEditar={Boolean(conta)}
            aoEditar={setEditando}
            aoCriarEm={abrirNovo}
          />
        )
      )}

      {!conta && eventos && eventos.length > 0 && (
        <aside className="mv-agenda__convite">
          <p>
            <strong>Só leitura.</strong> Entre com uma conta para marcar uma data
            nova ou corrigir alguma que esteja errada.
          </p>
          <Conta />
        </aside>
      )}

      {editando && (
        <Formulario
          evento={editando}
          indice={indice}
          aoFechar={() => setEditando(null)}
          aoSalvar={recarregar}
        />
      )}
    </div>
  );
}

// ── linha da lista ────────────────────────────────────────────────────────

function Linha({ evento, indice, podeEditar, aoEditar }) {
  const disc = indice ? acharDisciplina(indice, evento.disciplina) : null;
  const tipo = TIPOS.find((t) => t.chave === evento.tipo) ?? TIPOS[0];
  const data = paraData(evento.data);
  const prox = proximidade(evento.data);

  return (
    <li className="mv-evento" data-acento={disc?.acento ?? "neutro"} data-grau={prox.grau}>
      <div className="mv-evento__data" aria-hidden="true">
        <span className="mv-evento__dia mv-num">{data.getDate()}</span>
        <span className="mv-evento__semana">{DIAS_CURTOS[data.getDay()]}</span>
      </div>

      <div className="mv-evento__corpo">
        <div className="mv-evento__topo">
          <span className="mv-evento__tipo">
            <Icone nome={tipo.icone} tamanho={14} />
            {tipo.rotulo}
          </span>
          {disc && (
            <span className="mv-evento__disc">
              <span className="mv-evento__ponto" aria-hidden="true" />
              {disc.rotulo}
            </span>
          )}
          <span className="mv-evento__prox">{prox.texto}</span>
        </div>

        <h3 className="mv-evento__titulo">{evento.titulo}</h3>

        {evento.observacao && <p className="mv-evento__obs">{evento.observacao}</p>}

        <p className="mv-evento__autoria">
          <span className="mv-sr">Registrado por </span>
          {evento.criado_por_nome || "alguém"} · {quando(evento.criado_em)}
          {evento.alterado_em && (
            <> <span aria-hidden="true">·</span> editado por {evento.alterado_por_nome || "alguém"} {quando(evento.alterado_em)}</>
          )}
        </p>
      </div>

      {podeEditar && (
        <button
          type="button"
          className="mv-evento__editar"
          onClick={aoEditar}
          aria-label={`Editar "${evento.titulo}"`}
        >
          Editar
        </button>
      )}
    </li>
  );
}

// ── vista de mês ──────────────────────────────────────────────────────────

function Mes({ mes, aoTrocarMes, eventos, indice, podeEditar, aoEditar, aoCriarEm }) {
  const [ano, m] = mes.split("-").map(Number);
  const primeiro = new Date(ano, m - 1, 1);
  const diasNoMes = new Date(ano, m, 0).getDate();
  const vazioInicial = primeiro.getDay();
  const hoje = hojeIso();

  const porDia = useMemo(() => {
    const mapa = new Map();
    for (const e of eventos) {
      if (!mapa.has(e.data)) mapa.set(e.data, []);
      mapa.get(e.data).push(e);
    }
    return mapa;
  }, [eventos]);

  const mover = (passo) => {
    const d = new Date(ano, m - 1 + passo, 1);
    aoTrocarMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const celulas = [
    ...Array.from({ length: vazioInicial }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => paraIso(new Date(ano, m - 1, i + 1))),
  ];
  while (celulas.length % 7 !== 0) celulas.push(null);

  return (
    <section className="mv-mes" aria-label={`Calendário de ${MESES[m - 1]} de ${ano}`}>
      <header className="mv-mes__barra">
        <button type="button" className="mv-mes__passo" onClick={() => mover(-1)} aria-label="Mês anterior">
          <Icone nome="seta" tamanho={16} className="mv-mes__seta-esq" />
        </button>
        <h2 className="mv-mes__titulo">
          {MESES[m - 1]} <span className="mv-num">{ano}</span>
        </h2>
        <button type="button" className="mv-mes__passo" onClick={() => mover(1)} aria-label="Próximo mês">
          <Icone nome="seta" tamanho={16} />
        </button>
        <button type="button" className="mv-mes__hoje" onClick={() => aoTrocarMes(hoje.slice(0, 7))}>
          Hoje
        </button>
      </header>

      <div className="mv-mes__cabecalho" aria-hidden="true">
        {DIAS_CURTOS.map((d) => <span key={d}>{d}</span>)}
      </div>

      <div className="mv-mes__grade">
        {celulas.map((iso, i) => {
          if (!iso) return <div key={`v${i}`} className="mv-mes__celula mv-mes__celula--fora" aria-hidden="true" />;
          const doDia = porDia.get(iso) ?? [];
          const ehHoje = iso === hoje;
          const Marcacao = podeEditar ? "button" : "div";
          return (
            <Marcacao
              key={iso}
              className="mv-mes__celula"
              data-hoje={ehHoje || undefined}
              data-tem={doDia.length > 0 || undefined}
              {...(podeEditar
                ? {
                    type: "button",
                    onClick: () => aoCriarEm(iso),
                    "aria-label": `${paraData(iso).getDate()} de ${MESES[m - 1]}${
                      doDia.length ? ` — ${doDia.length} evento(s)` : " — registrar data"
                    }`,
                  }
                : {})}
            >
              <span className="mv-mes__numero mv-num">{paraData(iso).getDate()}</span>
              <ul className="mv-mes__eventos">
                {doDia.slice(0, 3).map((ev) => {
                  const disc = indice ? acharDisciplina(indice, ev.disciplina) : null;
                  return (
                    <li key={ev.id} data-acento={disc?.acento ?? "neutro"}>
                      <span
                        className="mv-mes__marca"
                        role={podeEditar ? "button" : undefined}
                        tabIndex={podeEditar ? 0 : undefined}
                        onClick={podeEditar ? (e) => { e.stopPropagation(); aoEditar(ev); } : undefined}
                        onKeyDown={
                          podeEditar
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  aoEditar(ev);
                                }
                              }
                            : undefined
                        }
                      >
                        <span className="mv-mes__ponto" aria-hidden="true" />
                        <span className="mv-mes__rotulo">{ev.titulo}</span>
                      </span>
                    </li>
                  );
                })}
                {doDia.length > 3 && (
                  <li className="mv-mes__mais mv-num">+{doDia.length - 3}</li>
                )}
              </ul>
            </Marcacao>
          );
        })}
      </div>

      {podeEditar && (
        <p className="mv-mes__dica">Clique num dia para marcar algo nele.</p>
      )}
    </section>
  );
}

// ── estado vazio ──────────────────────────────────────────────────────────

function Vazio({ conta, aoCriar }) {
  return (
    <div className="mv-agenda__vazio">
      <div className="mv-agenda__prancha-vazia">
        <p className="mv-agenda__selo">Agenda em branco</p>
        <h2 className="mv-agenda__vazio-titulo">Nenhuma data marcada ainda.</h2>
        <p className="mv-agenda__vazio-texto">
          Esta página existe para responder uma pergunta só: <em>o que vem
          agora?</em> Assim que alguém registrar a primeira prova, ela aparece
          aqui para o grupo inteiro — com disciplina, conteúdo cobrado e o nome
          de quem marcou.
        </p>

        {conta ? (
          <button type="button" className="mv-agenda__novo" onClick={aoCriar}>
            <Icone nome="agenda" tamanho={17} />
            Registrar a primeira data
          </button>
        ) : (
          <div className="mv-agenda__vazio-entrar">
            <p>Entre com uma conta para começar.</p>
            <Conta />
          </div>
        )}

        <p className="mv-agenda__vazio-nota">
          O grupo já mantém isso à mão em <code>01-Agenda/Calendario-P1.md</code>.
          Aqui é o mesmo conteúdo, editável por todo mundo.
        </p>
      </div>
    </div>
  );
}

// ── formulário ────────────────────────────────────────────────────────────

function Formulario({ evento, indice, aoFechar, aoSalvar }) {
  const ehNovo = !evento.id;
  const refDialogo = useRef(null);
  const refTitulo = useRef(null);

  const [forma, setForma] = useState({
    titulo: evento.titulo ?? "",
    disciplina: evento.disciplina ?? "",
    data: evento.data ?? hojeIso(),
    tipo: evento.tipo ?? "prova",
    observacao: evento.observacao ?? "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);

  // `<dialog>` nativo dá cerco de foco, Esc e fundo inerte de graça — três
  // coisas que uma modal improvisada com <div> costuma errar.
  useEffect(() => {
    const d = refDialogo.current;
    if (d && !d.open) d.showModal();
    refTitulo.current?.focus();
  }, []);

  const campo = (chave) => (e) => setForma((f) => ({ ...f, [chave]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      if (ehNovo) await backend.criarEvento(forma);
      else await backend.atualizarEvento(evento.id, forma);
      await aoSalvar();
      aoFechar();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };

  const apagar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await backend.apagarEvento(evento.id);
      await aoSalvar();
      aoFechar();
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };

  const disc = indice ? acharDisciplina(indice, forma.disciplina) : null;

  return (
    <dialog
      ref={refDialogo}
      className="mv-forma"
      data-acento={disc?.acento ?? "neutro"}
      onClose={aoFechar}
      onClick={(e) => { if (e.target === refDialogo.current) aoFechar(); }}
    >
      <form className="mv-forma__corpo" onSubmit={enviar}>
        <header className="mv-forma__cabecalho">
          <p className="mv-sobrelinha">{ehNovo ? "Nova data" : "Editando"}</p>
          <h2 className="mv-forma__titulo">
            {ehNovo ? "Marcar na agenda do grupo" : evento.titulo}
          </h2>
          <button type="button" className="mv-forma__fechar" onClick={aoFechar} aria-label="Fechar">
            <Icone nome="fechar" tamanho={18} />
          </button>
        </header>

        <div className="mv-forma__campos">
          <label className="mv-campo mv-campo--largo">
            <span className="mv-campo__rotulo">O que é</span>
            <input
              ref={refTitulo}
              className="mv-campo__entrada"
              value={forma.titulo}
              onChange={campo("titulo")}
              placeholder="Prova de Farmacologia — P2"
              maxLength={140}
              required
            />
          </label>

          <label className="mv-campo">
            <span className="mv-campo__rotulo">Quando</span>
            <input
              type="date"
              className="mv-campo__entrada"
              value={forma.data}
              onChange={campo("data")}
              required
            />
          </label>

          <label className="mv-campo">
            <span className="mv-campo__rotulo">Disciplina</span>
            <select className="mv-campo__entrada" value={forma.disciplina} onChange={campo("disciplina")}>
              <option value="">Geral — sem disciplina</option>
              {indice?.disciplinas.map((d) => (
                <option key={d.slug} value={d.slug}>{d.rotulo}</option>
              ))}
            </select>
          </label>

          <fieldset className="mv-campo mv-campo--largo mv-forma__tipos">
            <legend className="mv-campo__rotulo">Tipo</legend>
            <div className="mv-forma__radios">
              {TIPOS.map((t) => (
                <label key={t.chave} className={`mv-forma__radio${forma.tipo === t.chave ? " esta-ativo" : ""}`}>
                  <input
                    type="radio"
                    name="tipo"
                    value={t.chave}
                    checked={forma.tipo === t.chave}
                    onChange={campo("tipo")}
                  />
                  <Icone nome={t.icone} tamanho={16} />
                  {t.rotulo}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mv-campo mv-campo--largo">
            <span className="mv-campo__rotulo">Conteúdo cobrado, observação</span>
            <textarea
              className="mv-campo__entrada mv-campo__area"
              value={forma.observacao}
              onChange={campo("observacao")}
              rows={3}
              maxLength={600}
              placeholder="Temas 1 a 4. Leva calculadora."
            />
          </label>
        </div>

        {erro && <p className="mv-forma__erro" role="alert">{erro}</p>}

        <footer className="mv-forma__rodape">
          {!ehNovo && (
            confirmandoApagar ? (
              <span className="mv-forma__confirma">
                Apagar para todo mundo?
                <button type="button" className="mv-forma__apagar-sim" onClick={apagar} disabled={salvando}>
                  Apagar
                </button>
                <button type="button" className="mv-forma__cancelar" onClick={() => setConfirmandoApagar(false)}>
                  Não
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="mv-forma__apagar"
                onClick={() => setConfirmandoApagar(true)}
                disabled={salvando}
              >
                Apagar
              </button>
            )
          )}
          <div className="mv-forma__acoes">
            <button type="button" className="mv-forma__cancelar" onClick={aoFechar} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="mv-forma__salvar" disabled={salvando || !forma.titulo.trim()}>
              {salvando ? "Salvando…" : ehNovo ? "Registrar" : "Salvar"}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
