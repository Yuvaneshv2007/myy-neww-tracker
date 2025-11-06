import React from "react";
import { createRoot } from "react-dom/client";
import MyyTracker from "./App";

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <MyyTracker />
  </React.StrictMode>
);
