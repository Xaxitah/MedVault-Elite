/**
 * MedVault — pipeline de conteúdo
 * ================================
 * Lê o vault Obsidian e emite tudo que o site precisa:
 *
 *   public/data/index.json     navegação completa (disciplina > período > parcial > tema > artefato)
 *   public/data/docs/<id>.json documento renderizado + metadados
 *   public/media/<hash>.<ext>  imagens otimizadas, só as que são realmente referenciadas
 *
 * O problema que este arquivo existe para resolver
 * ------------------------------------------------
 * O vault usa embed do Obsidian — `![[arquivo.png]]` — que NENHUM renderizador
 * de markdown padrão entende. O portal antigo tentou contornar com um image-map
 * escrito à mão de 64 entradas apontando para IDs do Google Drive; o vault tem
 * 3.297 imagens. Resultado: ~2% de cobertura e o resto quebrado.
 *
 * Aqui a gente indexa o vault INTEIRO por nome de arquivo uma vez, e resolve
 * cada embed contra esse índice. Os embeds vêm em duas formas e as duas
 * precisam funcionar:
 *
 *   ![[cap34-fig08-p15.jpg]]                          nome solto
 *   ![[07-Biblioteca-Geral/.../cap35-....jpg]]        caminho relativo ao vault
 *
 * Nomes soltos podem colidir entre pastas. Quando colidem, preferimos o
 * candidato que estiver na mesma disciplina do documento — foi assim que o
 * Obsidian resolveu quando o autor escreveu, então reproduz a intenção dele.
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_PROJETO = path.resolve(__dirname, "..");
const VAULT = path.resolve(RAIZ_PROJETO, "..", "MED-Vault-2.0");

/**
 * Raízes extras só de mídia.
 *
 * O banco de imagens de verdade não mora no vault — mora no Google Drive, com
 * 6.443 arquivos contra os 3.297 do vault. Era essa a causa da maioria dos
 * embeds "órfãos": a nota referencia uma figura que existe, só que noutro
 * volume. Indexamos as duas raízes no mesmo mapa de nomes.
 *
 * Se o Drive não estiver montado, o build segue com o que houver no vault e
 * avisa — ninguém fica travado por causa de uma letra de unidade.
 */
const RAIZES_MIDIA = [
  "G:/Meu Drive/MED-Imagens",
];
const SAIDA_DADOS = path.join(RAIZ_PROJETO, "public", "data");
const SAIDA_MEDIA = path.join(RAIZ_PROJETO, "public", "media");

const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "curriculum.config.json"), "utf8"),
);

const EXT_IMAGEM = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"]);
const EXT_AUDIO = new Set([".mp3", ".m4a", ".wav", ".ogg"]);
const EXT_VIDEO = new Set([".mp4", ".webm", ".mov"]);
const EXT_DOC = new Set([".pdf"]);

/** Pastas que nunca contêm conteúdo de estudo. */
const IGNORAR = new Set([
  ".git", ".obsidian", ".trash", ".smart-env", ".space", ".makemd", ".vscode",
  "node_modules", ".tmp.driveupload", "_debug_remotely_save", ".codex", ".cursor",
  ".claude", ".claude-plugin", ".agent-shared", ".antigravitycli", "99-Arquivo",
  "99-Backups", "state", "tessdata",
]);

/** `tipo:` do frontmatter que representam metadados, não material de estudo. */
const TIPOS_NAO_CONTEUDO = new Set([
  "imagem", "meta", "moc", "indice", "indice-extracao", "auditoria",
  "relatorio", "imagem-extraida",
]);

const log = (...a) => console.log("[conteudo]", ...a);

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Converte markdown inline (negrito, itálico, código) para HTML.
 *
 * Usar `esc()` em legenda de figura e em texto de figura descrita fazia o
 * `**negrito**` do vault chegar cru na tela — a legenda é markdown como
 * qualquer outra parte do documento, só que nunca passava pelo parser.
 * Continua valendo `esc()` para conteúdo de ATRIBUTO (alt, data-*), onde
 * HTML não pode entrar.
 */
const inline = (s) => marked.parseInline(String(s ?? "")).replace(/\n+/g, " ").trim();

// ───────────────────────────────────────────────────────────── utilidades

function slugificar(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Anda o vault uma vez só, devolvendo todo caminho de arquivo. */
async function listarArquivos(raiz) {
  const encontrados = [];
  async function andar(dir) {
    let entradas;
    try {
      entradas = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entradas) {
      if (IGNORAR.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await andar(p);
      else encontrados.push(p);
    }
  }
  await andar(raiz);
  return encontrados;
}

// ─────────────────────────────────────────────── índice global de assets

/**
 * Dois índices sobre o mesmo conjunto de arquivos:
 *   porNome     "cap34-fig08-p15.jpg"      -> [caminhoAbs, ...]  (pode colidir)
 *   porCaminho  "07-biblioteca-geral/.../x.jpg" -> caminhoAbs     (nunca colide)
 */
function indexarAssets(todosArquivos, raizRelativa = VAULT) {
  const porNome = new Map();
  const porCaminho = new Map();

  for (const abs of todosArquivos) {
    const ext = path.extname(abs).toLowerCase();
    if (!EXT_IMAGEM.has(ext) && !EXT_AUDIO.has(ext) && !EXT_VIDEO.has(ext) && !EXT_DOC.has(ext)) {
      continue;
    }
    const nome = path.basename(abs).toLowerCase();
    if (!porNome.has(nome)) porNome.set(nome, []);
    porNome.get(nome).push(abs);

    const rel = path.relative(raizRelativa, abs).split(path.sep).join("/").toLowerCase();
    porCaminho.set(rel, abs);
  }
  return { porNome, porCaminho };
}

/** Funde índices de várias raízes. O primeiro a registrar um nome ganha. */
function fundirIndices(indices) {
  const porNome = new Map();
  const porCaminho = new Map();
  for (const ix of indices) {
    for (const [nome, caminhos] of ix.porNome) {
      if (!porNome.has(nome)) porNome.set(nome, []);
      porNome.get(nome).push(...caminhos);
    }
    for (const [rel, abs] of ix.porCaminho) {
      if (!porCaminho.has(rel)) porCaminho.set(rel, abs);
    }
  }
  return { porNome, porCaminho };
}

/**
 * Índice de FIGURAS DESCRITAS.
 *
 * O vault tem 4.892 notas `tipo: imagem` que descrevem uma figura de livro em
 * detalhe — título, fonte, capítulo, página do PDF, descrição visual — sem que
 * o arquivo de imagem tenha sido extraído algum dia. Os PDFs de origem também
 * não estão no vault, então não há o que extrair.
 *
 * Em vez de mostrar imagem quebrada, a gente promove a descrição a conteúdo de
 * primeira classe. A descrição costuma ser boa; jogá-la fora seria pior do que
 * a figura faltando.
 */
function indexarDescricoes(arquivosMd) {
  const porStem = new Map();

  for (const abs of arquivosMd) {
    let bruto;
    try {
      bruto = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    if (!/^tipo:\s*imagem\s*$/m.test(bruto)) continue;

    let fm = {}, corpo = bruto;
    try { const p = matter(bruto); fm = p.data ?? {}; corpo = p.content; } catch { continue; }

    // O vault usa dois formatos de nota-imagem, em proporções bem diferentes:
    //   "## Descricao visual detalhada"   (minoria)
    //   "## 3. Descricao Didatica"        (maioria — cabeçalhos numerados)
    // Aceitar só o primeiro deixava ~80% das descrições de fora.
    const secao = (re) => corpo.match(re)?.[1]?.trim().replace(/\s*\n\s*/g, " ") || null;
    const descricao =
      secao(/##\s*(?:\d+\.\s*)?Descri[cç][aã]o\s+visual[^\n]*\n+([\s\S]*?)(?=\n##\s|$)/i) ??
      secao(/##\s*(?:\d+\.\s*)?Descri[cç][aã]o\s+did[aá]tica[^\n]*\n+([\s\S]*?)(?=\n##\s|$)/i) ??
      secao(/##\s*(?:\d+\.\s*)?Descri[cç][aã]o[^\n]*\n+([\s\S]*?)(?=\n##\s|$)/i);
    if (!descricao || descricao.length < 40) continue;

    // Legenda curta pronta, quando a nota traz uma.
    const legendaSugerida = secao(
      /##\s*(?:\d+\.\s*)?Legenda\s+sugerida[^\n]*\n+([\s\S]*?)(?=\n##\s|$)/i,
    );

    const registro = {
      titulo: fm.title ?? fm.titulo ?? path.basename(abs, ".md").replace(/[-_]/g, " "),
      descricao,
      legendaSugerida: legendaSugerida && legendaSugerida.length < 240 ? legendaSugerida : null,
      fonte: fm.fonte ?? null,
      capitulo: fm.capitulo ?? null,
      pagina: fm.pagina_pdf ?? fm.pagina ?? null,
      disciplina: fm.disciplina ? slugificar(fm.disciplina) : null,
    };

    // Casa tanto pelo nome do .md quanto pelo `arquivo_imagem:` declarado —
    // os embeds usam ora um, ora outro.
    const stems = [path.basename(abs, ".md").toLowerCase()];
    if (fm.arquivo_imagem) {
      stems.push(String(fm.arquivo_imagem).replace(/\.[a-z0-9]+$/i, "").toLowerCase());
    }
    for (const s of stems) if (!porStem.has(s)) porStem.set(s, registro);
  }

  return porStem;
}

/**
 * Resolve um alvo de embed do Obsidian num caminho absoluto.
 * `dicaDisciplina` desempata quando o mesmo nome existe em várias disciplinas.
 */
function resolverAsset(alvo, indice, dicaDisciplina) {
  const limpo = decodeURIComponent(String(alvo).trim()).replace(/^\.\//, "");
  const chave = limpo.toLowerCase();

  // Forma 1: caminho completo relativo ao vault — sem ambiguidade.
  if (indice.porCaminho.has(chave)) return indice.porCaminho.get(chave);

  // Forma 2: nome solto (ou cauda de caminho) — casa pelo basename.
  const base = path.basename(chave);
  const candidatos = indice.porNome.get(base);
  if (!candidatos?.length) return null;
  if (candidatos.length === 1) return candidatos[0];

  // Colisão. Prefere um candidato dentro da mesma disciplina do documento.
  if (dicaDisciplina) {
    const marca = `${path.sep}${dicaDisciplina}${path.sep}`;
    const mesmaDisc = candidatos.find((c) => c.toLowerCase().includes(marca.toLowerCase()));
    if (mesmaDisc) return mesmaDisc;
  }
  // Se o alvo trouxe um pedaço de caminho, usa como pista adicional.
  if (chave.includes("/")) {
    const cauda = chave.split("/").slice(-2).join("/");
    const porCauda = candidatos.find((c) =>
      c.toLowerCase().split(path.sep).join("/").endsWith(cauda),
    );
    if (porCauda) return porCauda;
  }
  // Último recurso: caminho mais curto (tende a ser o canônico, não o arquivado).
  return candidatos.slice().sort((a, b) => a.length - b.length)[0];
}

// ───────────────────────────────────────────────── emissão de mídia

const cacheMedia = new Map(); // caminhoAbs -> { url, largura, altura, proporcao }
const LARGURA_MAX = 1600;

async function emitirMedia(abs) {
  if (cacheMedia.has(abs)) return cacheMedia.get(abs);

  const ext = path.extname(abs).toLowerCase();
  const buf = await fsp.readFile(abs);
  const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 12);

  let registro;

  if (EXT_IMAGEM.has(ext) && ext !== ".svg") {
    // Reamostra para largura de tela e converte pra webp. As varreduras do vault
    // vêm em PNG enorme; sem isso a página de leitura carrega dezenas de MB.
    const nomeSaida = `${hash}.webp`;
    const destino = path.join(SAIDA_MEDIA, nomeSaida);
    let largura = null, altura = null;
    try {
      const img = sharp(buf, { failOn: "none" });
      const meta = await img.metadata();
      const alvoLargura = Math.min(meta.width || LARGURA_MAX, LARGURA_MAX);
      if (!fs.existsSync(destino)) {
        await img.resize({ width: alvoLargura, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(destino);
      }
      const escala = alvoLargura / (meta.width || alvoLargura);
      largura = alvoLargura;
      altura = meta.height ? Math.round(meta.height * escala) : null;
    } catch {
      // Imagem corrompida ou formato exótico: copia crua em vez de perder.
      const bruta = `${hash}${ext}`;
      await fsp.writeFile(path.join(SAIDA_MEDIA, bruta), buf);
      registro = { url: `/media/${bruta}`, largura: null, altura: null, proporcao: null };
      cacheMedia.set(abs, registro);
      return registro;
    }
    registro = {
      url: `/media/${nomeSaida}`,
      largura,
      altura,
      proporcao: largura && altura ? +(largura / altura).toFixed(4) : null,
    };
  } else {
    const nomeSaida = `${hash}${ext}`;
    const destino = path.join(SAIDA_MEDIA, nomeSaida);
    if (!fs.existsSync(destino)) await fsp.writeFile(destino, buf);
    registro = { url: `/media/${nomeSaida}`, largura: null, altura: null, proporcao: null };
  }

  cacheMedia.set(abs, registro);
  return registro;
}

// ─────────────────────────────────────────────── classificação

function normalizarParcial(bruto, caminhoRel) {
  const s = String(bruto ?? "").toLowerCase().trim();
  const alvo = s || caminhoRel.toLowerCase();

  if (/\bp1\b|primeira[- ]parcial/.test(alvo)) return "P1";
  if (/\bp2\b|segunda[- ]parcial/.test(alvo)) return "P2";
  if (/\bp3\b|terceira[- ]parcial/.test(alvo)) return "P3";
  if (/\bp4\b|quarta[- ]parcial/.test(alvo)) return "P4";
  if (/\bfinal\b/.test(alvo)) return "FINAL";
  return "GERAL";
}

/** Nome da pasta sob Revisao/ -> chave de tipo de artefato. */
const PASTA_PARA_TIPO = {
  "resumos": "resumo",
  "revisao-vespera": "revisao-vespera",
  "mapas-mentais": "mapa-mental",
  "flashcards": "flashcard",
  "questoes": "questao",
  "quiz": "quiz",
  "podcast": "podcast",
  "infograficos": "infografico",
  "videos": "video",
  "slides": "slide",
  "tabelas": "tabela",
  "revisao-espacada": "revisao-espacada",
  "historia-clinica": "historia-clinica",
};

/** `tipo:` do frontmatter -> chave de tipo de artefato. */
const FM_PARA_TIPO = {
  "resumo": "resumo",
  "revisao-de-vespera": "revisao-vespera",
  "revisao-para-prova": "revisao-vespera",
  "mapa-mental": "mapa-mental",
  "flashcard": "flashcard",
  "questao": "questao",
  "aula": "transcricao",
  "transcricao": "transcricao",
  "slide-extraido": "slide",
  "slide-extraido-individual": "slide",
  "livro-capitulo": "livro-capitulo",
  "livro-extraido": "livro-capitulo",
};

function classificar(caminhoRel, fm) {
  const partes = caminhoRel.split("/");
  const segs = partes.map((p) => slugificar(p));

  // Disciplina: da estrutura de pastas primeiro, do frontmatter como reserva.
  let disciplina = "outros";
  const iDisc = segs.indexOf("03-disciplinas");
  if (iDisc >= 0 && segs[iDisc + 1]) {
    disciplina = segs[iDisc + 1];
  } else if (fm.disciplina) {
    disciplina = slugificar(fm.disciplina);
  }
  // A Biblioteca Geral organiza por disciplina no 3º nível
  // (07-Biblioteca-Geral/02-Capitulos-Extraidos/Fisiologia/…). Sem isto,
  // 463 documentos — a maioria Fisiologia — caíam todos em "outros".
  if (!config.disciplinas[disciplina] && segs[0] === "07-biblioteca-geral" && segs[2]) {
    if (config.disciplinas[segs[2]]) disciplina = segs[2];
  }
  if (!config.disciplinas[disciplina]) {
    const porRotulo = Object.entries(config.disciplinas).find(
      ([, v]) => slugificar(v.rotulo) === disciplina,
    );
    disciplina = porRotulo ? porRotulo[0] : "outros";
  }

  // Tipo de artefato: pasta sob Revisao/ é o sinal mais forte.
  let tipo = null;
  const iRev = segs.indexOf("revisao");
  if (iRev >= 0 && segs[iRev + 1] && PASTA_PARA_TIPO[segs[iRev + 1]]) {
    tipo = PASTA_PARA_TIPO[segs[iRev + 1]];
  }
  if (!tipo && segs.includes("10-provas-antigas")) tipo = "prova-antiga";
  if (!tipo && fm.tipo) tipo = FM_PARA_TIPO[slugificar(fm.tipo)] ?? null;
  if (!tipo) tipo = "resumo";

  const parcial = normalizarParcial(fm.prova, caminhoRel);

  // Tema.
  //
  // O SLUG é sempre `tema-NN`, derivado só do número. Isso é deliberado: antes
  // o slug vinha do nome da pasta quando havia pasta ("p1-tema-01-propedeutica-
  // semiologia-sindromologia") e do nome do arquivo quando não havia
  // ("tema-01") — e o MESMO tema aparecia duas vezes na navegação, uma vez por
  // origem. Número é a única chave estável entre as duas.
  //
  // O RÓTULO descritivo, quando existe, é preservado e ganha da versão nua na
  // hora de montar a árvore (ver mesclagem de temas no índice).
  let temaNum = null, temaDescricao = null;

  for (const p of partes) {
    const m = p.match(/^(?:P\d-)?Tema-(\d+)[-_]?(.*)$/i);
    if (m) {
      temaNum = parseInt(m[1], 10);
      temaDescricao = m[2] ? m[2].replace(/[-_]/g, " ").trim() : null;
      break;
    }
  }
  if (temaNum === null) {
    const m = path.basename(caminhoRel, ".md").match(/\bt(?:ema)?[-_]?(\d{1,2})\b/i);
    if (m) temaNum = parseInt(m[1], 10);
  }

  let temaSlug, temaRotulo;
  if (temaNum === null) {
    temaSlug = "sem-tema";
    temaRotulo = "Material Avulso";
    temaNum = 999;
  } else {
    const nn = String(temaNum).padStart(2, "0");
    temaSlug = `tema-${nn}`;
    temaRotulo = temaDescricao ? `Tema ${nn} — ${temaDescricao}` : `Tema ${nn}`;
  }

  return { disciplina, tipo, parcial, temaSlug, temaRotulo, temaNum };
}

// ─────────────────────────────────────────────── renderização markdown

/**
 * Converte a sintaxe própria do Obsidian em HTML, ANTES do marked rodar.
 * Devolve o markdown transformado mais os assets/links que encontrou.
 */
async function preprocessarObsidian(md, indice, dicaDisciplina, descricoes) {
  const figuras = [];
  const faltando = [];
  let descritas = 0;

  // ![[alvo|legenda]] — embed. É esta a linha que conserta as imagens.
  let saida = md;
  const reEmbed = /!\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g;
  const tarefas = [];
  saida.replace(reEmbed, (bruto, alvo, legenda) => {
    tarefas.push({ bruto, alvo: alvo.trim(), legenda: (legenda ?? "").trim() });
    return bruto;
  });

  for (const t of tarefas) {
    const abs = resolverAsset(t.alvo, indice, dicaDisciplina);
    if (!abs) {
      // Sem arquivo. Mas talvez exista uma nota descrevendo a figura — nesse
      // caso a descrição vira o conteúdo, não um buraco na página.
      const stem = path.basename(t.alvo).replace(/\.[a-z0-9]+$/i, "").toLowerCase();
      const desc = descricoes.get(stem);

      if (desc) {
        descritas++;
        const idx = figuras.length + 1;
        figuras.push({ tipo: "descrita", indice: idx, ...desc });
        const proc = [desc.fonte, desc.capitulo ? `Cap. ${desc.capitulo}` : null,
                      desc.pagina ? `p. ${desc.pagina}` : null].filter(Boolean).join(" · ");
        saida = saida.replace(
          t.bruto,
          `

<figure class="mv-fig mv-fig--descrita" data-fig="${idx}">` +
            `<div class="mv-descrita">` +
              `<p class="mv-descrita__selo">Figura descrita</p>` +
              `<p class="mv-descrita__titulo">${inline(desc.titulo)}</p>` +
              `<p class="mv-descrita__texto">${inline(desc.descricao)}</p>` +
              (proc ? `<p class="mv-descrita__proc">${inline(proc)}</p>` : "") +
            `</div>` +
            `<figcaption><span class="mv-fig__num">Fig. ${idx}</span>${
              t.legenda ? ` ${inline(t.legenda)}` : ""
            }</figcaption>` +
          `</figure>

`,
        );
        continue;
      }

      faltando.push(t.alvo);
      // Órfã de verdade: nem arquivo, nem descrição. Some da página em vez de
      // deixar cicatriz — um `![[...]]` cru vazando é pior que nada.
      saida = saida.replace(t.bruto, "");
      continue;
    }

    const ext = path.extname(abs).toLowerCase();
    const media = await emitirMedia(abs);

    if (EXT_IMAGEM.has(ext)) {
      const idx = figuras.length + 1;
      figuras.push({ ...media, legenda: t.legenda || null, indice: idx });
      const alt = (t.legenda || path.basename(abs, ext).replace(/[-_]/g, " ")).replace(/"/g, "&quot;");
      saida = saida.replace(
        t.bruto,
        `

<figure class="mv-fig" data-fig="${idx}">` +
          `<button class="mv-fig__zoom" type="button" aria-label="Ampliar figura ${idx}">` +
          `<img src="${media.url}" alt="${alt}" loading="lazy" decoding="async"` +
          (media.largura ? ` width="${media.largura}"` : "") +
          (media.altura ? ` height="${media.altura}"` : "") +
          `>` +
          `</button>` +
          `<figcaption><span class="mv-fig__num">Fig. ${idx}</span>${
            t.legenda ? ` ${inline(t.legenda)}` : ""
          }</figcaption>` +
          `</figure>

`,
      );
    } else if (EXT_AUDIO.has(ext)) {
      saida = saida.replace(t.bruto, `

<audio class="mv-audio" controls src="${media.url}"></audio>

`);
    } else if (EXT_VIDEO.has(ext)) {
      saida = saida.replace(t.bruto, `

<video class="mv-video" controls playsinline src="${media.url}"></video>

`);
    } else {
      saida = saida.replace(
        t.bruto,
        `<a class="mv-anexo" href="${media.url}" target="_blank" rel="noopener">${path.basename(abs)}</a>`,
      );
    }
  }

  // [[alvo|texto]] — link interno. Vira link do app; o resolvedor de rotas
  // do lado do cliente casa pelo slug.
  saida = saida.replace(/\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g, (_m, alvo, texto) => {
    const rotulo = (texto || String(alvo).split("/").pop()).trim();
    return `<a class="mv-link-interno" data-alvo="${slugificar(alvo)}" href="#/buscar?q=${encodeURIComponent(rotulo)}">${rotulo}</a>`;
  });

  // ==destaque==
  saida = saida.replace(/==([^=\n]+)==/g, '<mark class="mv-mark">$1</mark>');

  return { md: saida, figuras, faltando, descritas };
}

/** Callouts do Obsidian: > [!important] Título / corpo. */
const ROTULO_CALLOUT = {
  note: "Nota", info: "Info", tip: "Dica", important: "Importante",
  warning: "Atenção", caution: "Cuidado", danger: "Perigo", error: "Erro",
  success: "Certo", question: "Pergunta", example: "Exemplo", quote: "Citação",
  abstract: "Resumo", todo: "A fazer", bug: "Bug", failure: "Erro",
};

function transformarCallouts(md) {
  const linhas = md.split("\n");
  const saida = [];
  let i = 0;
  while (i < linhas.length) {
    const m = linhas[i].match(/^>\s*\[!(\w+)\]([+-]?)\s*(.*)$/);
    if (!m) { saida.push(linhas[i++]); continue; }

    const tipo = m[1].toLowerCase();
    const titulo = m[3].trim() || ROTULO_CALLOUT[tipo] || m[1];
    i++;
    const corpo = [];
    while (i < linhas.length && /^>/.test(linhas[i])) {
      corpo.push(linhas[i].replace(/^>\s?/, ""));
      i++;
    }
    // O corpo é convertido AQUI, e o bloco sai numa linha só.
    //
    // Antes eu emitia markdown cru dentro de um <div>, separado por linha em
    // branco, esperando que o marked processasse depois. Ele não processa: ao
    // encontrar `<aside`, o marked abre um bloco HTML e o encerra na primeira
    // linha em branco. O corpo do callout escapava da caixa, virava conteúdo
    // solto no fim do documento e ainda aparecia com `**` cru na tela.
    //
    // Convertendo o corpo antes e colando tudo numa linha, o marked vê um
    // bloco HTML fechado e o repassa intacto.
    const corpoHtml = marked
      .parse(corpo.join("\n"))
      .replace(/\n+/g, " ")
      .trim();

    // O título também é markdown. O vault escreve coisas como
    // `[!tip] Macete de velocidade — **CAPÍ**`, e inserir cru deixava os
    // asteriscos aparecendo na tela.
    const tituloHtml = marked.parseInline(titulo).trim();

    // Callout sem corpo acontece de verdade: alguns só embrulham uma imagem
    // (que pode ter sido removida por ser órfã) e outros trazem tudo na
    // própria linha do rótulo. Um <div> vazio vira uma caixa oca na página,
    // então marcamos como "seco" e deixamos o CSS renderizar compacto.
    const seco = corpoHtml.length === 0;

    // As linhas em branco em volta são obrigatórias, não cosmética.
    //
    // O marked encerra um bloco HTML só na primeira linha em branco. Sem a
    // linha depois do `</aside>`, ele continuava engolindo o markdown seguinte
    // como HTML cru — e o parágrafo logo abaixo do callout chegava à tela com
    // `**negrito**` visível. É o mesmo erro que causava o vazamento para
    // dentro do callout, agora do lado de fora.
    saida.push(
      "",
      `<aside class="mv-callout mv-callout--${tipo}${seco ? " mv-callout--seco" : ""}">` +
        `<p class="mv-callout__titulo">${tituloHtml}</p>` +
        (seco ? "" : `<div class="mv-callout__corpo">${corpoHtml}</div>`) +
      `</aside>`,
      "",
    );
  }
  return saida.join("\n");
}

/**
 * Extrai os cabeçalhos pra montar o sumário lateral, e injeta id em cada um
 * pra ancoragem e scroll-spy.
 */
/**
 * Rede de segurança: converte ênfase de markdown que sobrou solta no HTML.
 *
 * Três causas distintas já foram corrigidas na origem (corpo de callout, texto
 * depois de callout, texto depois de figura), e todas eram a mesma família: o
 * marked encerra um bloco HTML só na primeira linha em branco, então markdown
 * colado num bloco passa cru. Restou uma cauda de ~0,5% do acervo com outras
 * adjacências.
 *
 * Em vez de caçar cada variação, uma varredura final. Ela é deliberadamente
 * conservadora: pula `<pre>` e `<code>`, onde asterisco é literal e converter
 * seria ERRO, e só age fora de tags.
 */
function converterEnfaseResidual(html) {
  const protegido = [];
  // Tira código de circulação antes de mexer em qualquer coisa.
  let s = html.replace(/<(pre|code)\b[\s\S]*?<\/\1>/g, (m) => {
    protegido.push(m);
    return `${protegido.length - 1}`;
  });

  // Só em texto, nunca dentro de uma tag: a alternância exige que não haja
  // `<` entre o ponto atual e o próximo `>`.
  s = s.replace(/\*\*([^*<>\n]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(>])\*([^*<>\n]+)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");

  return s.replace(/(\d+)/g, (_m, i) => protegido[Number(i)]);
}

function extrairSumario(html) {
  const itens = [];
  const usados = new Set();

  // Rebaixa qualquer H1 que tenha sobrado no corpo. O H1 da página é o título
  // do documento, renderizado pelo cabeçalho da vista de leitura; um segundo
  // H1 aqui quebra a árvore de cabeçalhos para leitor de tela. Só remover o
  // primeiro do markdown não bastava — 229 documentos traziam o H1 depois de
  // um callout ou de uma citação de abertura.
  const semH1 = html.replace(/<h1>([\s\S]*?)<\/h1>/g, "<h2>$1</h2>");

  const comId = semH1.replace(/<h([2-4])>(.*?)<\/h\1>/g, (_m, nivel, interno) => {
    const texto = interno.replace(/<[^>]+>/g, "").trim();
    let id = slugificar(texto) || "secao";
    let n = 2;
    while (usados.has(id)) id = `${slugificar(texto)}-${n++}`;
    usados.add(id);
    itens.push({ id, texto, nivel: Number(nivel) });
    return `<h${nivel} id="${id}" class="mv-h mv-h--${nivel}">${interno}<a class="mv-ancora" href="#${id}" aria-label="Link para esta seção">#</a></h${nivel}>`;
  });
  return { html: comId, sumario: itens };
}

/**
 * Normaliza o campo de fonte para uma lista de textos.
 *
 * O `fontes:` do frontmatter chega em três formas — texto, lista de textos e
 * lista de OBJETOS (`{tipo: ..., arquivo: ...}`). A página mostrava
 * "[object Object] · [object Object]" porque juntava os três do mesmo jeito.
 */
function normalizarFonte(bruto) {
  if (!bruto) return null;

  const texto = (v) => {
    if (v == null) return null;
    if (typeof v === "string") return v.trim() || null;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "object") {
      // Pega o campo mais parecido com um rótulo legível; se não houver,
      // junta os valores primitivos em vez de deixar cair em [object Object].
      for (const c of ["titulo", "title", "nome", "arquivo", "ref", "fonte"]) {
        if (typeof v[c] === "string" && v[c].trim()) return v[c].trim();
      }
      const vals = Object.values(v).filter((x) => typeof x === "string" && x.trim());
      return vals.length ? vals.join(" — ") : null;
    }
    return null;
  };

  // Caminho de arquivo não é procedência legível. O frontmatter guarda coisas
  // como `03-Disciplinas\Farmacologia\Revisao\Resumos\P2-Tema-08-AINEs\
  // P2-T08-AINEs-Parte-1.md`, e mostrar isso na tela é despejar estrutura de
  // pasta em cima de quem só quer saber de onde veio o material.
  const legivel = (s) => {
    const t = String(s).trim();
    if (!/[\\/]/.test(t) && !/\.md$/i.test(t)) return t;
    return t
      .split(/[\\/]/).pop()          // só o nome do arquivo
      .replace(/\.(md|pdf|docx?|pptx?)$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
  };

  const lista = (Array.isArray(bruto) ? bruto : [bruto])
    .map(texto).filter(Boolean)
    // Uma fonte só costuma listar várias separadas por `|` ou `+`. Sem dividir,
    // o caminho de arquivo no meio da string escapava da limpeza.
    .flatMap((s) => String(s).split(/\s*[|+]\s*/))
    .map(legivel).filter(Boolean)
    // Número solto não é procedência. O frontmatter às vezes traz `{capitulo: 28}`
    // e a extração devolvia "28" — verdadeiro, mas inútil na tela.
    .filter((s) => s.length > 2 && !/^\d+$/.test(s));

  // Sem duplicata: fontes vindas de `fonte` e `fontes` costumam repetir.
  return lista.length ? [...new Set(lista)] : null;
}

function palavrasEMinutos(md) {
  const texto = md.replace(/<[^>]+>/g, " ").replace(/[#>*_`|-]/g, " ");
  const palavras = (texto.match(/\p{L}+/gu) || []).length;
  return { palavras, minutos: Math.max(1, Math.round(palavras / 200)) };
}

// ─────────────────────────────────────────────────────── principal

async function principal() {
  const t0 = Date.now();

  if (!fs.existsSync(VAULT)) {
    console.error(`[conteudo] vault não encontrado em ${VAULT}`);
    process.exit(1);
  }

  await fsp.mkdir(SAIDA_MEDIA, { recursive: true });
  await fsp.mkdir(path.join(SAIDA_DADOS, "docs"), { recursive: true });

  log("varrendo vault…");
  const todos = await listarArquivos(VAULT);
  const arquivosMd = todos.filter((f) => f.toLowerCase().endsWith(".md"));
  log(`${todos.length} arquivos, ${arquivosMd.length} markdown`);

  const indices = [indexarAssets(todos)];
  for (const raiz of RAIZES_MIDIA) {
    if (!fs.existsSync(raiz)) {
      log(`AVISO: raiz de mídia indisponível, seguindo sem ela → ${raiz}`);
      continue;
    }
    const arquivosRaiz = await listarArquivos(raiz);
    indices.push(indexarAssets(arquivosRaiz, raiz));
    log(`+ raiz de mídia ${raiz} → ${arquivosRaiz.length} arquivos`);
  }
  const indice = fundirIndices(indices);
  log(`${indice.porCaminho.size} assets indexados (${indice.porNome.size} nomes distintos)`);

  const descricoes = indexarDescricoes(arquivosMd);
  log(`${descricoes.size} figuras descritas indexadas`);

  marked.setOptions({ gfm: true, breaks: false, mangle: false, headerIds: false });

  const docs = [];
  const stats = { pulados: 0, figuras: 0, descritas: 0, faltando: 0, alvosFaltando: new Map() };

  for (const abs of arquivosMd) {
    const rel = path.relative(VAULT, abs).split(path.sep).join("/");

    // Só material de estudo. O vault tem milhares de notas-de-imagem e MOCs.
    const emDisciplinas = rel.startsWith("03-Disciplinas/");
    const emBiblioteca = rel.startsWith("07-Biblioteca-Geral/");
    if (!emDisciplinas && !emBiblioteca) { stats.pulados++; continue; }

    let bruto;
    try { bruto = await fsp.readFile(abs, "utf8"); } catch { stats.pulados++; continue; }
    if (bruto.trim().length < 200) { stats.pulados++; continue; }

    let fm = {}, corpo = bruto;
    try { const p = matter(bruto); fm = p.data ?? {}; corpo = p.content; } catch { /* sem frontmatter */ }

    if (fm.tipo && TIPOS_NAO_CONTEUDO.has(slugificar(fm.tipo))) { stats.pulados++; continue; }

    const cls = classificar(rel, fm);

    // Remove o H1 de abertura do corpo. O título vira metadado do documento e
    // a página de leitura o renderiza no cabeçalho — deixá-lo aqui também dava
    // dois <h1> na mesma página, o que quebra a árvore de cabeçalhos para
    // leitor de tela e duplica o título na tela.
    const corpoSemH1 = corpo.replace(/^\s*#\s+.+?(\n|$)/, "");

    const pre = await preprocessarObsidian(corpoSemH1, indice, cls.disciplina, descricoes);
    stats.figuras += pre.figuras.length - pre.descritas;
    stats.descritas += pre.descritas;
    stats.faltando += pre.faltando.length;
    for (const f of pre.faltando) {
      stats.alvosFaltando.set(f, (stats.alvosFaltando.get(f) ?? 0) + 1);
    }

    const comCallouts = transformarCallouts(pre.md);
    const htmlBruto = converterEnfaseResidual(marked.parse(comCallouts));
    const { html, sumario } = extrairSumario(htmlBruto);
    const { palavras, minutos } = palavrasEMinutos(corpo);

    // Título: H1 do corpo, senão frontmatter, senão nome do arquivo.
    const mH1 = corpo.match(/^#\s+(.+)$/m);
    const titulo = (mH1?.[1] ?? fm.titulo ?? path.basename(rel, ".md").replace(/[-_]/g, " "))
      // Ênfase de markdown não sobrevive num campo de texto puro. Tirar só o
      // `**` deixava passar o itálico de um asterisco, e títulos chegavam à
      // tela como "T10 — Litiasis Urinaria (*Litiasis Urinaria*)".
      .replace(/\*\*|__/g, "")
      // Sem âncora de espaço: o itálico costuma vir dentro de parênteses —
      // "Litiasis Urinaria (*Litiasis Urinaria*)" — e exigir espaço antes do
      // asterisco deixava justamente esse caso passar.
      .replace(/\*([^*\n]+)\*/g, "$1")
      .replace(/`/g, "")
      .trim();

    const id = crypto.createHash("sha1").update(rel).digest("hex").slice(0, 10);

    const doc = {
      id,
      titulo,
      caminho: rel,
      disciplina: cls.disciplina,
      tipo: cls.tipo,
      parcial: cls.parcial,
      tema: cls.temaSlug,
      temaRotulo: cls.temaRotulo,
      temaNum: cls.temaNum,
      periodo: config.disciplinas[cls.disciplina]?.periodo ?? 0,
      tags: Array.isArray(fm.tags) ? fm.tags : typeof fm.tags === "string" ? [fm.tags] : [],
      fonte: normalizarFonte(fm.fonte ?? fm.fontes),
      status: fm.status ?? null,
      data: fm.data ?? null,
      palavras,
      minutos,
      figuras: pre.figuras.length,
      capa: pre.figuras[0]?.url ?? null,
    };

    docs.push(doc);
    await fsp.writeFile(
      path.join(SAIDA_DADOS, "docs", `${id}.json`),
      JSON.stringify({ ...doc, html, sumario, listaFiguras: pre.figuras }),
    );
  }

  log(`${docs.length} documentos renderizados (${stats.pulados} pulados)`);
  log(`${stats.figuras} figuras resolvidas, ${stats.faltando} embeds não resolvidos`);

  // ── monta a árvore de navegação
  const arvore = {};
  for (const d of docs) {
    const disc = (arvore[d.disciplina] ??= {
      slug: d.disciplina,
      ...(config.disciplinas[d.disciplina] ?? config.disciplinas.outros),
      total: 0,
      parciais: {},
    });
    disc.total++;

    const parc = (disc.parciais[d.parcial] ??= {
      chave: d.parcial,
      ...(config.parciais[d.parcial] ?? { rotulo: d.parcial, ordem: 99 }),
      total: 0,
      temas: {},
    });
    parc.total++;

    const tema = (parc.temas[d.tema] ??= {
      slug: d.tema,
      rotulo: d.temaRotulo,
      num: d.temaNum,
      total: 0,
      tipos: {},
    });
    tema.total++;
    // Documentos do mesmo tema podem chegar com rótulos de riqueza diferente:
    // uns só "Tema 04", outros "Tema 04 — Exame Físico Geral". O descritivo
    // ganha, senão a navegação exibe o rótulo do primeiro documento que
    // apareceu, que é arbitrário.
    if (d.temaRotulo.length > tema.rotulo.length) tema.rotulo = d.temaRotulo;

    const tp = (tema.tipos[d.tipo] ??= {
      chave: d.tipo,
      ...(config.tiposArtefato[d.tipo] ?? { rotulo: d.tipo, icone: "resumo", ordem: 99 }),
      docs: [],
    });
    tp.docs.push({
      id: d.id, titulo: d.titulo, minutos: d.minutos,
      figuras: d.figuras, capa: d.capa, palavras: d.palavras,
    });
  }

  // Map -> array ordenado, pra UI não precisar ordenar em runtime.
  const disciplinas = Object.values(arvore)
    .map((disc) => ({
      ...disc,
      parciais: Object.values(disc.parciais)
        .map((p) => ({
          ...p,
          temas: Object.values(p.temas)
            .map((t) => ({
              ...t,
              tipos: Object.values(t.tipos).sort((a, b) => a.ordem - b.ordem),
            }))
            .sort((a, b) => a.num - b.num || a.rotulo.localeCompare(b.rotulo)),
        }))
        .sort((a, b) => a.ordem - b.ordem),
    }))
    .sort((a, b) => (a.periodo || 99) - (b.periodo || 99) || a.rotulo.localeCompare(b.rotulo));

  const periodos = [];
  for (const d of disciplinas) {
    let p = periodos.find((x) => x.numero === d.periodo);
    if (!p) {
      p = {
        numero: d.periodo,
        rotulo: config.rotulosPeriodo[String(d.periodo)] ?? "Não classificado",
        ciclo: config.ciclos.find((c) => c.periodos.includes(d.periodo))?.id ?? null,
        disciplinas: [],
      };
      periodos.push(p);
    }
    p.disciplinas.push(d.slug);
  }
  periodos.sort((a, b) => (a.numero || 99) - (b.numero || 99));

  const indiceFinal = {
    geradoEm: new Date().toISOString(),
    stats: {
      documentos: docs.length,
      figuras: stats.figuras,
      embedsNaoResolvidos: stats.faltando,
      midiaEmitida: cacheMedia.size,
      disciplinas: disciplinas.length,
    },
    ciclos: config.ciclos,
    // Em que período a turma está agora. A interface usa isto para destacar
    // o que é atual e recolher o que já passou.
    periodoAtual: config.periodoAtual ?? null,
    periodos,
    disciplinas,
    tiposArtefato: config.tiposArtefato,
    // Índice de busca enxuto — carrega junto, sem segundo request.
    busca: docs.map((d) => ({
      id: d.id, t: d.titulo, d: d.disciplina, tp: d.tipo,
      p: d.parcial, tm: d.temaRotulo, m: d.minutos,
    })),
  };

  await fsp.writeFile(
    path.join(SAIDA_DADOS, "index.json"),
    JSON.stringify(indiceFinal),
  );

  // Relatório de embeds não resolvidos, pra dar pra consertar o vault.
  if (stats.alvosFaltando.size) {
    const rel = [...stats.alvosFaltando.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([alvo, n]) => `${String(n).padStart(4)}×  ${alvo}`)
      .join("\n");
    await fsp.writeFile(
      path.join(RAIZ_PROJETO, "docs", "assets-nao-resolvidos.txt"),
      `${stats.alvosFaltando.size} alvos distintos não resolvidos\n\n${rel}\n`,
    );
  }

  const totalEmbeds = stats.figuras + stats.descritas + stats.faltando;
  const pct = (n) => (totalEmbeds ? ((n / totalEmbeds) * 100).toFixed(1) : "0.0");

  log("─".repeat(52));
  log(`documentos          ${docs.length}`);
  log(`disciplinas         ${disciplinas.length}`);
  log(`imagens reais       ${stats.figuras}  (${pct(stats.figuras)}%)`);
  log(`figuras descritas   ${stats.descritas}  (${pct(stats.descritas)}%)`);
  log(`órfãs (omitidas)    ${stats.faltando}  (${pct(stats.faltando)}%)`);
  log(`→ EMBEDS COM ALGO   ${pct(stats.figuras + stats.descritas)}%`);
  log(`mídia emitida       ${cacheMedia.size} arquivos`);
  log(`tempo               ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  log("─".repeat(52));
}

principal().catch((e) => {
  console.error("[conteudo] falhou:", e);
  process.exit(1);
});
