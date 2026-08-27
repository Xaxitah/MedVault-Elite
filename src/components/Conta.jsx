/**
 * Botão de conta — entrar, ver quem está logado, sair.
 *
 * Feito para caber tanto no rodapé da nav esquerda quanto na barra do topo, sem
 * configuração: é um botão que abre um painel ancorado. Quem for encaixar no
 * Shell só precisa de `<Conta />`.
 *
 * A prancha não tem "cards de perfil". Aqui o painel flutua (é o único caso em
 * que elevação se justifica — ele está literalmente acima da página), com fio
 * fino e papel, sem fundo colorido.
 */

import { useEffect, useId, useRef, useState } from "react";
import { useConta, iniciais } from "../lib/auth.js";
import Icone from "./Icones.jsx";
import "./Conta.css";

export default function Conta({ alinhamento = "inicio" }) {
  const { conta, carregando, ehLocal, entrarComGoogle, entrarLocal, sair } = useConta();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const refRaiz = useRef(null);
  const refCampo = useRef(null);
  const idPainel = useId();

  // Fecha ao clicar fora e no Esc. Sem os dois, um painel aberto vira uma
  // camada invisível que come cliques da página inteira.
  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e) => { if (!refRaiz.current?.contains(e.target)) setAberto(false); };
    const aoTeclar = (e) => { if (e.key === "Escape") { setAberto(false); refRaiz.current?.querySelector("button")?.focus(); } };
    document.addEventListener("mousedown", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  useEffect(() => {
    if (aberto && !conta && ehLocal) refCampo.current?.focus();
  }, [aberto, conta, ehLocal]);

  const executar = async (fn) => {
    setOcupado(true);
    setErro(null);
    try {
      await fn();
      setAberto(false);
      setNome("");
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  };

  if (carregando) {
    return (
      <div className="mv-conta" aria-busy="true">
        <span className="mv-conta__esqueleto" aria-hidden="true" />
        <span className="mv-sr">Verificando a sessão</span>
      </div>
    );
  }

  return (
    <div className="mv-conta" ref={refRaiz} data-alinhamento={alinhamento}>
      <button
        type="button"
        className={`mv-conta__gatilho${conta ? " tem-conta" : ""}`}
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        aria-controls={aberto ? idPainel : undefined}
      >
        {conta ? (
          <>
            <Avatar conta={conta} />
            <span className="mv-conta__nome">{conta.nome}</span>
          </>
        ) : (
          <>
            <Icone nome="usuario" tamanho={18} />
            <span className="mv-conta__nome">Entrar</span>
          </>
        )}
      </button>

      {aberto && (
        <div className="mv-conta__painel" id={idPainel} role="dialog" aria-label="Sua conta">
          {conta ? (
            <>
              <div className="mv-conta__cabecalho">
                <Avatar conta={conta} tamanho={40} />
                <div className="mv-conta__identidade">
                  <p className="mv-conta__painel-nome">{conta.nome}</p>
                  {conta.email && <p className="mv-conta__email">{conta.email}</p>}
                </div>
              </div>

              <p className="mv-conta__modo">
                {ehLocal
                  ? "Conta deste navegador. O que você registrar não sai deste computador."
                  : "Conta Google do grupo. O que você registrar aparece para todo mundo."}
              </p>

              <button
                type="button"
                className="mv-conta__acao"
                onClick={() => executar(sair)}
                disabled={ocupado}
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <p className="mv-sobrelinha">Entrar</p>
              <p className="mv-conta__explica">
                A conta serve para assinar o que você registra na agenda e o material
                que envia. É assim que o grupo sabe a quem perguntar.
              </p>

              {ehLocal ? (
                <form
                  className="mv-conta__forma"
                  onSubmit={(e) => { e.preventDefault(); executar(() => entrarLocal({ nome })); }}
                >
                  <label className="mv-conta__rotulo" htmlFor={`${idPainel}-nome`}>
                    Seu nome
                  </label>
                  <input
                    id={`${idPainel}-nome`}
                    ref={refCampo}
                    className="mv-conta__campo"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Como o grupo te chama"
                    autoComplete="name"
                    maxLength={60}
                  />
                  <button type="submit" className="mv-conta__principal" disabled={ocupado || nome.trim().length < 2}>
                    {ocupado ? "Entrando…" : "Entrar neste navegador"}
                  </button>
                  <p className="mv-conta__nota">
                    Sem o Supabase configurado, o login do Google não existe ainda.
                    Esta conta vale só aqui, para dar para testar o site inteiro.
                  </p>
                </form>
              ) : (
                <button
                  type="button"
                  className="mv-conta__principal"
                  onClick={() => executar(entrarComGoogle)}
                  disabled={ocupado}
                >
                  {ocupado ? "Abrindo o Google…" : "Continuar com Google"}
                </button>
              )}
            </>
          )}

          {erro && <p className="mv-conta__erro" role="alert">{erro}</p>}
        </div>
      )}
    </div>
  );
}

function Avatar({ conta, tamanho = 26 }) {
  const [falhou, setFalhou] = useState(false);
  const estilo = { width: tamanho, height: tamanho };

  if (conta.avatar && !falhou) {
    return (
      <img
        className="mv-conta__avatar"
        style={estilo}
        src={conta.avatar}
        alt=""
        onError={() => setFalhou(true)}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span className="mv-conta__avatar mv-conta__avatar--letras" style={estilo} aria-hidden="true">
      {iniciais(conta.nome)}
    </span>
  );
}
