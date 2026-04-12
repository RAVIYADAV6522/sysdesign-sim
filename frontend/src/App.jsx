import { Navigate, Route, Routes } from "react-router-dom";

import { AuthCallbackPage } from "./pages/AuthCallbackPage.jsx";
import { DesignsPage } from "./pages/DesignsPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { SimulatorPage } from "./pages/SimulatorPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SimulatorPage />} />
      <Route path="/design/:id" element={<SimulatorPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/designs" element={<DesignsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
