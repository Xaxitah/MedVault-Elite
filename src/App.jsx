import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Shell from "./components/Shell.jsx";
import Carregando from "./components/Carregando.jsx";

// Divisão por rota. O leitor arrasta o renderizador de markdown e o zoom de
// figura; não faz sentido pagar por isso na home.
const Inicio = lazy(() => import("./paginas/Inicio.jsx"));
const Disciplinas = lazy(() => import("./paginas/Disciplinas.jsx"));
const Disciplina = lazy(() => import("./paginas/Disciplina.jsx"));
const Parcial = lazy(() => import("./paginas/Parcial.jsx"));
const Tema = lazy(() => import("./paginas/Tema.jsx"));
const Leitura = lazy(() => import("./paginas/Leitura.jsx"));
const Biblioteca = lazy(() => import("./paginas/Biblioteca.jsx"));
const Agenda = lazy(() => import("./paginas/Agenda.jsx"));
const Contribuir = lazy(() => import("./paginas/Contribuir.jsx"));
const Busca = lazy(() => import("./paginas/Busca.jsx"));
const NaoEncontrado = lazy(() => import("./paginas/NaoEncontrado.jsx"));

export default function App() {
  return (
    <Shell>
      <Suspense fallback={<Carregando />}>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/disciplinas" element={<Disciplinas />} />
          <Route path="/disciplina/:disciplina" element={<Disciplina />} />
          <Route path="/disciplina/:disciplina/:parcial" element={<Parcial />} />
          <Route path="/disciplina/:disciplina/:parcial/:tema" element={<Tema />} />
          <Route path="/ler/:id" element={<Leitura />} />
          <Route path="/biblioteca" element={<Biblioteca />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/contribuir" element={<Contribuir />} />
          <Route path="/buscar" element={<Busca />} />
          <Route path="/painel" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NaoEncontrado />} />
        </Routes>
      </Suspense>
    </Shell>
  );
}
