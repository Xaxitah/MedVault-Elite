/**
 * Vista de leitura — a página mais importante do site.
 *
 * Implementa a linguagem Prancha (docs/LINGUAGEM-PRANCHA.md): coluna de
 * medida disciplinada, figuras numeradas sem moldura, fio de disciplina
 * abrindo cada seção, sumário lateral com progresso.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDoc, useIndice, acharDisciplina, rota } from "../lib/dados.js";
import Icone from "../components/Icones.jsx";
import Carregando from "../components/Carregando.jsx";
import Lightbox from "../components/Lightbox.jsx";
import "../styles/conteudo.css";
import "./Leitura.css";

export default function Leitura() {
  const { id } = useParams();
  const { dados: doc, carregando, erro } = useDoc(id);
  const { dados: indice } = useIndice();
  const refArtigo = useRef(null);
  const refProgresso = useRef(null);
  const [secaoAtiva, setSecaoAtiva] = useState(null);
  const [figuraAberta, setFiguraAberta] = useState(null);

  const disc = indice && doc ? acharDisciplina(indice, doc.disciplina) : null;
  const acento = disc?.acento ?? "neutro";

  // Rola pro topo ao trocar de documento — sem isto a pessoa cai no meio do
  // texto novo, na altura em que estava no anterior.
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [id]);

  // Envolve tabelas num container rolável. O pipeline emite <table> cru; se a
  // gente não fizer isso, tabela larga faz o BODY rolar de lado no celular.
  useEffect(() => {
    const raiz = refArtigo.current;
    if (!raiz || !doc) return;

    raiz.querySelectorAll("table").forEach((t) => {
      if (t.parentElement?.classList.contains("mv-tabela-rolagem")) return;
      const caixa = document.createElement("div");
      caixa.className = "mv-tabela-rolagem";
      caixa.setAttribute("tabindex", "0");         // rolável por teclado
      caixa.setAttribute("role", "region");
      caixa.setAttribute("aria-label", "Tabela — role horizontalmente");
      t.parentNode.insertBefore(caixa, t);
      caixa.appendChild(t);
    });
  }, [doc]);

  // Clique em figura abre o lightbox. Delegação de evento, porque o HTML é
  // injetado e não dá pra pendurar onClick em React.
  useEffect(() => {
    const raiz = refArtigo.current;
    if (!raiz || !doc) return;

    const aoClicar = (e) => {
      const botao = e.target.closest(".mv-fig__zoom");
      if (!botao) return;
      const img = botao.querySelector("img");
      if (!img) return;
      const fig = botao.closest(".mv-fig");
      setFiguraAberta({
        src: img.src,
        alt: img.alt,
        legenda: fig?.querySelector("figcaption")?.textContent ?? "",
        indice: Number(fig?.dataset.fig ?? 0),
      });
    };

    raiz.addEventListener("click", aoClicar);
    return () => raiz.removeEventListener("click", aoClicar);
  }, [doc]);

  /**
   * Scroll-spy: a seção ativa é a ÚLTIMA cujo título já passou da linha de
   * leitura (30% da altura da tela).
   *
   * Antes isto era um IntersectionObserver com uma faixa estreita no topo, e
   * ficava um item atrasado: o índice apontava "0. Fontes Usadas" enquanto três
   * parágrafos da seção 1 preenchiam a tela. O observer só dispara quando um
   * título ENTRA ou SAI da faixa — se nenhum título está dentro dela naquele
   * instante, ninguém dispara e o valor antigo persiste, que é exatamente o que
   * acontece no meio de uma seção longa.
   *
   * Varrer as posições a cada quadro é determinístico: não depende de o título
   * estar dentro de uma janela no momento certo, e responde igual seja qual for
   * o tamanho da seção. Custa uma leitura de layout por quadro, coalescida com
   * requestAnimationFrame junto da barra de progresso.
   */
  useEffect(() => {
    if (!doc?.sumario?.length) return;

    let pendente = 0;
    let ultimo = null;
    let alvos = null;

    /**
     * Os alvos são resolvidos SOB DEMANDA, não na montagem.
     *
     * Resolvê-los aqui em cima dependia de `refArtigo.current` já existir
     * quando o efeito roda — e a vista de leitura tem saídas antecipadas
     * (`carregando`, `erro`, `!doc`) que fazem a div do artigo nem ser
     * renderizada em alguns ciclos. Quando isso acontecia, o efeito retornava
     * cedo, o listener nunca era ligado, e o índice ficava travado no valor
     * padrão — que por acaso é o primeiro item, então parecia estar
     * funcionando no topo da página e só quebrava ao rolar.
     */
    const obterAlvos = () => {
      // Um nó cacheado só vale enquanto continuar no documento.
      //
      // ESTA LINHA É O CONSERTO. O artigo é recriado depois do primeiro
      // update de estado, e as referências guardadas viravam nós órfãos:
      // `getBoundingClientRect()` passava a devolver zero em tudo, então o
      // cálculo achava que nenhum cabeçalho tinha passado da linha e travava
      // no primeiro item para sempre. Medido: `tops=0,0,0,0,0` com
      // `scrollY=3200`. Era também a causa do IntersectionObserver anterior
      // falhar — ele observava os mesmos nós destruídos.
      //
      // Se o primeiro nó está desconectado, todos estão: reresolve.
      if (alvos?.length && alvos[0].el.isConnected) return alvos;

      const raiz = refArtigo.current;
      if (!raiz) return null;
      alvos = doc.sumario
        .map((s) => ({ id: s.id, el: raiz.querySelector(`#${CSS.escape(s.id)}`) }))
        .filter((x) => x.el);
      return alvos.length ? alvos : null;
    };

    const apurar = () => {
      pendente = 0;
      const lista = obterAlvos();
      if (!lista) return;

      const linha = window.innerHeight * 0.3;

      // Varre TODOS os alvos e fica com o que está mais próximo da linha por
      // cima. Sem `break` no primeiro que passa: parar cedo pressupõe que a
      // ordem do array acompanha a ordem vertical da página, e essa suposição
      // não se sustenta — figura extravasando, tabela rolável ou callout podem
      // reposicionar um cabeçalho. Varrer 45 retângulos por quadro é barato;
      // apontar para a seção errada não é.
      let atual = lista[0].id;
      let melhor = -Infinity;
      for (const a of lista) {
        const t = a.el.getBoundingClientRect().top;
        if (t <= linha && t > melhor) { melhor = t; atual = a.id; }
      }
      if (atual !== ultimo) { ultimo = atual; setSecaoAtiva(atual); }
    };

    const aoRolar = () => { if (!pendente) pendente = requestAnimationFrame(apurar); };

    apurar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar);
    return () => {
      cancelAnimationFrame(pendente);
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRolar);
    };
  }, [doc]);

  /**
   * Progresso de leitura, escrito DIRETO no DOM.
   *
   * Guardar isto em estado do React re-renderizava a Leitura inteira a cada
   * evento de scroll — e a Leitura contém um dangerouslySetInnerHTML com o
   * documento completo. A ~60 eventos por segundo isso congelava o renderer
   * de verdade em documentos longos. Progresso de rolagem é pixel, não
   * estado de aplicação: não descreve a UI, só pinta uma barra.
   *
   * Também guardamos as medidas do artigo fora do handler, para não forçar
   * recálculo de layout (offsetTop/offsetHeight) a cada quadro.
   */
  useEffect(() => {
    const raiz = refArtigo.current;
    const barra = refProgresso.current;
    if (!raiz || !barra) return;

    let inicio = 0, total = 1, pendente = 0;

    const medir = () => {
      inicio = raiz.offsetTop;
      total = Math.max(1, raiz.offsetHeight - window.innerHeight);
    };

    const pintar = () => {
      pendente = 0;
      const p = Math.min(1, Math.max(0, (window.scrollY - inicio) / total));
      barra.style.transform = `scaleX(${p})`;
      barra.setAttribute("aria-valuenow", String(Math.round(p * 100)));
    };

    const aoRolar = () => {
      if (pendente) return;
      pendente = requestAnimationFrame(pintar);
    };

    medir();
    pintar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", medir);
    return () => {
      cancelAnimationFrame(pendente);
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", medir);
    };
  }, [doc]);

  // Irmãos do mesmo tema, para anterior/próximo.
  const vizinhos = useMemo(() => {
    if (!indice || !doc || !disc) return { anterior: null, proximo: null };
    const parc = disc.parciais.find((p) => p.chave === doc.parcial);
    const tema = parc?.temas.find((t) => t.slug === doc.tema);
    if (!tema) return { anterior: null, proximo: null };

    const irmaos = tema.tipos.flatMap((tp) => tp.docs);
    const i = irmaos.findIndex((d) => d.id === doc.id);
    return {
      anterior: i > 0 ? irmaos[i - 1] : null,
      proximo: i >= 0 && i < irmaos.length - 1 ? irmaos[i + 1] : null,
    };
  }, [indice, doc, disc]);

  if (carregando) return <Carregando rotulo="Carregando material" />;

  if (erro) {
    return (
      <div className="mv-leitura__falha">
        <p className="mv-sobrelinha">Não deu para abrir</p>
        <h1>Este material não carregou</h1>
        <p>
          O arquivo pode ter sido renomeado no vault desde a última vez que o
          conteúdo foi gerado.
        </p>
        <Link className="mv-botao" to={rota.biblioteca()}>Ir para a biblioteca</Link>
      </div>
    );
  }

  if (!doc) return null;

  const tipoRotulo = indice?.tiposArtefato?.[doc.tipo]?.rotulo ?? doc.tipo;
  const tipoIcone = indice?.tiposArtefato?.[doc.tipo]?.icone ?? "resumo";
  const parcialRotulo =
    disc?.parciais.find((p) => p.chave === doc.parcial)?.rotulo ?? doc.parcial;

  return (
    <div className="mv-leitura" data-acento={acento}>
      <div
        ref={refProgresso}
        className="mv-leitura__progresso"
        style={{ transform: "scaleX(0)" }}
        role="progressbar"
        aria-valuenow={0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso de leitura"
      />

      <div className="mv-leitura__grade">
        <article className="mv-leitura__artigo">
          <header className="mv-leitura__cabecalho">
            <div className="mv-leitura__procedencia">
              {disc && (
                <Link to={rota.disciplina(disc.slug)} className="mv-leitura__disc">
                  <span className="mv-leitura__ponto" aria-hidden="true" />
                  {disc.rotulo}
                </Link>
              )}
              <span className="mv-leitura__sep" aria-hidden="true">/</span>
              <Link to={rota.parcial(doc.disciplina, doc.parcial)}>{parcialRotulo}</Link>
              <span className="mv-leitura__sep" aria-hidden="true">/</span>
              <Link to={rota.tema(doc.disciplina, doc.parcial, doc.tema)}>
                {doc.temaRotulo}
              </Link>
            </div>

            <h1 className="mv-leitura__titulo">{doc.titulo}</h1>

            <div className="mv-leitura__meta">
              <span className="mv-leitura__chip">
                <Icone nome={tipoIcone} tamanho={15} />
                {tipoRotulo}
              </span>
              <span className="mv-leitura__fato mv-num">
                <Icone nome="relogio" tamanho={15} />
                {doc.minutos} min
              </span>
              {doc.figuras > 0 && (
                <span className="mv-leitura__fato mv-num">
                  <Icone nome="imagem" tamanho={15} />
                  {doc.figuras} {doc.figuras === 1 ? "figura" : "figuras"}
                </span>
              )}
              <span className="mv-leitura__fato mv-num">
                {doc.palavras.toLocaleString("pt-BR")} palavras
              </span>
            </div>

            {doc.fonte && (
              <p className="mv-leitura__fonte">
                <span className="mv-sobrelinha">Fonte</span>
                {Array.isArray(doc.fonte) ? doc.fonte.join(" · ") : doc.fonte}
              </p>
            )}
          </header>

          {/* `data-tipo` deixa o CSS tratar cada formato pelo que ele é. Um
              flashcard não se lê como um resumo, e renderizar os dois igual
              transformava 31 documentos de pergunta-e-resposta num paredão de
              texto em negrito. */}
          <div
            ref={refArtigo}
            className="mv-prancha"
            data-tipo={doc.tipo}
            dangerouslySetInnerHTML={{ __html: doc.html }}
          />

          <nav className="mv-leitura__vizinhos" aria-label="Navegação entre materiais">
            {vizinhos.anterior ? (
              <Link className="mv-leitura__vizinho" to={rota.leitura(vizinhos.anterior.id)}>
                <span className="mv-sobrelinha">Anterior</span>
                <span className="mv-leitura__vizinho-titulo">{vizinhos.anterior.titulo}</span>
              </Link>
            ) : <span />}
            {vizinhos.proximo && (
              <Link
                className="mv-leitura__vizinho mv-leitura__vizinho--proximo"
                to={rota.leitura(vizinhos.proximo.id)}
              >
                <span className="mv-sobrelinha">Próximo</span>
                <span className="mv-leitura__vizinho-titulo">{vizinhos.proximo.titulo}</span>
              </Link>
            )}
          </nav>
        </article>

        {doc.sumario?.length > 2 && (
          <Sumario itens={doc.sumario} ativo={secaoAtiva} />
        )}
      </div>

      {figuraAberta && (
        <Lightbox figura={figuraAberta} aoFechar={() => setFiguraAberta(null)} />
      )}
    </div>
  );
}

/** Emoji em título é conteúdo do autor e fica no corpo. Num índice de
 *  varredura vira ruído — o vault aplica de forma irregular (um tubo de ensaio
 *  aqui, um fone ali, nada em vinte outros), e o olho tropeça neles. */
const semEmoji = (s) =>
  String(s)
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();

/**
 * Sumário lateral.
 *
 * Hierarquia em DOIS EIXOS, não no recuo.
 *
 * A versão anterior listava 25+ entradas de três níveis todas no mesmo corpo e
 * na mesma cor, distinguidas só por indentação. O veredito de um leitor
 * externo: "é um índice que eu preciso LER, não varrer" — e ele estava certo.
 * Sem âncora visual, um sumário grande é uma parede.
 *
 * Aqui os capítulos (h2) são a espinha: sempre visíveis, maiores, em tinta
 * cheia. Os subitens (h3/h4) só aparecem dentro do capítulo em que você está.
 * Isso mantém a profundidade — um resumo de farmacologia com 53 seções precisa
 * dela — sem cobrar a leitura das 53 de uma vez.
 */
function Sumario({ itens, ativo }) {
  // Agrupa cada capítulo com seus descendentes.
  const grupos = useMemo(() => {
    const g = [];
    for (const it of itens) {
      if (it.nivel === 2 || g.length === 0) g.push({ cabeca: it, filhos: [] });
      else g[g.length - 1].filhos.push(it);
    }
    return g;
  }, [itens]);

  // Capítulo aberto = aquele que contém a seção atual.
  const grupoAtivo = useMemo(() => {
    const i = grupos.findIndex(
      (x) => x.cabeca.id === ativo || x.filhos.some((f) => f.id === ativo),
    );
    return i === -1 ? 0 : i;
  }, [grupos, ativo]);

  return (
    <aside className="mv-sumario" aria-label="Nesta página">
      <div className="mv-sumario__grude">
        <p className="mv-sobrelinha mv-sumario__titulo">Nesta página</p>

        <ol className="mv-sumario__lista">
          {grupos.map((g, i) => {
            const aberto = i === grupoAtivo;
            return (
              <li key={g.cabeca.id} className="mv-sumario__grupo">
                <a
                  href={`#${g.cabeca.id}`}
                  className={`mv-sumario__cap${ativo === g.cabeca.id ? " esta-ativo" : ""}${
                    aberto ? " esta-aberto" : ""
                  }`}
                  aria-current={ativo === g.cabeca.id ? "location" : undefined}
                >
                  <span className="mv-sumario__marcador" aria-hidden="true" />
                  <span className="mv-sumario__texto">{semEmoji(g.cabeca.texto)}</span>
                  {g.filhos.length > 0 && (
                    <span className="mv-sumario__n mv-num" aria-hidden="true">
                      {g.filhos.length}
                    </span>
                  )}
                </a>

                {aberto && g.filhos.length > 0 && (
                  <ol className="mv-sumario__filhos">
                    {g.filhos.map((f) => (
                      <li key={f.id} data-nivel={f.nivel}>
                        <a
                          href={`#${f.id}`}
                          className={`mv-sumario__sub${ativo === f.id ? " esta-ativo" : ""}`}
                          aria-current={ativo === f.id ? "location" : undefined}
                        >
                          {semEmoji(f.texto)}
                        </a>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
