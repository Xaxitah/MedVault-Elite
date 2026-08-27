/**
 * Contribuir — envio de material para alimentar o vault.
 *
 * "os alunos como contas cadastradas poderão colocar resumos, aulas gravadas,
 *  slides para alimentar o vault para construirmos mais resumos no futuro"
 *
 * Sobre o caminho até o Google Drive, e por que a página é explícita nisso:
 * o destino final é `G:\Meu Drive\ClaudeSync`, que é um caminho LOCAL do PC
 * do dono. Nenhum site escreve lá a partir do navegador. O arquivo vai para o
 * armazenamento do backend e um watcher (tools/sync-drive.mjs) rodando na
 * máquina dele leva até a pasta. A interface diz isso em vez de fingir que o
 * arquivo chegou no Drive.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useIndice, rota } from "../lib/dados.js";
import { useConta } from "../lib/auth.js";
import {
  backend, EXTENSOES_ACEITAS, formatarBytes, validarArquivo, AVISO_MODO,
} from "../lib/backend.js";
import Icone from "../components/Icones.jsx";
import Carregando from "../components/Carregando.jsx";
import "../styles/paginas.css";
import "./Contribuir.css";

const PARCIAIS = [
  ["P1", "1ª Parcial"], ["P2", "2ª Parcial"], ["P3", "3ª Parcial"],
  ["P4", "4ª Parcial"], ["FINAL", "Prova Final"], ["GERAL", "Material geral"],
];

const TIPOS = [
  ["resumo", "Resumo"], ["slide", "Slides de aula"], ["transcricao", "Aula gravada"],
  ["questao", "Questões"], ["prova-antiga", "Prova antiga"], ["outro", "Outro"],
];

export default function Contribuir() {
  const { dados: indice } = useIndice();
  const conta = useConta();
  const [fila, setFila] = useState([]);
  const [meta, setMeta] = useState({
    disciplina: "", parcial: "GERAL", tema: "", tipo_material: "resumo", observacao: "",
  });
  const [enviando, setEnviando] = useState(false);
  const [enviados, setEnviados] = useState([]);
  const [erroGeral, setErroGeral] = useState(null);
  const [arrastando, setArrastando] = useState(false);
  const refEntrada = useRef(null);

  useEffect(() => {
    backend.listarEnvios().then(setEnviados).catch(() => setEnviados([]));
  }, []);

  const adicionar = useCallback((arquivos) => {
    setErroGeral(null);
    const novos = [...arquivos].map((a) => {
      const v = validarArquivo(a);
      return {
        arquivo: a,
        id: `${a.name}-${a.size}-${a.lastModified}`,
        ok: v.ok,
        motivo: v.ok ? null : v.motivo,
        progresso: 0,
        estado: v.ok ? "pronto" : "recusado",
      };
    });
    // Dedup por identidade do arquivo — arrastar duas vezes é comum.
    setFila((f) => {
      const vistos = new Set(f.map((x) => x.id));
      return [...f, ...novos.filter((n) => !vistos.has(n.id))];
    });
  }, []);

  const aoSoltar = (e) => {
    e.preventDefault();
    setArrastando(false);
    if (e.dataTransfer.files?.length) adicionar(e.dataTransfer.files);
  };

  const enviarTudo = async () => {
    if (!conta.sessao) return;
    setEnviando(true);
    setErroGeral(null);

    for (const item of fila) {
      if (item.estado !== "pronto") continue;
      try {
        setFila((f) => f.map((x) => x.id === item.id ? { ...x, estado: "enviando" } : x));
        await backend.enviarArquivo(item.arquivo, meta, (p) => {
          setFila((f) => f.map((x) => x.id === item.id ? { ...x, progresso: p } : x));
        });
        setFila((f) => f.map((x) => x.id === item.id ? { ...x, estado: "pronto-ok", progresso: 1 } : x));
      } catch (e) {
        setFila((f) => f.map((x) => x.id === item.id ? { ...x, estado: "falhou", motivo: e.message } : x));
      }
    }

    setEnviando(false);
    backend.listarEnvios().then(setEnviados).catch(() => {});
  };

  const prontos = fila.filter((f) => f.estado === "pronto").length;

  if (conta.carregando) return <Carregando rotulo="Verificando conta" />;

  return (
    <div className="mv-pag mv-contrib">
      <header className="mv-heroi">
        <p className="mv-heroi__sobre mv-sobrelinha">Alimentar o vault</p>
        <h1 className="mv-heroi__titulo">Contribuir</h1>
        <p className="mv-heroi__desc">
          Resumo que você escreveu, slide da professora, gravação de aula. O
          que entra aqui vira matéria-prima para os próximos resumos do grupo.
        </p>
      </header>

      {AVISO_MODO && (
        <p className="mv-contrib__modo">
          <span className="mv-contrib__modo-ponto" aria-hidden="true" />
          {AVISO_MODO}
        </p>
      )}

      {!conta.sessao ? (
        <div className="mv-vazio">
          <p className="mv-vazio__t">Enviar material precisa de conta</p>
          <p className="mv-vazio__d">
            Não é burocracia: quem envia fica registrado junto do arquivo, para
            o grupo saber de onde veio cada material e poder perguntar à pessoa
            certa quando algo estiver confuso.
          </p>
          <button className="mv-acao" onClick={conta.entrarComGoogle}>
            <Icone nome="usuario" tamanho={16} />
            Entrar com Google
          </button>
        </div>
      ) : (
        <div className="mv-contrib__grade">
          <div className="mv-contrib__envio">
            <div
              className={`mv-solta${arrastando ? " esta-ativo" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
              onDragLeave={() => setArrastando(false)}
              onDrop={aoSoltar}
              onClick={() => refEntrada.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  refEntrada.current?.click();
                }
              }}
              aria-label="Escolher arquivos para enviar"
            >
              <Icone nome="enviar" tamanho={30} className="mv-solta__icone" />
              <p className="mv-solta__titulo">
                Arraste arquivos aqui ou clique para escolher
              </p>
              <p className="mv-solta__tipos">
                {EXTENSOES_ACEITAS.join(" · ")}
              </p>
              <input
                ref={refEntrada}
                type="file"
                multiple
                className="mv-sr"
                accept={EXTENSOES_ACEITAS.map((e) => `.${e}`).join(",")}
                onChange={(e) => { adicionar(e.target.files); e.target.value = ""; }}
              />
            </div>

            {fila.length > 0 && (
              <ul className="mv-fila">
                {fila.map((f) => (
                  <li key={f.id} className={`mv-fila__item mv-fila__item--${f.estado}`}>
                    <span className="mv-fila__nome">{f.arquivo.name}</span>
                    <span className="mv-fila__peso mv-num">
                      {formatarBytes(f.arquivo.size)}
                    </span>

                    {f.estado === "enviando" && (
                      <span className="mv-fila__barra" aria-hidden="true">
                        <span style={{ transform: `scaleX(${f.progresso})` }} />
                      </span>
                    )}
                    {f.estado === "pronto-ok" && (
                      <span className="mv-fila__ok">enviado</span>
                    )}
                    {(f.estado === "recusado" || f.estado === "falhou") && (
                      <span className="mv-fila__erro">{f.motivo}</span>
                    )}

                    {f.estado === "pronto" && (
                      <button
                        type="button"
                        className="mv-fila__tirar"
                        onClick={() => setFila((x) => x.filter((y) => y.id !== f.id))}
                        aria-label={`Tirar ${f.arquivo.name} da fila`}
                      >
                        <Icone nome="fechar" tamanho={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <fieldset className="mv-contrib__meta" disabled={enviando}>
              <legend className="mv-sobrelinha">Onde isto se encaixa</legend>

              <div className="mv-contrib__campos">
                <label className="mv-campo">
                  <span className="mv-campo__rotulo">Disciplina</span>
                  <select
                    className="mv-campo__entrada"
                    value={meta.disciplina}
                    onChange={(e) => setMeta((m) => ({ ...m, disciplina: e.target.value }))}
                  >
                    <option value="">Não sei / outra</option>
                    {indice?.disciplinas
                      .filter((d) => d.slug !== "outros")
                      .map((d) => (
                        <option key={d.slug} value={d.slug}>{d.rotulo}</option>
                      ))}
                  </select>
                </label>

                <label className="mv-campo">
                  <span className="mv-campo__rotulo">Parcial</span>
                  <select
                    className="mv-campo__entrada"
                    value={meta.parcial}
                    onChange={(e) => setMeta((m) => ({ ...m, parcial: e.target.value }))}
                  >
                    {PARCIAIS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                  </select>
                </label>

                <label className="mv-campo">
                  <span className="mv-campo__rotulo">Tema</span>
                  <input
                    className="mv-campo__entrada"
                    value={meta.tema}
                    onChange={(e) => setMeta((m) => ({ ...m, tema: e.target.value }))}
                    placeholder="ex.: Tema 04 — Exame Físico Geral"
                  />
                </label>

                <label className="mv-campo">
                  <span className="mv-campo__rotulo">Tipo de material</span>
                  <select
                    className="mv-campo__entrada"
                    value={meta.tipo_material}
                    onChange={(e) => setMeta((m) => ({ ...m, tipo_material: e.target.value }))}
                  >
                    {TIPOS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                  </select>
                </label>

                <label className="mv-campo mv-campo--largo">
                  <span className="mv-campo__rotulo">Observação</span>
                  <textarea
                    className="mv-campo__area"
                    value={meta.observacao}
                    onChange={(e) => setMeta((m) => ({ ...m, observacao: e.target.value }))}
                    placeholder="Algo que ajude quem for usar: de qual aula é, o que está faltando, se a gravação tem trecho ruim…"
                  />
                </label>
              </div>
            </fieldset>

            {erroGeral && <p className="mv-contrib__erro">{erroGeral}</p>}

            <div className="mv-contrib__acoes">
              <button
                className="mv-acao"
                onClick={enviarTudo}
                disabled={enviando || prontos === 0}
              >
                {enviando
                  ? "Enviando…"
                  : `Enviar ${prontos || ""} ${prontos === 1 ? "arquivo" : "arquivos"}`.trim()}
              </button>
              {fila.length > 0 && !enviando && (
                <button
                  className="mv-acao mv-acao--fantasma"
                  onClick={() => setFila([])}
                >
                  Limpar fila
                </button>
              )}
            </div>

            <p className="mv-contrib__destino">
              <strong>Para onde vai:</strong> o arquivo fica guardado no
              armazenamento do MedVault. Ele só chega em{" "}
              <code>G:\Meu Drive\ClaudeSync</code> quando o sincronizador roda
              no computador do responsável — um site no navegador não escreve
              numa pasta do seu PC.
            </p>
          </div>

          <aside className="mv-contrib__recentes">
            <h2 className="mv-sobrelinha">Enviados recentemente</h2>
            {enviados.length === 0 ? (
              <p className="mv-contrib__nada">
                Nada ainda. O primeiro material do grupo pode ser o seu.
              </p>
            ) : (
              <ul className="mv-recentes">
                {enviados.slice(0, 14).map((e) => (
                  <li key={e.id} className="mv-recentes__item">
                    <span className="mv-recentes__nome">{e.nome_arquivo}</span>
                    <span className="mv-recentes__meta">
                      {e.enviado_por_nome}
                      <span aria-hidden="true"> · </span>
                      <span className="mv-num">{formatarBytes(e.tamanho)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <Link className="mv-contrib__link" to={rota.biblioteca()}>
              Ver o que já está no acervo
              <Icone nome="seta" tamanho={14} />
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
