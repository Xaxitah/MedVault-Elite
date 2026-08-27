/**
 * Recomprime as imagens já emitidas, no lugar.
 *
 * Os nomes de arquivo são hash do ARQUIVO DE ORIGEM, não do resultado — então
 * recomprimir mantém o nome e todo o HTML já gerado continua válido. Isso evita
 * reprocessar o pipeline inteiro, que releria 9.589 arquivos do Google Drive.
 *
 * 1600px/q82 era generoso demais para leitura em tela: nenhuma figura do
 * acervo é examinada além da largura da coluna, e o lightbox raramente passa
 * de 1200px de exibição.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR = "public/media";
const LARGURA = 1400;
const QUALIDADE = 76;

const arquivos = fs.readdirSync(DIR).filter((f) => f.endsWith(".webp"));
let antes = 0, depois = 0, falhas = 0;

for (let i = 0; i < arquivos.length; i++) {
  const p = path.join(DIR, arquivos[i]);
  try {
    const buf = fs.readFileSync(p);
    antes += buf.length;
    const meta = await sharp(buf).metadata();
    const novo = await sharp(buf)
      .resize({ width: Math.min(meta.width, LARGURA), withoutEnlargement: true })
      .webp({ quality: QUALIDADE })
      .toBuffer();
    // Só grava se realmente encolheu — recomprimir algo já pequeno pode inchar.
    if (novo.length < buf.length) { fs.writeFileSync(p, novo); depois += novo.length; }
    else depois += buf.length;
  } catch {
    falhas++;
    depois += fs.statSync(p).size;
  }
  if ((i + 1) % 500 === 0) console.log(`  ${i + 1}/${arquivos.length}`);
}

const mb = (n) => (n / 1024 / 1024).toFixed(0);
console.log(`\n${arquivos.length} imagens | ${falhas} falhas`);
console.log(`${mb(antes)} MB -> ${mb(depois)} MB  (${(100 - depois / antes * 100).toFixed(0)}% menor)`);
