import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import { MAINTENANCE_MODE } from "./config/maintenance";
import Maintenance from "./pages/Maintenance";

createRoot(document.getElementById("root")!).render(
  MAINTENANCE_MODE ? <Maintenance /> : <App />
);
