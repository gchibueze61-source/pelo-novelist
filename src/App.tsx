import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Workspace from "./pages/Workspace";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper dark:bg-surface">
        <p className="font-display text-lg text-muted dark:text-muted-dark">Loading…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/sign-in" element={user ? <Navigate to="/" replace /> : <SignIn />} />
      <Route path="/sign-up" element={user ? <Navigate to="/" replace /> : <SignUp />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Workspace />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
