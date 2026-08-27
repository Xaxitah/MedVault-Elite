/**
 * Marca MedVault — "O Fólio".
 *
 * Volume encadernado visto de frente: lombada sólida à esquerda, três réguas
 * decrescentes à direita. As réguas são as camadas da hierarquia do site
 * (disciplina → parcial → tema) e, ao mesmo tempo, a abstração de texto numa
 * página.
 *
 * Escolhida sobre duas alternativas em teste de renderização real
 * (ver docs/MARCA.md). Os dois motivos que decidiram:
 *   - Não é uma letra num quadrado. Monograma é o destino padrão de marca de
 *     projeto, e é justamente o que o dono pediu para sair.
 *   - Sobrevive a 16px. É só massa e fio — sem traço fino que suma, sem
 *     detalhe que vire borrão na aba do navegador.
 *
 * Herda a cor do contexto via `--acento-ink`, então recolore sozinha junto
 * com a disciplina ativa.
 */
export default function Logo({ tamanho = 32, className, cor }) {
  const tinta = cor ?? "var(--acento-ink, #01614D)";

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="MedVault"
    >
      {/* lombada */}
      <rect x="5" y="7" width="8" height="34" rx="1.5" fill={tinta} />
      {/* as três camadas da hierarquia */}
      <path
        d="M19 14h24M19 24h18M19 34h12"
        stroke={tinta}
        strokeWidth="4.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
