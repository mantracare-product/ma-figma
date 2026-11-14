
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import "./lib/ruleEngine";

  // Dev-only: test hook for the Tampermonkey RCM tests (tools/tm-tests). Removed from production builds.
  if (import.meta.env.DEV) {
    void import("./dev/rcmTestHook");
  }

  createRoot(document.getElementById("root")!).render(<App />);
  