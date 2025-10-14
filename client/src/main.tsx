import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

import { Client } from "@heroiclabs/nakama-js";
import { NakamaProvider } from "./context/authContext.tsx";

var useSSL = false;
var client = new Client("defaultkey", "127.0.0.1", "7350", useSSL);

async function test() {
  var email = "super@heroes.com";
  var password = "batsignal";
  const session = await client.authenticateEmail(email, password);
  console.info(session);
}

test();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NakamaProvider>
      <App />
    </NakamaProvider>
  </StrictMode>,
);
