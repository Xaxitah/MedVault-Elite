/**
 * Shell da aplicação — navegação esquerda persistente + área de conteúdo.
 *
 * A nav tem dois andares que convivem:
 *   1. Destinos fixos (Início, Disciplinas, Biblioteca, Agenda, Contribuir)
 *   2. Uma árvore CONTEXTUAL que só se abre quando você está dentro de uma
 *      disciplina, mostrando parciais e temas.
 *
 * O andar 2 é o que evita o problema clássico de nav profunda: se a gente
 * mostrasse 9 disciplinas × 5 parciais × N temas de uma vez, viraria um
 * explorador de arquivos. Em vez disso, a árvore acompanha onde você está e
 * só exibe o ramo que interessa.
 */

import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useIndice, useDoc, acharDisciplina, rota } from "../lib/dados.js";
import Icone from "./Icones.jsx";
import Logo from "./Logo.jsx";
import "./Shell.css";

const DESTINOS = [
  { para: rota.inicio(),      icone: "inicio",     rotulo: "Início",      exato: true },
  { para: rota.disciplinas(), icone: "grade",      rotulo: "Disciplinas" },
  { para: rota.biblioteca(),  icone: "biblioteca", rotulo: "Biblioteca" },
  { para: rota.agenda(),      icone: "agenda",     rotulo: "Agenda" },
  { para: rota.contribuir(),  icone: "enviar",     rotulo: "Contribuir" },
];

export default function Shell({ children }) {
  const { dados: indice } = useIndice();
  const local = useLocation();
  const navegar = useNavigate();
  const [abertoMobile, setAbertoMobile] = useState(false);
  const [consulta, setConsulta] = useState("");
  const refBusca = useRef(null);

  // A disciplina ativa sai da URL na navegação por disciplina. Na rota de
  // LEITURA a URL só tem o id do documento — e era por isso que a árvore
  // sumia justamente na página onde a pessoa passa mais tempo. Quem estava
  // lendo litíase urinária e queria o tema vizinho tinha de voltar para
  // "Disciplinas" e recomeçar.
  //
  // O documento já está no cache quando a página de leitura o carregou, então
  // descobrir a disciplina por aqui não custa requisição nenhuma.
  const mDisc = local.pathname.match(/^\/disciplina\/([^/]+)/);
  const mLer = local.pathname.match(/^\/ler\/([^/]+)/);
  const { dados: docAtual } = useDoc(mLer?.[1] ?? null);

  const slugAtiva = mDisc?.[1] ?? docAtual?.disciplina ?? null;
  const discAtiva = indice && slugAtiva ? acharDisciplina(indice, slugAtiva) : null;
  const acento = discAtiva?.acento ?? "eucalipto";

  // Na leitura, o ramo aberto e o item marcado vêm do próprio documento.
  const parcialCtx = mLer ? docAtual?.parcial : undefined;
  const temaCtx = mLer ? docAtual?.tema : undefined;

  // Fecha a gaveta mobile em toda troca de rota — senão ela fica cobrindo a
  // página que a pessoa acabou de abrir.
  useEffect(() => { setAbertoMobile(false); }, [local.pathname]);

  // Barra "/" foca a busca, Esc sai. Atalho padrão de portal de conhecimento.
  useEffect(() => {
    const aoTeclar = (e) => {
      const digitando = /^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable;
      if (e.key === "/" && !digitando) { e.preventDefault(); refBusca.current?.focus(); }
      if (e.key === "Escape") { refBusca.current?.blur(); setAbertoMobile(false); }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  const enviarBusca = (e) => {
    e.preventDefault();
    if (consulta.trim().length >= 2) navegar(rota.buscar(consulta.trim()));
  };

  return (
    <div className="mv-shell" data-acento={acento}>
      <a className="mv-pular" href="#conteudo">Pular para o conteúdo</a>

      {/* Véu do mobile. Só existe quando a gaveta está aberta. */}
      {abertoMobile && (
        <button
          className="mv-shell__veu"
          onClick={() => setAbertoMobile(false)}
          aria-label="Fechar navegação"
        />
      )}

      <aside className="mv-nav" data-aberto={abertoMobile} aria-label="Navegação principal">
        <div className="mv-nav__topo">
          <NavLink to={rota.inicio()} className="mv-nav__marca" aria-label="MedVault — início">
            <Logo tamanho={34} />
            <span className="mv-nav__marca-texto">
              MedVault
              <em>segundo cérebro do grupo</em>
            </span>
          </NavLink>
          <button
            className="mv-nav__fechar"
            onClick={() => setAbertoMobile(false)}
            aria-label="Fechar navegação"
          >
            <Icone nome="fechar" tamanho={20} />
          </button>
        </div>

        <form className="mv-nav__busca" onSubmit={enviarBusca} role="search">
          <Icone nome="buscar" tamanho={17} />
          <input
            ref={refBusca}
            type="search"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Buscar material…"
            aria-label="Buscar material"
          />
          <kbd aria-hidden="true">/</kbd>
        </form>

        <nav className="mv-nav__destinos">
          {DESTINOS.map((d) => (
            <NavLink
              key={d.para}
              to={d.para}
              end={d.exato}
              className={({ isActive }) => `mv-nav__item${isActive ? " esta-ativo" : ""}`}
            >
              <Icone nome={d.icone} tamanho={19} />
              <span>{d.rotulo}</span>
            </NavLink>
          ))}
        </nav>

        {/* Árvore contextual — só quando se está dentro de uma disciplina. */}
        {discAtiva && (
          <ArvoreDisciplina
            disc={discAtiva}
            parcialCtx={parcialCtx}
            temaCtx={temaCtx}
          />
        )}

        <div className="mv-nav__rodape">
          {indice && (
            <p className="mv-nav__stats mv-num">
              {indice.stats.documentos.toLocaleString("pt-BR")} materiais
              <span aria-hidden="true"> · </span>
              {/* "Outros" é o balde de material sem disciplina atribuída, não
                  uma matéria. Contá-lo aqui fazia o rodapé dizer 9 enquanto a
                  página de disciplinas dizia 8 — dois números certos pela
                  própria lógica e contraditórios na mesma tela. */}
              {indice.disciplinas.filter((d) => d.slug !== "outros").length}{" "}
              disciplinas
            </p>
          )}
        </div>
      </aside>

      <div className="mv-shell__principal">
        <header className="mv-topo">
          <button
            className="mv-topo__menu"
            onClick={() => setAbertoMobile(true)}
            aria-label="Abrir navegação"
            aria-expanded={abertoMobile}
          >
            <Icone nome="menu" tamanho={21} />
          </button>
          <Trilha indice={indice} />
        </header>

        <main id="conteudo" className="mv-conteudo" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Árvore contextual de parciais e temas.
 *
 * A parcial ativa abre sozinha; as outras ficam fechadas mas clicáveis. É o
 * meio-termo entre "mostra tudo" (que vira lista telefônica) e "mostra só o
 * atual" (que esconde para onde dá pra ir).
 */
function ArvoreDisciplina({ disc, parcialCtx, temaCtx }) {
  const { parcial: parcialUrl, tema: temaUrl } = useParams();
  // Na navegação por disciplina o contexto vem da URL; na leitura vem do
  // documento aberto. A árvore não precisa saber de qual dos dois veio.
  const parcialAtiva = parcialCtx ?? parcialUrl;
  const temaAtivo = temaCtx ?? temaUrl;

  const [expandida, setExpandida] = useState(() => new Set(parcialAtiva ? [parcialAtiva] : []));

  useEffect(() => {
    if (parcialAtiva) setExpandida((s) => new Set(s).add(parcialAtiva));
  }, [parcialAtiva]);

  const alternar = (chave) =>
    setExpandida((s) => {
      const p = new Set(s);
      p.has(chave) ? p.delete(chave) : p.add(chave);
      return p;
    });

  return (
    <div className="mv-arvore">
      <p className="mv-arvore__titulo mv-sobrelinha">{disc.rotulo}</p>

      <ul className="mv-arvore__lista">
        {disc.parciais.map((p) => {
          const aberta = expandida.has(p.chave);
          const ativa = parcialAtiva === p.chave;
          return (
            <li key={p.chave} className="mv-arvore__ramo">
              <div className={`mv-arvore__parcial${ativa ? " esta-ativo" : ""}`}>
                <button
                  className="mv-arvore__alternar"
                  onClick={() => alternar(p.chave)}
                  aria-expanded={aberta}
                  aria-label={`${aberta ? "Recolher" : "Expandir"} ${p.rotulo}`}
                >
                  <Icone nome="seta" tamanho={13} data-aberta={aberta} />
                </button>
                <NavLink to={rota.parcial(disc.slug, p.chave)} className="mv-arvore__rotulo">
                  {p.rotulo}
                  <span className="mv-arvore__contagem mv-num">{p.total}</span>
                </NavLink>
              </div>

              {aberta && (
                <ul className="mv-arvore__temas">
                  {p.temas.map((t) => (
                    <li key={t.slug}>
                      <NavLink
                        to={rota.tema(disc.slug, p.chave, t.slug)}
                        className={({ isActive }) =>
                          `mv-arvore__tema${isActive || temaAtivo === t.slug ? " esta-ativo" : ""}`
                        }
                      >
                        <span className="mv-arvore__marcador" aria-hidden="true" />
                        <span className="mv-arvore__tema-texto">{t.rotulo}</span>
                        <span className="mv-arvore__contagem mv-num">{t.total}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Trilha de migalhas construída a partir da URL. */
function Trilha({ indice }) {
  const local = useLocation();
  const partes = local.pathname.split("/").filter(Boolean);
  if (!partes.length) return <span className="mv-trilha__inicio">Início</span>;

  const migalhas = [];
  if (partes[0] === "disciplina" && indice) {
    const disc = acharDisciplina(indice, partes[1]);
    if (disc) {
      migalhas.push({ rotulo: "Disciplinas", para: rota.disciplinas() });
      migalhas.push({ rotulo: disc.rotulo, para: rota.disciplina(disc.slug) });

      const p = disc.parciais.find((x) => x.chave === partes[2]);
      if (p) {
        migalhas.push({ rotulo: p.rotulo, para: rota.parcial(disc.slug, p.chave) });
        const t = p.temas.find((x) => x.slug === partes[3]);
        if (t) migalhas.push({ rotulo: t.rotulo, para: rota.tema(disc.slug, p.chave, t.slug) });
      }
    }
  } else {
    const rotulos = {
      disciplinas: "Disciplinas", biblioteca: "Biblioteca", agenda: "Agenda",
      contribuir: "Contribuir", buscar: "Busca", ler: "Leitura",
    };
    if (rotulos[partes[0]]) migalhas.push({ rotulo: rotulos[partes[0]], para: `/${partes[0]}` });
  }

  return (
    <nav className="mv-trilha" aria-label="Trilha de navegação">
      <NavLink to={rota.inicio()} className="mv-trilha__inicio">Início</NavLink>
      {migalhas.map((m, i) => (
        <span key={m.para} className="mv-trilha__seg">
          <Icone nome="seta" tamanho={12} className="mv-trilha__sep" />
          {i === migalhas.length - 1 ? (
            <span aria-current="page">{m.rotulo}</span>
          ) : (
            <NavLink to={m.para}>{m.rotulo}</NavLink>
          )}
        </span>
      ))}
    </nav>
  );
}
