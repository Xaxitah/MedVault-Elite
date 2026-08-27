/**
 * Alternativas de marca — guardadas, não descartadas.
 *
 * A escolhida é "O Fólio", em Logo.jsx. Estas duas passaram no teste de
 * renderização e ficam prontas para troca.
 *
 * Para trocar a marca do site inteiro, edite `src/components/Logo.jsx` para
 * reexportar uma destas:
 *
 *     export { LogoVinco as default } from "./Logo.alternativas.jsx";
 *
 * Nada mais precisa mudar — o Shell consome só o export padrão de Logo.jsx.
 * Lembre de trocar `public/favicon.svg` junto, senão a aba e o site divergem.
 */

/**
 * A — O VINCO
 *
 * O M de Med contém um V: o vértice central de um M *é* um V. Aqui esse
 * vértice é o vinco de uma prancha aberta, e a régua embaixo é o fio de
 * disciplina.
 *
 * Veredito do teste: funciona em todos os tamanhos, mas lê como **letra**.
 * Perdeu para o Fólio exatamente por isso — o dono pediu para sair do
 * monograma. Fica salva porque é a opção mais segura e mais literal: quem
 * bate o olho entende "MedVault" na hora, sem precisar do texto ao lado.
 */
export function LogoVinco({ tamanho = 32, className, cor }) {
  const tinta = cor ?? "var(--acento-ink, #01614D)";
  return (
    <svg
      width={tamanho} height={tamanho} viewBox="0 0 48 48" fill="none"
      className={className} role="img" aria-label="MedVault"
    >
      <path
        d="M6 37V13l18 14 18-14v24"
        stroke={tinta} strokeWidth="4.6"
        strokeLinecap="square" strokeLinejoin="miter"
      />
      <path d="M6 42h36" stroke={tinta} strokeWidth="3.4" />
    </svg>
  );
}

/**
 * C — A CHAVE (revisada)
 *
 * A linha de chamada numerada — o gesto que aponta de um rótulo para uma
 * estrutura — é a assinatura do atlas anatômico, e ninguém no mercado a usa
 * como marca.
 *
 * A primeira versão FALHOU no teste visual: ponto redondo embaixo à esquerda
 * mais haste vertical lia como **colcheia**. Leitura acidental fatal num site
 * de medicina.
 *
 * Esta revisão conserta com duas mudanças: quadrado no lugar do círculo
 * (cabeça de nota é redonda, então quadrado mata a leitura musical) e a
 * chamada termina numa barra horizontal de rótulo, que fecha a forma como
 * chave e não como haste.
 *
 * É a mais original das três e a de maior risco: depende de o leitor
 * reconhecer a convenção do atlas.
 */
export function LogoChave({ tamanho = 32, className, cor }) {
  const tinta = cor ?? "var(--acento-ink, #01614D)";
  return (
    <svg
      width={tamanho} height={tamanho} viewBox="0 0 48 48" fill="none"
      className={className} role="img" aria-label="MedVault"
    >
      {/* a estrutura apontada */}
      <rect x="5" y="29" width="11" height="11" rx="1.5" fill={tinta} />
      {/* a chamada, com cotovelo */}
      <path
        d="M21 34.5h7V13.5h6"
        stroke={tinta} strokeWidth="4.2" strokeLinecap="square"
      />
      {/* a barra de rótulo */}
      <path d="M34 8v11" stroke={tinta} strokeWidth="4.2" strokeLinecap="round" />
      <path d="M34 13.5h9" stroke={tinta} strokeWidth="4.2" strokeLinecap="round" />
    </svg>
  );
}
