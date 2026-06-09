import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Bens } from './pages/Bens';
import { Transferencias } from './pages/Transferencias';
import { Auditoria } from './pages/Auditoria';
import { Login } from './pages/Login';
import { Empresas } from './pages/Empresas';
import { DefinirSenha } from './pages/DefinirSenha';
import { Usuarios } from './pages/Usuarios';
import { Categorias } from './pages/Categorias';
import { Setores } from './pages/Setores';
import { Historico } from './pages/Historico';
import { AuthProvider, useAuth } from './contexts/AuthContext';


// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/definir-senha" element={<DefinirSenha />} />
          
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="bens" element={<Bens />} />
            <Route path="categorias" element={<Categorias />} />
            <Route path="setores" element={<Setores />} />
            <Route path="transferencias" element={<Transferencias />} />
            <Route path="historico" element={<Historico />} />
            <Route path="auditoria" element={<Auditoria />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="empresas" element={<Empresas />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
