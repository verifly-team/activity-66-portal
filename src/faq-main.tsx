import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import FaqPage from "./FaqPage";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FaqPage />
  </StrictMode>,
);
