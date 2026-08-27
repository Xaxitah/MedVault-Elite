/**
 * Adaptador de backend — a única peça do site que sabe onde os dados moram.
 *
 * O dono escolheu Supabase, mas o projeto Supabase ainda não existe e não temos
 * chaves. Em vez de esperar, tudo é construído contra ESTA interface, com duas
 * implementações por trás dela:
 *
 *   backendLocal     localStorage (metadados) + IndexedDB (arquivos).
 *                    Padrão quando não há chaves. Funciona de ponta a ponta,
 *                    só que os dados ficam no navegador de quem usou.
 *   backendSupabase  Postgres + Storage + login Google. Liga sozinho quando
 *                    VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY existem.
 *
 * A escolha é em tempo de execução. Nenhuma tela conhece Supabase; todas
 * conhecem só o adaptador. Quando o dono colar as chaves no .env, nada de
 * interface precisa ser reescrito.
 *
 * ── A INTERFACE ────────────────────────────────────────────────────────────
 *   modo            "local" | "supabase"
 *   ehLocal         boolean
 *
 *   sessaoAtual()                          → Promise<Conta|null>
 *   aoMudarSessao(fn)                      → função de cancelamento
 *   entrarComGoogle()                      → Promise<void>   (só supabase)
 *   entrarLocal({ nome })                  → Promise<Conta>  (só local)
 *   sair()                                 → Promise<void>
 *
 *   listarEventos()                        → Promise<Evento[]>
 *   criarEvento(dados)                     → Promise<Evento>
 *   atualizarEvento(id, dados)             → Promise<Evento>
 *   apagarEvento(id)                       → Promise<void>
 *
 *   listarEnvios()                         → Promise<Envio[]>
 *   enviarArquivo(arquivo, meta, aoProgredir) → Promise<Envio>
 *   apagarEnvio(id)                        → Promise<void>
 *   urlDoEnvio(envio)                      → Promise<string|null>
 *
 * Conta  { id, nome, email, avatar }
 * Evento { id, titulo, disciplina, data, tipo, observacao,
 *          criado_por, criado_por_nome, criado_em, alterado_em, alterado_por_nome }
 * Envio  { id, nome_arquivo, tamanho, tipo_mime, caminho, disciplina, parcial,
 *          tema, tipo_material, observacao, enviado_por, enviado_por_nome, criado_em }
 */

const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL?.trim();
const CHAVE_SUPABASE = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const BALDE = import.meta.env.VITE_SUPABASE_BUCKET?.trim() || "envios";

export const TEM_SUPABASE = Boolean(URL_SUPABASE && CHAVE_SUPABASE);

/** Limites por família de arquivo, em bytes. Validados no cliente E no servidor
 *  (ver as políticas em docs/BACKEND.md — validação de cliente é conveniência,
 *  nunca segurança). */
export const LIMITES = {
  documento: 25 * 1024 * 1024,
  imagem: 15 * 1024 * 1024,
  audio: 100 * 1024 * 1024,
  video: 500 * 1024 * 1024,
};

/** Tipos aceitos. Extensão E mime — navegador mente em um dos dois com alguma
 *  frequência (o Windows manda pptx como octet-stream), então exigir os dois
 *  reprovaria envio legítimo; exigimos a extensão e conferimos o mime quando
 *  ele vem preenchido. */
export const ACEITOS = [
  { ext: "pdf",  familia: "documento", mimes: ["application/pdf"] },
  { ext: "docx", familia: "documento", mimes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
  { ext: "doc",  familia: "documento", mimes: ["application/msword"] },
  { ext: "pptx", familia: "documento", mimes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"] },
  { ext: "ppt",  familia: "documento", mimes: ["application/vnd.ms-powerpoint"] },
  { ext: "md",   familia: "documento", mimes: ["text/markdown", "text/plain", "text/x-markdown"] },
  { ext: "txt",  familia: "documento", mimes: ["text/plain"] },
  { ext: "mp3",  familia: "audio",     mimes: ["audio/mpeg", "audio/mp3"] },
  { ext: "m4a",  familia: "audio",     mimes: ["audio/mp4", "audio/x-m4a", "audio/m4a"] },
  { ext: "ogg",  familia: "audio",     mimes: ["audio/ogg"] },
  { ext: "wav",  familia: "audio",     mimes: ["audio/wav", "audio/x-wav"] },
  { ext: "mp4",  familia: "video",     mimes: ["video/mp4"] },
  { ext: "webm", familia: "video",     mimes: ["video/webm"] },
  { ext: "mov",  familia: "video",     mimes: ["video/quicktime"] },
  { ext: "png",  familia: "imagem",    mimes: ["image/png"] },
  { ext: "jpg",  familia: "imagem",    mimes: ["image/jpeg"] },
  { ext: "jpeg", familia: "imagem",    mimes: ["image/jpeg"] },
  { ext: "webp", familia: "imagem",    mimes: ["image/webp"] },
  { ext: "gif",  familia: "imagem",    mimes: ["image/gif"] },
];

export const EXTENSOES_ACEITAS = ACEITOS.map((a) => a.ext);

/** Sobe até 50 MB em qualquer projeto Supabase; acima disso depende do plano.
 *  A interface avisa em vez de deixar o envio falhar com um 413 seco. */
export const LIMITE_PLANO_GRATIS = 50 * 1024 * 1024;

export function extensaoDe(nome) {
  const m = /\.([a-z0-9]+)$/i.exec(String(nome ?? ""));
  return m ? m[1].toLowerCase() : "";
}

export function formatarBytes(n) {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  const un = ["KB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < un.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${un[i]}`;
}

/**
 * Valida um arquivo antes de qualquer byte sair da máquina.
 * Devolve `{ ok: true, familia }` ou `{ ok: false, motivo }`.
 */
export function validarArquivo(arquivo) {
  const ext = extensaoDe(arquivo.name);
  const regra = ACEITOS.find((a) => a.ext === ext);

  if (!regra) {
    return {
      ok: false,
      motivo: `Extensão .${ext || "?"} não é aceita. Aceitamos ${EXTENSOES_ACEITAS.join(", ")}.`,
    };
  }
  if (arquivo.type && !regra.mimes.includes(arquivo.type)) {
    return {
      ok: false,
      motivo: `O arquivo diz ser "${arquivo.type}", que não bate com .${ext}. Renomear a extensão não converte o arquivo.`,
    };
  }
  const limite = LIMITES[regra.familia];
  if (arquivo.size > limite) {
    return {
      ok: false,
      motivo: `${formatarBytes(arquivo.size)} passa do limite de ${formatarBytes(limite)} para ${regra.familia}.`,
    };
  }
  if (arquivo.size === 0) {
    return { ok: false, motivo: "O arquivo está vazio (0 bytes)." };
  }
  return { ok: true, familia: regra.familia };
}

/** Nome seguro para caminho de Storage: sem acento, sem espaço, sem `..`. */
export function higienizarNome(nome) {
  const ext = extensaoDe(nome);
  const base = String(nome).slice(0, nome.length - (ext ? ext.length + 1 : 0));
  const limpo = base
    // NFD separa a letra do acento; \p{M} varre os acentos soltos. Evita
    // depender de intervalo de combining marks escrito à mão no fonte.
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "arquivo";
  return ext ? `${limpo}.${ext}` : limpo;
}

// ══════════════════════════════════════════════════════════════════════════
//  Implementação LOCAL
// ══════════════════════════════════════════════════════════════════════════
//
// Metadados em localStorage (são poucos KB e precisam de leitura síncrona no
// primeiro quadro); os ARQUIVOS em IndexedDB, porque um mp4 de 300 MB em
// localStorage estoura a cota de 5 MB no primeiro envio.

const CHAVE_CONTA = "mv:conta";
const CHAVE_EVENTOS = "mv:eventos";
const CHAVE_ENVIOS = "mv:envios";

const lerJson = (chave, padrao) => {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : padrao;
  } catch {
    return padrao;
  }
};

const gravarJson = (chave, valor) => {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch (e) {
    throw new Error(
      "O armazenamento do navegador está cheio ou bloqueado. Em modo anônimo, alguns navegadores não deixam gravar nada.",
      { cause: e },
    );
  }
};

const agora = () => new Date().toISOString();
const novoId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// ── IndexedDB, mínimo necessário ──────────────────────────────────────────
const BD_NOME = "medvault";
const BD_LOJA = "arquivos";
let promessaBd = null;

function abrirBd() {
  if (promessaBd) return promessaBd;
  promessaBd = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error("Este navegador não tem IndexedDB.")); return; }
    const req = indexedDB.open(BD_NOME, 1);
    req.onupgradeneeded = () => {
      const bd = req.result;
      if (!bd.objectStoreNames.contains(BD_LOJA)) bd.createObjectStore(BD_LOJA);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Falha ao abrir o banco local."));
  }).catch((e) => { promessaBd = null; throw e; });
  return promessaBd;
}

function transacionar(modo, fn) {
  return abrirBd().then(
    (bd) =>
      new Promise((resolve, reject) => {
        const tx = bd.transaction(BD_LOJA, modo);
        const req = fn(tx.objectStore(BD_LOJA));
        tx.oncomplete = () => resolve(req?.result);
        tx.onerror = () => reject(tx.error ?? new Error("Falha na gravação local."));
        tx.onabort = () => reject(tx.error ?? new Error("Gravação local abortada — provavelmente falta de espaço em disco."));
      }),
  );
}

/**
 * Lê o arquivo em pedaços para relatar progresso VERDADEIRO.
 *
 * Ler 300 MB do disco não é instantâneo, então a barra mede trabalho real —
 * não é um relógio decorativo. É o mesmo motivo de a versão Supabase usar XHR
 * em vez do SDK: o SDK não expõe progresso, e barra falsa é mentira barata.
 */
async function lerEmPedacos(arquivo, aoProgredir) {
  const PEDACO = 4 * 1024 * 1024;
  const partes = [];
  let lido = 0;
  for (let inicio = 0; inicio < arquivo.size; inicio += PEDACO) {
    const fatia = arquivo.slice(inicio, Math.min(inicio + PEDACO, arquivo.size));
    partes.push(await fatia.arrayBuffer());
    lido += fatia.size;
    aoProgredir?.(Math.round((lido / arquivo.size) * 100));
  }
  return new Blob(partes, { type: arquivo.type || "application/octet-stream" });
}

const ouvintes = new Set();
const avisarMudanca = () => {
  const c = lerJson(CHAVE_CONTA, null);
  ouvintes.forEach((fn) => fn(c));
};

// Outra aba do mesmo navegador é a mesma "conta local". Sem isto, entrar numa
// aba deixa a outra achando que ninguém entrou.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === CHAVE_CONTA) avisarMudanca();
  });
}

const backendLocal = {
  modo: "local",
  ehLocal: true,

  async sessaoAtual() {
    return lerJson(CHAVE_CONTA, null);
  },

  aoMudarSessao(fn) {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
  },

  async entrarComGoogle() {
    throw new Error(
      "O login com Google precisa do Supabase configurado. Sem as chaves, dá para usar uma conta só deste navegador.",
    );
  },

  async entrarLocal({ nome }) {
    const limpo = String(nome ?? "").trim();
    if (limpo.length < 2) throw new Error("Escreva um nome com pelo menos 2 letras.");
    const conta = {
      id: lerJson(CHAVE_CONTA, null)?.id ?? novoId(),
      nome: limpo.slice(0, 60),
      email: null,
      avatar: null,
    };
    gravarJson(CHAVE_CONTA, conta);
    avisarMudanca();
    return conta;
  },

  async sair() {
    localStorage.removeItem(CHAVE_CONTA);
    avisarMudanca();
  },

  // ── agenda ──────────────────────────────────────────────────────────────

  async listarEventos() {
    return lerJson(CHAVE_EVENTOS, []).sort((a, b) => a.data.localeCompare(b.data));
  },

  async criarEvento(dados) {
    const conta = await this.sessaoAtual();
    if (!conta) throw new Error("Entre com uma conta para registrar datas.");
    const evento = {
      ...normalizarEvento(dados),
      id: novoId(),
      criado_por: conta.id,
      criado_por_nome: conta.nome,
      criado_em: agora(),
      alterado_em: null,
      alterado_por_nome: null,
    };
    const todos = lerJson(CHAVE_EVENTOS, []);
    gravarJson(CHAVE_EVENTOS, [...todos, evento]);
    return evento;
  },

  async atualizarEvento(id, dados) {
    const conta = await this.sessaoAtual();
    if (!conta) throw new Error("Entre com uma conta para editar datas.");
    const todos = lerJson(CHAVE_EVENTOS, []);
    const i = todos.findIndex((e) => e.id === id);
    if (i === -1) throw new Error("Esse evento não existe mais — alguém pode ter apagado.");
    const atualizado = {
      ...todos[i],
      ...normalizarEvento(dados),
      alterado_em: agora(),
      alterado_por_nome: conta.nome,
    };
    todos[i] = atualizado;
    gravarJson(CHAVE_EVENTOS, todos);
    return atualizado;
  },

  async apagarEvento(id) {
    const conta = await this.sessaoAtual();
    if (!conta) throw new Error("Entre com uma conta para apagar datas.");
    gravarJson(CHAVE_EVENTOS, lerJson(CHAVE_EVENTOS, []).filter((e) => e.id !== id));
  },

  // ── envios ──────────────────────────────────────────────────────────────

  async listarEnvios() {
    return lerJson(CHAVE_ENVIOS, []).sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  },

  async enviarArquivo(arquivo, meta, aoProgredir) {
    const conta = await this.sessaoAtual();
    if (!conta) throw new Error("Entre com uma conta para enviar material.");

    const v = validarArquivo(arquivo);
    if (!v.ok) throw new Error(v.motivo);

    const id = novoId();
    const blob = await lerEmPedacos(arquivo, aoProgredir);
    await transacionar("readwrite", (loja) => loja.put(blob, id));

    const envio = {
      id,
      nome_arquivo: arquivo.name,
      tamanho: arquivo.size,
      tipo_mime: arquivo.type || "application/octet-stream",
      caminho: caminhoDoEnvio(meta, id, arquivo.name),
      familia: v.familia,
      disciplina: meta.disciplina ?? "",
      parcial: meta.parcial ?? "",
      tema: (meta.tema ?? "").trim(),
      tipo_material: meta.tipo_material ?? "",
      observacao: (meta.observacao ?? "").trim(),
      enviado_por: conta.id,
      enviado_por_nome: conta.nome,
      criado_em: agora(),
    };
    gravarJson(CHAVE_ENVIOS, [...lerJson(CHAVE_ENVIOS, []), envio]);
    return envio;
  },

  async apagarEnvio(id) {
    const conta = await this.sessaoAtual();
    if (!conta) throw new Error("Entre com uma conta para apagar envios.");
    gravarJson(CHAVE_ENVIOS, lerJson(CHAVE_ENVIOS, []).filter((e) => e.id !== id));
    await transacionar("readwrite", (loja) => loja.delete(id)).catch(() => {});
  },

  /** URL de objeto para abrir o arquivo guardado no navegador. */
  async urlDoEnvio(envio) {
    const blob = await transacionar("readonly", (loja) => loja.get(envio.id));
    return blob ? URL.createObjectURL(blob) : null;
  },
};

function normalizarEvento(d) {
  const titulo = String(d.titulo ?? "").trim();
  if (!titulo) throw new Error("O evento precisa de um título.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.data ?? ""))) {
    throw new Error("A data precisa estar no formato dia/mês/ano.");
  }
  return {
    titulo: titulo.slice(0, 140),
    disciplina: d.disciplina ?? "",
    data: d.data,
    tipo: ["prova", "entrega", "aula"].includes(d.tipo) ? d.tipo : "prova",
    observacao: String(d.observacao ?? "").trim().slice(0, 600),
  };
}

/** `disciplina/parcial/tipo/id-nome.ext` — a mesma árvore que o watcher recria
 *  dentro do Drive, então quem abrir a pasta reconhece de onde veio. */
function caminhoDoEnvio(meta, id, nomeArquivo) {
  const parte = (v, padrao) =>
    String(v ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || padrao;
  return [
    parte(meta.disciplina, "sem-disciplina"),
    parte(meta.parcial, "sem-parcial"),
    parte(meta.tipo_material, "sem-tipo"),
    `${id.slice(0, 8)}-${higienizarNome(nomeArquivo)}`,
  ].join("/");
}

// ══════════════════════════════════════════════════════════════════════════
//  Implementação SUPABASE
// ══════════════════════════════════════════════════════════════════════════

let clientePromessa = null;

/** Import dinâmico: em modo local o SDK do Supabase nunca é baixado. */
function cliente() {
  if (!clientePromessa) {
    clientePromessa = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(URL_SUPABASE, CHAVE_SUPABASE, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          // PKCE devolve o código em `?code=`, e não no fragmento. O site usa
          // HashRouter — se o token voltasse no fragmento, ele atropelaria a
          // rota e a pessoa cairia fora da página em que estava.
          flowType: "pkce",
        },
      }),
    );
  }
  return clientePromessa;
}

const contaDoUsuario = (u) =>
  u && {
    id: u.id,
    nome:
      u.user_metadata?.full_name ??
      u.user_metadata?.name ??
      u.email?.split("@")[0] ??
      "Sem nome",
    email: u.email ?? null,
    avatar: u.user_metadata?.avatar_url ?? null,
  };

/** Erro do Postgrest vira frase em português — a mensagem crua vaza nome de
 *  tabela e política para a tela, o que não ajuda ninguém. */
function traduzirErro(erro, acao) {
  if (!erro) return null;
  const cod = erro.code ?? "";
  if (cod === "42501" || /row-level security|violates row-level/i.test(erro.message ?? "")) {
    return new Error(`Sem permissão para ${acao}. Só quem criou o registro pode alterá-lo.`);
  }
  if (cod === "42P01") {
    return new Error("As tabelas ainda não foram criadas no Supabase. Veja docs/BACKEND.md.");
  }
  if (/Failed to fetch|NetworkError/i.test(erro.message ?? "")) {
    return new Error("Sem conexão com o servidor. Verifique a internet e tente de novo.");
  }
  return new Error(erro.message || `Não deu para ${acao}.`);
}

const backendSupabase = {
  modo: "supabase",
  ehLocal: false,

  async sessaoAtual() {
    const sb = await cliente();
    const { data } = await sb.auth.getSession();
    return contaDoUsuario(data?.session?.user) ?? null;
  },

  aoMudarSessao(fn) {
    let inscricao = null;
    let cancelado = false;
    cliente().then((sb) => {
      if (cancelado) return;
      const { data } = sb.auth.onAuthStateChange((_evento, sessao) =>
        fn(contaDoUsuario(sessao?.user) ?? null),
      );
      inscricao = data?.subscription;
    });
    return () => { cancelado = true; inscricao?.unsubscribe(); };
  },

  async entrarComGoogle() {
    const sb = await cliente();
    // Volta para a raiz do site: com HashRouter a rota vive no fragmento, e o
    // Supabase precisa de uma URL cadastrada exata na lista de redirecionamento.
    const destino = `${window.location.origin}${import.meta.env.BASE_URL || "/"}`;
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: destino },
    });
    if (error) throw traduzirErro(error, "entrar com o Google");
  },

  async entrarLocal() {
    throw new Error("Com o Supabase ligado, o acesso é pela conta Google.");
  },

  async sair() {
    const sb = await cliente();
    const { error } = await sb.auth.signOut();
    if (error) throw traduzirErro(error, "sair");
  },

  // ── agenda ──────────────────────────────────────────────────────────────

  async listarEventos() {
    const sb = await cliente();
    const { data, error } = await sb.from("eventos").select("*").order("data", { ascending: true });
    if (error) throw traduzirErro(error, "carregar a agenda");
    return data ?? [];
  },

  async criarEvento(dados) {
    const sb = await cliente();
    const conta = await this.sessaoAtual();
    if (!conta) throw new Error("Entre com sua conta Google para registrar datas.");
    const { data, error } = await sb
      .from("eventos")
      .insert({ ...normalizarEvento(dados), criado_por: conta.id, criado_por_nome: conta.nome })
      .select()
      .single();
    if (error) throw traduzirErro(error, "registrar o evento");
    return data;
  },

  async atualizarEvento(id, dados) {
    const sb = await cliente();
    const conta = await this.sessaoAtual();
    if (!conta) throw new Error("Entre com sua conta Google para editar datas.");
    const { data, error } = await sb
      .from("eventos")
      .update({
        ...normalizarEvento(dados),
        alterado_em: agora(),
        alterado_por_nome: conta.nome,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw traduzirErro(error, "salvar a alteração");
    return data;
  },

  async apagarEvento(id) {
    const sb = await cliente();
    const { error } = await sb.from("eventos").delete().eq("id", id);
    if (error) throw traduzirErro(error, "apagar o evento");
  },

  // ── envios ──────────────────────────────────────────────────────────────

  async listarEnvios() {
    const sb = await cliente();
    const { data, error } = await sb
      .from("envios")
      .select("*")
      .order("criado_em", { ascending: false });
    if (error) throw traduzirErro(error, "listar os envios");
    return data ?? [];
  },

  async enviarArquivo(arquivo, meta, aoProgredir) {
    const sb = await cliente();
    const conta = await this.sessaoAtual();
    if (!conta) throw new Error("Entre com sua conta Google para enviar material.");

    const v = validarArquivo(arquivo);
    if (!v.ok) throw new Error(v.motivo);

    const id = novoId();
    const caminho = caminhoDoEnvio(meta, id, arquivo.name);
    const { data: sessao } = await sb.auth.getSession();
    const token = sessao?.session?.access_token;
    if (!token) throw new Error("Sua sessão expirou. Entre de novo.");

    await enviarComProgresso({
      url: `${URL_SUPABASE}/storage/v1/object/${BALDE}/${encodeURI(caminho)}`,
      token,
      arquivo,
      aoProgredir,
    });

    const { data, error } = await sb
      .from("envios")
      .insert({
        id,
        nome_arquivo: arquivo.name,
        tamanho: arquivo.size,
        tipo_mime: arquivo.type || "application/octet-stream",
        caminho,
        familia: v.familia,
        disciplina: meta.disciplina ?? "",
        parcial: meta.parcial ?? "",
        tema: (meta.tema ?? "").trim(),
        tipo_material: meta.tipo_material ?? "",
        observacao: (meta.observacao ?? "").trim(),
        enviado_por: conta.id,
        enviado_por_nome: conta.nome,
      })
      .select()
      .single();

    if (error) {
      // O arquivo subiu mas a linha não entrou: sem isto o balde acumula
      // órfãos que ninguém vê e ninguém apaga.
      await sb.storage.from(BALDE).remove([caminho]).catch(() => {});
      throw traduzirErro(error, "registrar o envio");
    }
    return data;
  },

  async apagarEnvio(id) {
    const sb = await cliente();
    const { data: envio } = await sb.from("envios").select("caminho").eq("id", id).single();
    const { error } = await sb.from("envios").delete().eq("id", id);
    if (error) throw traduzirErro(error, "apagar o envio");
    if (envio?.caminho) await sb.storage.from(BALDE).remove([envio.caminho]).catch(() => {});
  },

  async urlDoEnvio(envio) {
    const sb = await cliente();
    const { data, error } = await sb.storage.from(BALDE).createSignedUrl(envio.caminho, 60 * 10);
    if (error) throw traduzirErro(error, "abrir o arquivo");
    return data?.signedUrl ?? null;
  },
};

/**
 * POST direto no endpoint REST do Storage, via XHR.
 *
 * O SDK do Supabase não expõe evento de progresso — ele usa `fetch`, que não
 * tem `upload.onprogress`. Uma aula gravada de 200 MB sem barra de progresso é
 * uma tela travada do ponto de vista de quem enviou. Este é exatamente o mesmo
 * endpoint que o SDK chama por baixo.
 */
function enviarComProgresso({ url, token, arquivo, aoProgredir }) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open("POST", url, true);
    req.setRequestHeader("Authorization", `Bearer ${token}`);
    req.setRequestHeader("apikey", CHAVE_SUPABASE);
    req.setRequestHeader("x-upsert", "false");
    if (arquivo.type) req.setRequestHeader("Content-Type", arquivo.type);

    req.upload.onprogress = (e) => {
      if (e.lengthComputable) aoProgredir?.(Math.round((e.loaded / e.total) * 100));
    };
    req.onload = () => {
      if (req.status >= 200 && req.status < 300) { aoProgredir?.(100); resolve(); return; }
      if (req.status === 413) {
        reject(new Error(
          `O arquivo passa do limite por arquivo do projeto Supabase (${formatarBytes(LIMITE_PLANO_GRATIS)} no plano grátis). Veja docs/BACKEND.md.`,
        ));
        return;
      }
      if (req.status === 409) { reject(new Error("Já existe um arquivo nesse caminho.")); return; }
      if (req.status === 401 || req.status === 403) {
        reject(new Error("Sem permissão para enviar. A sessão pode ter expirado — saia e entre de novo."));
        return;
      }
      let detalhe = "";
      try { detalhe = JSON.parse(req.responseText)?.message ?? ""; } catch { /* corpo não é JSON */ }
      reject(new Error(`Falha no envio (HTTP ${req.status}). ${detalhe}`.trim()));
    };
    req.onerror = () => reject(new Error("A conexão caiu durante o envio. Tente de novo."));
    req.onabort = () => reject(new Error("Envio cancelado."));
    req.send(arquivo);
  });
}

// ══════════════════════════════════════════════════════════════════════════

/** A escolha. Automática, em tempo de execução, sem nenhuma tela saber disso. */
export const backend = TEM_SUPABASE ? backendSupabase : backendLocal;

/** Frase honesta sobre onde os dados estão indo. Aparece na interface — o
 *  usuário precisa saber que "salvo" pode significar "salvo só aqui". */
export const AVISO_MODO = backend.ehLocal
  ? "Modo local — o que você registrar fica só neste navegador, neste computador."
  : "Conectado ao servidor do grupo.";

export { backendLocal, backendSupabase };
