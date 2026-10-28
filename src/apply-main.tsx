import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ApplyPage from "./ApplyPage";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApplyPage />
  </StrictMode>,
);
