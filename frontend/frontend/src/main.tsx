import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";

// Retrieve DOM mount node and throw early if missing
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element in index.html.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
