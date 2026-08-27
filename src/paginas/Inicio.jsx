/**
 * Home — a primeira dobra do MedVault.
 *
 * Quem chega aqui não é um estranho a ser convencido: é alguém do grupo
 * voltando, geralmente com prova marcada. Então a página não vende nada. Ela
 * faz três coisas, nesta ordem de urgência:
 *
 *   1. dá a busca de cara, porque "a prova é amanhã" é o caso mais comum;
 *   2. mostra o tamanho e a forma real do acervo, para dar confiança de que
 *      vale procurar aqui antes de procurar no Drive;
 *   3. abre atalho para as disciplinas gordas e para as partes colaborativas.
 *
 * Linguagem Prancha (docs/LINGUAGEM-PRANCHA.md): frontispício de atlas, não
 * landing page. Fio e espaço no lugar de caixa; pigmento só onde identifica;
 * densidade alta com hierarquia clara.
 *
 * Sobre os números: nada aqui é estimado. Tudo sai do índice, e cada número
 * vem com a frase que diz exatamente o que ele conta. "Outros" NÃO conta como
 * disciplina — são 253 materiais ainda sem classificação, e somá-los às oito
 * disciplinas reais inflaria o número e enganaria quem lê.
 */

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useIndice, rota } from "../lib/dados.js";
import Icone from "../components/Icones.jsx";
import { Esqueleto } from "../components/Carregando.jsx";
import "./Inicio.css";

const num = (n) => Number(n ?? 0).toLocaleString("pt-BR");

export default function Inicio() {
  const { dados: indice, carregando, erro } = useIndice();
  const navegar = useNavigate();
  const [consulta, setConsulta] = useState("");
  const [aviso, setAviso] = useState("");

  const acervo = useMemo(() => resumirAcervo(indice), [indice]);

  const enviarBusca = (e) => {
    e.preventDefault();
    const q = consulta.trim();
    // O índice de busca casa por prefixo de palavra e ignora consultas de uma
    // letra; avisar aqui evita mandar a pessoa para uma página vazia.
    if (q.length < 2) {
      setAviso("Digite ao menos duas letras para buscar.");
      return;
    }
    navegar(rota.buscar(q));
  };

  return (
    <div className="mv-inicio">
      <header className="mv-heroi">
        <p className="mv-sobrelinha mv-entra" style={{ "--i": 0 }}>
          Acervo do grupo
          {indice?.periodoAtual ? ` · ${indice.periodoAtual}º período` : ""}
        </p>

        <h1 className="mv-heroi__titulo mv-entra" style={{ "--i": 1 }}>
          Um atlas do que o grupo já estudou.
        </h1>

        <p className="mv-heroi__linha mv-entra" style={{ "--i": 2 }}>
          Resumo, revisão de véspera, mapa mental, transcrição e prova antiga —
          organizados por disciplina, parcial e tema, com cada figura numerada e
          com legenda própria. Se a prova é amanhã, comece pela busca.
        </p>

        <form
          className="mv-heroi__busca mv-entra"
          style={{ "--i": 3 }}
          role="search"
          onSubmit={enviarBusca}
        >
          <label className="mv-sr" htmlFor="mv-busca-inicio">
            Buscar material no acervo
          </label>
          <span className="mv-heroi__lupa" aria-hidden="true">
            <Icone nome="buscar" tamanho={19} />
          </span>
          <input
            id="mv-busca-inicio"
            type="search"
            value={consulta}
            onChange={(e) => {
              setConsulta(e.target.value);
              if (aviso) setAviso("");
            }}
            placeholder="Anamnese, betabloqueantes, abdome…"
            autoComplete="off"
            aria-describedby="mv-busca-dica"
          />
          <button type="submit" className="mv-heroi__ir">
            Buscar
          </button>
        </form>

        <p
          className="mv-heroi__dica mv-entra"
          style={{ "--i": 4 }}
          id="mv-busca-dica"
          aria-live="polite"
          data-aviso={aviso ? "" : undefined}
        >
          {aviso || (
            <>
              Ou pressione <kbd>/</kbd> em qualquer página para buscar sem tirar
              a mão do teclado.
            </>
          )}
        </p>

        <RegistroDoAcervo acervo={acervo} carregando={carregando} erro={erro} />
      </header>

      {erro && (
        <section className="mv-falha" aria-labelledby="mv-falha-titulo">
          <p className="mv-sobrelinha">Índice indisponível</p>
          <h2 id="mv-falha-titulo">O catálogo do acervo não carregou</h2>
          <p>
            A busca e a lista de disciplinas dependem de um único arquivo de
            índice. Ele pode não ter sido publicado ainda, ou a conexão caiu no
            meio do caminho — o conteúdo em si continua no lugar.
          </p>
          <button
            type="button"
            className="mv-botao-fio"
            onClick={() => window.location.reload()}
          >
            Recarregar a página
          </button>
        </section>
      )}

      {carregando && <EsqueletoDisciplinas />}

      {acervo && acervo.disciplinas.length === 0 && (
        <section className="mv-falha" aria-labelledby="mv-vazio-titulo">
          <p className="mv-sobrelinha">Acervo vazio</p>
          <h2 id="mv-vazio-titulo">Ainda não há disciplina publicada</h2>
          <p>
            O índice carregou, mas não trouxe nenhuma disciplina. Isso acontece
            quando o conteúdo ainda não foi gerado a partir do vault. Quem cuida
            da publicação precisa rodar a geração de conteúdo uma vez.
          </p>
          <Link className="mv-botao-fio" to={rota.contribuir()}>
            Como enviar material
          </Link>
        </section>
      )}

      {acervo && acervo.disciplinas.length > 0 && (
        <>
          <ListaDisciplinas acervo={acervo} />
          <ChaveDosArtefatos acervo={acervo} />
          <Caminhos acervo={acervo} />
        </>
      )}

      {indice?.geradoEm && (
        <p className="mv-inicio__carimbo">
          Índice gerado em{" "}
          <time dateTime={indice.geradoEm}>
            {new Date(indice.geradoEm).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </time>
          . Materiais novos aparecem aqui na próxima geração.
        </p>
      )}
    </div>
  );
}

/* ── o registro de números ──────────────────────────────────────────────
   Número grande sem legenda não prova nada — só decora. Cada um aqui carrega
   o rótulo do que conta E a frase que delimita o recorte. */

function RegistroDoAcervo({ acervo, carregando, erro }) {
  if (erro) return null;

  if (carregando || !acervo) {
    return (
      <ul className="mv-registro mv-entra" style={{ "--i": 5 }} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <li className="mv-registro__item" key={i}>
            <Esqueleto largura="4.5ch" altura="2.2rem" />
            <Esqueleto largura="9ch" altura="0.75rem" />
            <Esqueleto largura="88%" altura="0.8rem" />
          </li>
        ))}
      </ul>
    );
  }

  const fatos = [
    {
      valor: num(acervo.total),
      rotulo: "materiais",
      gloss: `${num(acervo.classificados)} já classificados nas disciplinas · ${num(
        acervo.aClassificar,
      )} aguardando triagem`,
    },
    {
      valor: num(acervo.disciplinas.length),
      rotulo: "disciplinas",
      gloss: `${num(acervo.temas)} temas distribuídos em ${num(acervo.parciais)} parciais`,
    },
    {
      valor: num(acervo.figuras),
      rotulo: "figuras",
      gloss: "numeradas e com legenda que se sustenta sozinha, sem a imagem",
    },
    {
      valor: `${num(acervo.horas)} h`,
      rotulo: "de leitura",
      gloss: "soma do tempo estimado de todos os materiais do acervo",
    },
  ];

  return (
    <ul className="mv-registro mv-entra" style={{ "--i": 5 }}>
      {fatos.map((f) => (
        <li className="mv-registro__item" key={f.rotulo}>
          <span className="mv-registro__valor mv-num">{f.valor}</span>
          <span className="mv-registro__rotulo mv-sobrelinha">{f.rotulo}</span>
          <span className="mv-registro__gloss">{f.gloss}</span>
        </li>
      ))}
    </ul>
  );
}

/* ── disciplinas ────────────────────────────────────────────────────────
   Lista, não grade de cards. A régua sob cada linha é o tamanho relativo do
   acervo daquela disciplina — dado, não enfeite, e é o que responde "onde
   está o material de verdade" antes mesmo de ler os números. */

function ListaDisciplinas({ acervo }) {
  return (
    <section className="mv-secao" aria-labelledby="mv-s-disc">
      <div className="mv-secao__cabeca">
        <h2 className="mv-secao__titulo" id="mv-s-disc">
          Disciplinas
        </h2>
        <p className="mv-secao__nota">
          Da maior para a menor. A régua sob cada linha é o tamanho do acervo
          em relação à disciplina mais completa.
        </p>
      </div>

      <ul className="mv-discs">
        {acervo.disciplinas.map((d) => (
          <li className="mv-disc" key={d.slug} data-acento={d.acento}>
            <Link className="mv-disc__link" to={rota.disciplina(d.slug)}>
              <span className="mv-disc__texto">
                <span className="mv-disc__nome">
                  <span className="mv-disc__ponto" aria-hidden="true" />
                  {d.rotulo}
                </span>
                <span className="mv-disc__desc">{d.descricao}</span>
                <span className="mv-disc__meta">
                  <span className="mv-sobrelinha">{d.periodoRotulo}</span>
                  <span className="mv-disc__estrutura mv-num">
                    {d.nParciais} {d.nParciais === 1 ? "parcial" : "parciais"} ·{" "}
                    {d.nTemas} {d.nTemas === 1 ? "tema" : "temas"}
                  </span>
                </span>
              </span>

              <span className="mv-disc__quanto">
                <span className="mv-disc__total mv-num">{num(d.total)}</span>
                <span className="mv-disc__unid">materiais</span>
              </span>

              <span className="mv-disc__seta" aria-hidden="true">
                <Icone nome="seta" tamanho={15} />
              </span>
            </Link>

            <span className="mv-disc__regua" aria-hidden="true">
              <span
                className="mv-disc__regua-fio"
                style={{ "--f": d.total / acervo.maiorTotal }}
              />
            </span>
          </li>
        ))}
      </ul>

      {acervo.aTriar.map((d) => (
        <Link className="mv-triagem" key={d.slug} to={rota.disciplina(d.slug)}>
          <span className="mv-triagem__texto">
            <strong>{num(d.total)} materiais ainda sem disciplina.</strong>{" "}
            Estão no acervo e abrem normalmente — só não foram atribuídos a uma
            matéria, então não entram nas contagens acima.
          </span>
          <span className="mv-triagem__ir">
            Ver a pilha
            <Icone nome="seta" tamanho={14} />
          </span>
        </Link>
      ))}
    </section>
  );
}

/* ── a chave dos artefatos ──────────────────────────────────────────────
   Uma prancha antiga traz a chave dos símbolos no rodapé. Isto é a mesma
   ideia: o que cada tema pode conter, com quanto existe de cada um. É o que
   separa este site de uma pasta compartilhada. */

function ChaveDosArtefatos({ acervo }) {
  return (
    <section className="mv-secao" aria-labelledby="mv-s-tipos">
      <div className="mv-secao__cabeca">
        <h2 className="mv-secao__titulo" id="mv-s-tipos">
          O que existe dentro de um tema
        </h2>
        <p className="mv-secao__nota">
          Um tema não é um arquivo, é um conjunto. Estes são os {num(acervo.total)}{" "}
          materiais do acervo separados por tipo.
        </p>
      </div>

      <ul className="mv-tipos">
        {acervo.tipos.map((t) => (
          <li className="mv-tipo" key={t.chave}>
            <span className="mv-tipo__glifo" aria-hidden="true">
              <Icone nome={t.icone} tamanho={20} />
            </span>
            <span className="mv-tipo__nome">{t.rotulo}</span>
            <span className="mv-tipo__n mv-num">{num(t.n)}</span>
            <span className="mv-tipo__desc">{t.descricao}</span>
          </li>
        ))}
      </ul>

      <p className="mv-secao__rodape">
        {num(acervo.tipos.length)} dos {num(acervo.catalogo)} tipos do catálogo
        já têm material publicado.{" "}
        <Link to={rota.biblioteca()} className="mv-link-fio">
          Percorrer a biblioteca inteira
        </Link>
      </p>
    </section>
  );
}

/* ── caminhos colaborativos ─────────────────────────────────────────────── */

function Caminhos({ acervo }) {
  return (
    <section className="mv-secao" aria-labelledby="mv-s-grupo">
      <div className="mv-secao__cabeca">
        <h2 className="mv-secao__titulo" id="mv-s-grupo">
          As partes que dependem do grupo
        </h2>
      </div>

      <div className="mv-caminhos">
        <Link className="mv-caminho" to={rota.agenda()}>
          <span className="mv-caminho__glifo" aria-hidden="true">
            <Icone nome="agenda" tamanho={22} />
          </span>
          <span className="mv-sobrelinha">Agenda</span>
          <span className="mv-caminho__titulo">
            Quando cai, e o que já cobre
          </span>
          <span className="mv-caminho__texto">
            As datas do período ao lado do material que dá conta de cada uma.
            É por onde se decide o que estudar hoje.
          </span>
          <span className="mv-caminho__ir">
            Abrir a agenda
            <Icone nome="seta" tamanho={14} />
          </span>
        </Link>

        <Link className="mv-caminho" to={rota.contribuir()}>
          <span className="mv-caminho__glifo" aria-hidden="true">
            <Icone nome="enviar" tamanho={22} />
          </span>
          <span className="mv-sobrelinha">Contribuir</span>
          <span className="mv-caminho__titulo">
            O acervo cresce por quem o usa
          </span>
          <span className="mv-caminho__texto">
            {acervo.aClassificar > 0
              ? `${num(acervo.aClassificar)} materiais ainda esperam disciplina, e sempre falta o resumo de alguém.`
              : "Sempre falta o resumo de alguém: transcrição, mapa mental, prova antiga."}{" "}
            Mande o seu.
          </span>
          <span className="mv-caminho__ir">
            Enviar material
            <Icone nome="seta" tamanho={14} />
          </span>
        </Link>
      </div>
    </section>
  );
}

/* ── esqueleto ──────────────────────────────────────────────────────────
   A forma que vem é conhecida, então mostramos a forma em vez de um spinner
   genérico — a página não "pula" quando os dados chegam. */

function EsqueletoDisciplinas() {
  return (
    <section className="mv-secao" aria-hidden="true">
      <div className="mv-secao__cabeca">
        <h2 className="mv-secao__titulo">Disciplinas</h2>
      </div>
      <ul className="mv-discs">
        {[92, 74, 61, 55, 44, 30].map((larg, i) => (
          <li className="mv-disc" key={i}>
            <span className="mv-disc__link">
              <span className="mv-disc__texto">
                <Esqueleto largura="11rem" altura="1.3rem" />
                <Esqueleto largura="min(26rem, 80%)" altura="0.95rem" />
                <Esqueleto largura="12rem" altura="0.75rem" />
              </span>
            </span>
            <span className="mv-disc__regua">
              <span className="mv-disc__regua-fio" style={{ "--f": larg / 100 }} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── derivações do índice ───────────────────────────────────────────────
   Tudo em um lugar só, para nenhum número da tela ser calculado duas vezes
   com regra diferente. */

function resumirAcervo(indice) {
  if (!indice) return null;

  // O balde "não classificado" é o período sem ciclo. Ler do dado em vez de
  // cravar o slug "outros" evita que a home minta se o build mudar o nome.
  const semDisciplina = new Set(
    indice.periodos.filter((p) => !p.ciclo).flatMap((p) => p.disciplinas),
  );
  const rotuloDoPeriodo = new Map(
    indice.periodos.map((p) => [p.numero, p.rotulo]),
  );

  const disciplinas = indice.disciplinas
    .filter((d) => !semDisciplina.has(d.slug))
    .map((d) => ({
      ...d,
      periodoRotulo: rotuloDoPeriodo.get(d.periodo) ?? "",
      nParciais: d.parciais.length,
      nTemas: d.parciais.reduce((s, p) => s + p.temas.length, 0),
    }))
    .sort((a, b) => b.total - a.total || a.rotulo.localeCompare(b.rotulo, "pt-BR"));

  const aTriar = indice.disciplinas.filter((d) => semDisciplina.has(d.slug));

  // Contagem por tipo sobre o acervo INTEIRO: a soma bate com stats.documentos,
  // e é isso que autoriza a frase "estes são os 1.503 materiais".
  const porTipo = new Map();
  let minutos = 0;
  for (const d of indice.disciplinas)
    for (const p of d.parciais)
      for (const t of p.temas)
        for (const tp of t.tipos) {
          porTipo.set(tp.chave, (porTipo.get(tp.chave) ?? 0) + tp.docs.length);
          for (const doc of tp.docs) minutos += doc.minutos ?? 0;
        }

  const tipos = [...porTipo]
    .map(([chave, n]) => ({
      chave,
      n,
      rotulo: indice.tiposArtefato?.[chave]?.rotulo ?? chave,
      icone: indice.tiposArtefato?.[chave]?.icone ?? "resumo",
      descricao: indice.tiposArtefato?.[chave]?.descricao ?? "",
    }))
    .sort((a, b) => b.n - a.n);

  return {
    disciplinas,
    aTriar,
    tipos,
    total: indice.stats?.documentos ?? 0,
    figuras: indice.stats?.figuras ?? 0,
    classificados: disciplinas.reduce((s, d) => s + d.total, 0),
    aClassificar: aTriar.reduce((s, d) => s + d.total, 0),
    parciais: disciplinas.reduce((s, d) => s + d.nParciais, 0),
    temas: disciplinas.reduce((s, d) => s + d.nTemas, 0),
    horas: Math.round(minutos / 60),
    maiorTotal: disciplinas[0]?.total || 1,
    catalogo: Object.keys(indice.tiposArtefato ?? {}).length,
  };
}
