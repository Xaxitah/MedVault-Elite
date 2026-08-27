import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";

import "./styles/tokens.css";
import "./styles/base.css";

// HashRouter, e não BrowserRouter, de propósito: o GitHub Pages não faz
// fallback de rota no servidor, então /disciplina/farmacologia daria 404 no
// refresh. O hash mantém tudo do lado do cliente.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
