
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { ErrorBoundary } from "./app/components/ErrorBoundary.tsx";
  import { applyAppearance } from "./app/lib/useAppearance";
  import "./styles/index.css";

  // 启动时立即应用主题 / 字号（避免页面闪一下默认深色）
  applyAppearance();

  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
