import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

// Apply the persisted theme before React mounts so there's no flash of the
// wrong theme on load.
const storedTheme = localStorage.getItem("documind-theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
document.documentElement.classList.toggle("dark", storedTheme === "dark" || (!storedTheme && prefersDark));

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root was not found in index.html");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
