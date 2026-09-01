import { lazy, Suspense, useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Link } from "react-router-dom";
import { api } from "./services/api";
import { Icons } from "./icons/Icons";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { getInitials, formatShortName } from "./utils/formatters";

// Pages
const PageHome = lazy(() => import("./pages/Home/PageHome"));
const PageDashboard = lazy(() => import("./pages/Dashboard/PageDashboard"));
const PageClients = lazy(() => import("./pages/Clients/PageClients"));
const PageDocuments = lazy(() => import("./pages/Documents/PageDocuments"));
const PageUsers = lazy(() => import("./pages/Users/PageUsers"));
const PageProfile = lazy(() => import("./pages/Profile/PageProfile"));
const PageSettings = lazy(() => import("./pages/Settings/PageSettings"));
const PageHelp = lazy(() => import("./pages/Help/PageHelp"));
const PageTelephony = lazy(() => import("./pages/Telephony/PageTelephony"));
const PageFlowTemplates = lazy(() => import("./pages/FlowTemplates/PageFlowTemplates"));
const PageAlerts = lazy(() => import("./pages/Alerts/PageAlerts"));
import LoginScreen from "./pages/Login/LoginScreen";
import { CommandPalette } from "./components/app/CommandPalette";

const NAV = [
  { id: "home", path: "/", label: "Início", icon: <Icons.Dashboard /> },
  { id: "dashboard", path: "/dashboard", label: "Visão Geral", icon: () => <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg> },
  { id: "clients", path: "/clientes", label: "Clientes", icon: <Icons.Users /> },
  { id: "docs", path: "/documentos", label: "Documentos", icon: <Icons.Doc /> },
  { id: "telephony", path: "/telefonia", label: "Telefonia", icon: <Icons.Phone />, isAdminOnly: true },
  { id: "flows", path: "/fluxos", label: "Modelos de Fluxos", icon: <Icons.Zap />, isAdminOnly: true, isDev: true },
  { id: "alerts", path: "/alertas", label: "Alertas", icon: <Icons.Bell />, isAdminOnly: true },
  { id: "users", path: "/usuarios", label: "Usuários", icon: <Icons.Lock />, isAdminOnly: true },
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentPageId = () => {
    const current = NAV.find(item => item.path === location.pathname);
    if (current) return current.id;
    if (location.pathname === "/configuracoes") return "settings";
    if (location.pathname === "/perfil") return "profile";
    return "home";
  };
  const page = getCurrentPageId();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [session, setSession] = useState(() => api.getStoredSession());
  const [checkingSession, setCheckingSession] = useState(Boolean(api.getStoredSession()?.accessToken));
  const [theme, setTheme] = useState(() => localStorage.getItem("techhub.theme") || "dark");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isAdmin = session?.user?.accessRoleSlug === "admin" || session?.user?.accessRoleSlug === "super-admin";
  const isSuperAdmin = session?.user?.accessRoleSlug === "super-admin";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("techhub.theme", theme);
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const isCommandShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (isCommandShortcut) {
        event.preventDefault();
        setCommandOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const canSeeNotifications = isAdmin;

  useEffect(() => {
    if (!canSeeNotifications) {
      setNotifications([]);
      setShowNotifications(false);
      return undefined;
    }

    let alive = true;
    const fetchAlerts = () => {
      api.getNotifications()
        .then(data => {
          if (!alive) return;
          setNotifications((data || []).filter(item => item.status !== "archived"));
        })
        .catch(err => console.error("Erro ao buscar notificações:", err));
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [canSeeNotifications]);

  useEffect(() => {
    let alive = true;
    if (!api.getStoredSession()?.accessToken) {
      setCheckingSession(false);
      return;
    }

    api.me()
      .then((currentSession) => {
        if (!alive) return;
        if (currentSession?.user?.status === 'inactive' || currentSession?.user?.active === false) {
          api.logout();
          setSession(null);
        } else {
          setSession(currentSession);
        }
      })
      .catch(() => {
        if (alive) setSession(null);
      })
      .finally(() => {
        if (alive) setCheckingSession(false);
      });

    return () => { alive = false; };
  }, []);

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  const navigateTo = (targetPage) => {
    let targetPath = "/";
    const navItem = NAV.find(item => item.id === targetPage);
    if (navItem) targetPath = navItem.path;
    else if (targetPage === "settings") targetPath = "/configuracoes";
    else if (targetPage === "profile") targetPath = "/perfil";
    else if (targetPage === "home") targetPath = "/";

    navigate(targetPath);
    window.dispatchEvent(new CustomEvent("app:reset-page", { detail: targetPage }));
  };

  const handleLogout = async () => {
    await api.logout();
    setSession(null);
    navigateTo("home");
  };

  const handleMarkNotificationRead = async (notificationId) => {
    if (!notificationId) return;
    setNotifications(prev => prev.map(item => item.id === notificationId ? { ...item, status: "read", unread: false } : item));
    try {
      await api.markNotificationRead(notificationId);
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(item => ({ ...item, status: "read", unread: false })));
    try {
      await api.markAllNotificationsRead();
    } catch (error) {
      console.error("Erro ao marcar notificações como lidas:", error);
    }
  };

  // renderPage logic replaced by React Router Routes below

  if (checkingSession) return <LoadingSpinner />;
  if (!session?.accessToken) return <LoginScreen onLogin={setSession} theme={theme} onToggleTheme={toggleTheme} />;

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <aside className="sidebar">
          <div className="sidebar__header">
            <div className="org-switcher" onClick={() => navigateTo("home")}>
              <img src="/v4-logo.png" alt="Logo" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", marginRight: 8 }} />
              <span className="org-name">TechOps</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{theme === "dark" ? "dark" : "light"}</span>
            </div>
          </div>
          <nav className="sidebar__nav" style={{ paddingTop: 8, flex: 1 }}>
            {NAV.filter(item => {
              if (item.isAdminOnly) return isSuperAdmin;
              return true;
            }).map((item, i) => {
              if (item.isSection) return <div key={`sec-${i}`} className="nav-section-label">{item.label}</div>;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`nav-item ${page === item.id ? 'nav-item--active' : ''}`}
                  onClick={() => window.dispatchEvent(new CustomEvent("app:reset-page", { detail: item.id }))}
                  style={{ textDecoration: 'none', display: 'flex' }}
                >
                  <span className="nav-item__icon">{typeof item.icon === 'function' ? item.icon() : item.icon}</span>
                  <span className="nav-item__label">{item.label}</span>
                  <div className="nav-item__side">
                    {item.isDev && <span className="nav-item__dev-icon" title="Em desenvolvimento"><Icons.AlertTriangle /></span>}
                    {item.isAdminOnly && <span className="nav-item__lock-icon" title="Acesso restrito para Administrador"><Icons.Lock /></span>}
                  </div>
                </Link>
              );
            })}
          </nav>
          <div className="sidebar__footer" style={{ padding: "16px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "8px" }}>
            {isSuperAdmin && (
              <Link to="/configuracoes" className={`nav-item ${page === 'settings' ? 'nav-item--active' : ''}`} onClick={() => window.dispatchEvent(new CustomEvent("app:reset-page", { detail: "settings" }))} style={{ width: '100%', textAlign: 'left', margin: 0, textDecoration: 'none', display: 'flex' }}>
                <span className="nav-item__icon"><Icons.Settings /></span>
                <span className="nav-item__label">Administrativa</span>
                <div className="nav-item__side">
                  <span className="nav-item__lock-icon" title="Acesso restrito para Administrador"><Icons.Lock /></span>
                </div>
              </Link>
            )}

            <Link to="/perfil" className={`nav-item ${page === 'profile' ? 'nav-item--active' : ''}`} onClick={() => window.dispatchEvent(new CustomEvent("app:reset-page", { detail: "profile" }))} style={{ width: '100%', textAlign: 'left', margin: 0, textDecoration: 'none', display: 'flex' }}>
              <span className="nav-item__icon"><Icons.Users /></span>
              <span className="nav-item__label">Sua Conta</span>
            </Link>
            <button
              className="nav-item"
              onClick={handleLogout}
              style={{ width: '100%', textAlign: 'left', margin: 0, color: "var(--danger)" }}
            >
              <span className="nav-item__icon" style={{ color: "var(--danger)" }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </span>
              <span className="nav-item__label" style={{ color: "var(--danger)" }}>Sair</span>
            </button>
          </div>
        </aside>
      )}

      <div className="main-area">
        <header className="topbar">
          <div className="topbar__left" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn btn--ghost" style={{ padding: "4px 8px" }} onClick={() => setSidebarOpen(!sidebarOpen)}><Icons.Menu /></button>
            <button type="button" className="command-trigger" onClick={() => setCommandOpen(true)}>
              <Icons.Search />
              <span>Buscar no sistema</span>
              <kbd>Ctrl K</kbd>
            </button>
          </div>
          <div className="topbar__right" style={{ gap: 12, position: "relative" }}>
            {canSeeNotifications && (
              <div style={{ position: "relative" }}>
                <button
                  className="btn btn--ghost"
                  onClick={() => {
                    const next = !showNotifications;
                    setShowNotifications(next);
                    if (next) handleMarkAllNotificationsRead();
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "50%",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                    border: showNotifications ? "1px solid var(--color-primary)" : "1px solid transparent"
                  }}
                  title="Notificações administrativas"
                >
                  <span className="bell-icon-wrapper">
                    <Icons.Bell />
                  </span>
                  {notifications.filter(item => item.status === "unread" || item.unread).length > 0 && (
                    <span style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      backgroundColor: "var(--danger)",
                      color: "white",
                      fontSize: 10,
                      fontWeight: 800,
                      borderRadius: "50%",
                      width: 16,
                      height: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 0 2px var(--bg-card)"
                    }}>
                      {notifications.filter(item => item.status === "unread" || item.unread).length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    <div
                      onClick={() => setShowNotifications(false)}
                      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                    />

                    <div style={{
                      position: "absolute",
                      top: "42px",
                      right: 0,
                      width: "360px",
                      maxHeight: "400px",
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      boxShadow: "var(--sh-lg)",
                      zIndex: 1000,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      animation: "fadeIn 0.2s ease"
                    }}>
                      <div style={{
                        padding: "14px 18px",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "var(--bg-secondary)"
                      }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Notificações</span>
                        {notifications.some(item => item.status === "unread" || item.unread) ? (
                          <button className="btn btn--ghost" style={{ padding: "4px 8px", fontSize: 11 }} onClick={handleMarkAllNotificationsRead}>Marcar lidas</button>
                        ) : (
                          <span className="badge" style={{ fontSize: 11 }}>em dia</span>
                        )}
                      </div>

                      <div style={{ overflowY: "auto", flex: 1 }}>
                        {notifications.length === 0 ? (
                          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                            ✨ Tudo certo! Nenhuma notificação pendente.
                          </div>
                        ) : (
                          notifications.map((n, idx) => (
                            <div
                              key={n.id || idx}
                              style={{
                                padding: "12px 18px",
                                borderBottom: idx === notifications.length - 1 ? "none" : "1px solid var(--border-muted)",
                                display: "flex",
                                gap: 12,
                                alignItems: "flex-start",
                                transition: "background 0.2s"
                              }}
                              onClick={() => handleMarkNotificationRead(n.id)}
                              onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"}
                              onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                              <div style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                backgroundColor: (n.status === "unread" || n.unread) ? "var(--danger)" : "var(--text-muted)",
                                marginTop: 6,
                                flexShrink: 0
                              }} />
                              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {n.title}
                                </span>
                                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                  Origem: <strong style={{ color: "var(--text-primary)" }}>{n.client || n.type || "Sistema"}</strong>
                                </span>
                                <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                  ⏱️ {n.occurred_at || n.createdAt}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <button className="theme-toggle" onClick={toggleTheme}>{theme === "dark" ? "☀️ Claro" : "🌙 Escuro"}</button>
            <div style={{ position: "relative" }}>
              <button
                className="btn btn--ghost"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{ gap: 10, display: "flex", alignItems: "center" }}
              >
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {session.user?.name ? formatShortName(session.user.name) : session.user?.email}
                </span>
                <span className="avatar-initials">
                  {session.user?.avatarUrl ? <img src={session.user.avatarUrl} alt="Avatar" referrerPolicy="no-referrer" /> : getInitials(session.user?.name || session.user?.email)}
                </span>
              </button>

              {userMenuOpen && (
                <>
                  <div
                    onClick={() => setUserMenuOpen(false)}
                    style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                  />
                  <div style={{
                    position: "absolute",
                    top: "42px",
                    right: 0,
                    width: "160px",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    boxShadow: "var(--sh-lg)",
                    zIndex: 1000,
                    display: "flex",
                    flexDirection: "column",
                    padding: "6px",
                    animation: "fadeIn 0.15s ease"
                  }}>
                    <button
                      className="nav-item"
                      onClick={() => { setPage("profile"); setUserMenuOpen(false); }}
                      style={{ margin: 0, width: "100%", justifyContent: "flex-start", gap: 8, fontSize: "13px" }}
                    >
                      <span className="nav-item__icon"><Icons.Users /></span>
                      <span className="nav-item__label">Sua Conta</span>
                    </button>
                    <button
                      className="nav-item"
                      onClick={() => { handleLogout(); setUserMenuOpen(false); }}
                      style={{ margin: 0, width: "100%", justifyContent: "flex-start", gap: 8, color: "var(--danger)", fontSize: "13px" }}
                    >
                      <span className="nav-item__icon" style={{ color: "var(--danger)" }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </span>
                      <span className="nav-item__label" style={{ color: "var(--danger)" }}>Sair</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="main-content">
          <div className="content-wrapper">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<PageHome session={session} setPage={navigateTo} />} />
                <Route path="/dashboard" element={<PageDashboard setPage={navigateTo} isAdmin={isAdmin} />} />
                <Route path="/clientes" element={<PageClients session={session} />} />
                <Route path="/documentos" element={<PageDocuments session={session} />} />
                <Route path="/telefonia" element={isSuperAdmin ? <PageTelephony permissions={session?.permissions || []} /> : <div style={{ color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>Acesso negado.</div>} />
                <Route path="/fluxos" element={isSuperAdmin ? <PageFlowTemplates permissions={session?.permissions || []} /> : <div style={{ color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>Acesso negado.</div>} />
                <Route path="/alertas" element={isSuperAdmin ? <PageAlerts permissions={session?.permissions || []} /> : <div style={{ color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>Acesso negado.</div>} />
                <Route path="/usuarios" element={isSuperAdmin ? <PageUsers /> : <div style={{ color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>Acesso negado.</div>} />
                <Route path="/perfil" element={<PageProfile session={session} onSessionUpdate={setSession} />} />
                <Route path="/configuracoes" element={isSuperAdmin ? <PageSettings session={session} /> : <div style={{ color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>Acesso negado.</div>} />
                <Route path="*" element={<div style={{ color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>Página não encontrada.</div>} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onNavigate={navigateTo}
        isAdmin={isAdmin}
      />
    </div>
  );
}
