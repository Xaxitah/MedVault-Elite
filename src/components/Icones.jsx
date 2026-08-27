/**
 * Conjunto de ícones — um por tipo de artefato, mais o essencial de navegação.
 *
 * Feitos à mão numa grade de 24, traço de 1.5, extremidades e junções
 * arredondadas. Todos herdam `currentColor`, então recolorem sozinhos junto
 * com o acento da disciplina.
 *
 * Por que não uma biblioteca: são 16 tipos de artefato e eles precisam ser
 * distinguíveis de relance numa grade. Conjuntos genéricos dão três ícones
 * de "documento" quase iguais para resumo, transcrição e capítulo — o que
 * derruba justamente a leitura rápida que a grade existe para dar.
 */

const base = {
  width: 24, height: 24, viewBox: "0 0 24 24",
  fill: "none", stroke: "currentColor",
  strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round",
};

const CAMINHOS = {
  // ── artefatos ──────────────────────────────────────────────────────
  // Resumo: folha com linhas de texto.
  resumo: <><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v4h4"/><path d="M8.5 12.5h7M8.5 16h4.5"/></>,
  // Véspera: lua — o material da noite anterior.
  vespera: <><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/><path d="M16 4.5v3M14.5 6h3"/></>,
  // Mapa mental: nó central com ramos.
  mapa: <><circle cx="12" cy="12" r="2.6"/><circle cx="4.5" cy="6" r="1.8"/><circle cx="4.5" cy="18" r="1.8"/><circle cx="19.5" cy="12" r="1.8"/><path d="M9.7 10.9 6.2 7.4M9.7 13.2l-3.5 3.4M14.6 12h3.1"/></>,
  // Flashcard: cartas empilhadas.
  flashcard: <><rect x="3" y="7" width="14" height="12" rx="2"/><path d="M7 4.5h11a2 2 0 0 1 2 2v9"/><path d="M7 12h6M7 15h3.5"/></>,
  // Questão: interrogação em bloco.
  questao: <><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M9.6 9.2a2.5 2.5 0 1 1 3.2 2.4c-.6.2-1 .8-1 1.5v.4"/><circle cx="11.8" cy="16.6" r=".9" fill="currentColor" stroke="none"/></>,
  // Quiz: cronômetro — teste com tempo.
  quiz: <><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.8M9.5 2.5h5M19 6.5l1.5-1.5"/></>,
  // Podcast: microfone.
  podcast: <><rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5M8.5 21.5h7"/></>,
  // Infográfico: barras de dados num quadro.
  infografico: <><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 16.5v-4M12 16.5v-7M16 16.5v-2.5"/></>,
  // Vídeo: botão de play.
  video: <><rect x="2.5" y="4.5" width="19" height="15" rx="3"/><path d="M10.2 9.3v5.4l4.6-2.7z" fill="currentColor" stroke="none"/></>,
  // Slide: tela de apresentação.
  slide: <><rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M12 16.5v4M8.5 20.5h7M6.5 8h7M6.5 11.5h4"/></>,
  // Tabela: grade.
  tabela: <><rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M3 9.5h18M3 14.5h18M9.5 9.5v10"/></>,
  // Revisão espaçada: setas circulares — repetição.
  espacada: <><path d="M20.5 12a8.5 8.5 0 1 1-2.9-6.4"/><path d="M20.5 4v4.5H16"/><path d="M12 8.5V12l2.5 1.5"/></>,
  // História clínica: prancheta com pulso.
  clinica: <><path d="M8.5 4.5H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6.5a2 2 0 0 0-2-2h-1.5"/><rect x="8.5" y="2.5" width="7" height="4" rx="1.2"/><path d="M7.8 14h2.4l1.3-2.4 1.6 4 1.2-1.6h1.9"/></>,
  // Transcrição: aspas.
  transcricao: <><path d="M9.5 6.5c-2.8 0-4.5 2-4.5 4.6 0 2 1.3 3.4 3.1 3.4 1.6 0 2.8-1.1 2.8-2.6 0-1.4-1-2.5-2.4-2.5-.3 0-.6 0-.8.1.3-1 1.1-1.6 2.3-1.7z" fill="currentColor" stroke="none"/><path d="M18 6.5c-2.8 0-4.5 2-4.5 4.6 0 2 1.3 3.4 3.1 3.4 1.6 0 2.8-1.1 2.8-2.6 0-1.4-1-2.5-2.4-2.5-.3 0-.6 0-.8.1.3-1 1.1-1.6 2.3-1.7z" fill="currentColor" stroke="none"/><path d="M5 18.5h14"/></>,
  // Livro: capa aberta.
  livro: <><path d="M3.5 5.2c2.8-.9 5.6-.9 8.5 0v14c-2.9-.9-5.7-.9-8.5 0z"/><path d="M20.5 5.2c-2.8-.9-5.6-.9-8.5 0v14c2.8-.9 5.7-.9 8.5 0z"/></>,
  // Prova antiga: papel com selo.
  prova: <><path d="M6 2.5h8l4 4V19a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 4 19V5a2.5 2.5 0 0 1 2-2.5Z"/><path d="M14 2.5v4h4"/><circle cx="11.5" cy="13.5" r="3"/><path d="M9.9 16v4l1.6-1.1 1.6 1.1v-4"/></>,

  // ── navegação e interface ──────────────────────────────────────────
  inicio: <><path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.2V19a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9.2"/><path d="M9.8 20.5v-5.8h4.4v5.8"/></>,
  grade: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/></>,
  biblioteca: <><path d="M4 4.5h3.5v15H4zM9 4.5h3.5v15H9z"/><path d="m14.6 5.4 3.3-.9 3.1 14.5-3.4.9z"/></>,
  agenda: <><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 9.8h18M8 3v4M16 3v4"/><circle cx="8.5" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="14" r="1" fill="currentColor" stroke="none"/></>,
  enviar: <><path d="M12 16.5V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M4.5 15v3.5A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5V15"/></>,
  buscar: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m20.5 20.5-4.9-4.9"/></>,
  seta: <><path d="m9 5.5 6.5 6.5L9 18.5"/></>,
  fechar: <><path d="m5.5 5.5 13 13M18.5 5.5l-13 13"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  relogio: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.3 2"/></>,
  imagem: <><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="8.6" cy="10" r="1.7"/><path d="m3.4 17.2 4.8-4.3 3.5 3.1 3.3-3 5 4.4"/></>,
  usuario: <><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/></>,
  externo: <><path d="M13.5 4.5H19.5V10.5"/><path d="m19.5 4.5-8 8"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></>,
};

export default function Icone({ nome, tamanho = 24, className, ...resto }) {
  const d = CAMINHOS[nome];
  if (!d) {
    if (import.meta.env.DEV) console.warn(`[Icone] desconhecido: "${nome}"`);
    return null;
  }
  return (
    <svg
      {...base}
      width={tamanho}
      height={tamanho}
      className={className}
      aria-hidden="true"
      focusable="false"
      {...resto}
    >
      {d}
    </svg>
  );
}

export const iconesDisponiveis = Object.keys(CAMINHOS);
