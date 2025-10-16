import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

import { NakamaProvider } from "./context/authContext.tsx";
import { MatchProvider } from "./context/matchContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NakamaProvider>
      <MatchProvider>
        <App />
      </MatchProvider>
    </NakamaProvider>
  </StrictMode>,
);
