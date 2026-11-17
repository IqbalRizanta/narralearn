import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../lib/auth";
import { Layout } from "./Layout";
import { Logo } from "./Logo";
import { Spinner } from "./Button";

export function FullPageLoader({ label = "Menyiapkan ruang belajar…" }: { label?: string }) {
  return (
    <div className="full-loader">
      <Logo size={46} />
      <Spinner size={24} />
      <p>{label}</p>
    </div>
  );
}

export function AuthGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export function PublicOnly() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (user) {
    const from =
      (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={from} replace />;
  }
  return <Outlet />;
}
