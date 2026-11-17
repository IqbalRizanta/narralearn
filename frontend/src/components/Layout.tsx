import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Download,
  LayoutDashboard,
  LogOut,
  Mic2,
  Moon,
  Plus,
  Settings,
  Sun,
  WifiOff,
} from "lucide-react";

import { useAuth } from "../lib/auth";
import { useInstallPrompt } from "../lib/useInstallPrompt";
import { useTheme } from "../lib/theme";
import { cn, initials } from "../lib/utils";
import { Logo } from "./Logo";
import { IconButton } from "./Button";

const NAV_ITEMS = [
  { to: "/", label: "Beranda", icon: LayoutDashboard, end: true },
  { to: "/sessions/new", label: "Studio", icon: Plus, end: false },
  { to: "/profiles", label: "Profil suara", icon: Mic2, end: false },
  { to: "/settings", label: "Pengaturan", icon: Settings, end: false },
];

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

function ThemeButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <IconButton
      label={theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      onClick={toggleTheme}
      variant="secondary"
      size="sm"
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </IconButton>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { canInstall, promptInstall } = useInstallPrompt();
  const online = useOnlineStatus();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link to="/" className="sidebar-brand" aria-label="NarraLearn beranda">
            <Logo />
          </Link>

          <Link to="/sessions/new" className="btn btn-primary btn-block sidebar-cta">
            <Plus size={17} />
            <span>Studio baru</span>
          </Link>

          <nav className="sidebar-nav" aria-label="Navigasi utama">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn("nav-item", isActive && "is-active")
                  }
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-bottom">
          {canInstall && (
            <button
              type="button"
              className="sidebar-install"
              onClick={() => void promptInstall()}
            >
              <Download size={16} />
              <span>Pasang NarraLearn</span>
            </button>
          )}
          <div className="sidebar-user">
            <span className="avatar avatar-sm">{initials(user?.full_name ?? "N")}</span>
            <span className="sidebar-user-text">
              <strong>{user?.full_name}</strong>
              <small>{user?.email}</small>
            </span>
            <IconButton label="Keluar" size="sm" onClick={() => void handleLogout()}>
              <LogOut size={16} />
            </IconButton>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <Link to="/" className="topbar-brand" aria-label="NarraLearn beranda">
            <Logo size={34} />
          </Link>
          <div className="topbar-actions">
            {!online && (
              <span className="offline-pill">
                <WifiOff size={14} /> Offline
              </span>
            )}
            {canInstall && (
              <button
                type="button"
                className="btn btn-secondary btn-sm hide-mobile"
                onClick={() => void promptInstall()}
              >
                <Download size={15} />
                <span>Pasang app</span>
              </button>
            )}
            <ThemeButton />
            <Link
              to="/settings"
              className="topbar-avatar"
              aria-label="Buka pengaturan akun"
            >
              {initials(user?.full_name ?? "N")}
            </Link>
          </div>
        </header>

        <main className="content" id="main-content">
          {children}
        </main>

        <nav className="mobile-nav" aria-label="Navigasi seluler">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn("mobile-nav-item", isActive && "is-active")
                }
              >
                <Icon size={20} />
                <span>{item.label === "Profil suara" ? "Profil" : item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
