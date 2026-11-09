import { lazy, Suspense, useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Link } from "react-router-dom";
import { api } from "./services/api";
import { Icons } from "./icons/Icons";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { getInitials, formatShortName } from "./utils/formatters";

// Pages
const PageHome = lazy(() => import("./pages/Home/PageHome"));
const PageDashboard = lazy(() => import("./pages/Dashboard/PageDashboard"));
const PageBriuDashboard = lazy(() => import("./pages/Dashboards/PageBriuDashboard"));
const PageClients = lazy(() => import("./pages/Clients/PageClients"));
const PageDocuments = lazy(() => import("./pages/Documents/PageDocuments"));
const PageUsers = lazy(() => import("./pages/Users/PageUsers"));
const PageProfile = lazy(() => import("./pages/Profile/PageProfile"));
const PageSettings = lazy(() => import("./pages/Settings/PageSettings"));
const PageHelp = lazy(() => import("./pages/Help/PageHelp"));
const PageTelephony = lazy(() => import("./pages/Telephony/PageTelephony"));
const PageFlowTemplates = lazy(() => import("./pages/FlowTemplates/PageFlowTemplates"));
const PageAlerts = lazy(() => import("./pages/Alerts/PageAlerts"));
const PageAboutUs = lazy(() => import("./pages/AboutUs/PageAboutUs"));
const PageControlArea = lazy(() => import("./pages/ControlArea/PageControlArea"));
import LoginScreen from "./pages/Login/LoginScreen";
import { CommandPalette } from "./components/app/CommandPalette";
import { BrandMark } from "./components/app/BrandMark";

const NAV = [
  { id: "home", path: "/", label: "Início", section: "Visão geral", icon: <Icons.Dashboard /> },
  { id: "dashboard", path: "/dashboard", label: "Operação", section: "Visão geral", icon: <Icons.ChartBar /> },
  { id: "briu", path: "/dashboard-briu", label: "Dashboard BRIU", section: "Operação", icon: <Icons.ChartBar />, isAdminOnly: true },
  { id: "clients", path: "/clientes", label: "Clientes", section: "Workspace", icon: <Icons.Users /> },
  { id: "docs", path: "/documentos", label: "Documentos", section: "Workspace", icon: <Icons.Doc /> },
  { id: "telephony", path: "/telefonia", label: "Telefonia", section: "Operação", icon: <Icons.Phone />, isAdminOnly: true },
  { id: "flows", path: "/fluxos", label: "Modelos de Fluxos", section: "Operação", icon: <Icons.Zap />, requiresAdmin: true },
  { id: "alerts", path: "/alertas", label: "Alertas", section: "Operação", icon: <Icons.Bell />, isAdminOnly: true },
  { id: "users", path: "/usuarios", label: "Usuários", section: "Administração", icon: <Icons.Users />, isAdminOnly: true },
  { id: "control", path: "/controle", label: "Área de Controle", section: "Administração", icon: <Icons.Lock />, isAdminOnly: true },
  { id: "about", path: "/sobre-nos", label: "Sobre Nós", section: "Suporte", icon: <Icons.Sparkles /> },
  { id: "help", path: "/ajuda", label: "Ajuda & Suporte", section: "Suporte", icon: <Icons.HelpCircle /> },
];

const NAV_SECTIONS = ["Visão geral", "Workspace", "Operação", "Administração", "Suporte"];
const SECONDARY_PAGES = {
  settings: { label: "Configurações", section: "Administração" },
  profile: { label: "Minha conta", section: "Preferências" },
};

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

  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia("(min-width: 961px)").matches);
  const [session, setSession] = useState(() => api.getStoredSession());
  const [checkingSession, setCheckingSession] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("techhub.theme") || "dark");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isAdmin = session?.user?.accessRoleSlug === "admin" || session?.user?.accessRoleSlug === "super-admin";
  const isSuperAdmin = session?.user?.accessRoleSlug === "super-admin";
  const hasPermission = (permission) => (session?.permissions || []).includes("*") || (session?.permissions || []).includes(permission);
  const currentNavItem = NAV.find(item => item.id === page) || SECONDARY_PAGES[page] || NAV[0];
  const unreadCount = notifications.filter(item => item.status === "unread" || item.unread).length;
  const visibleNav = NAV.filter(item => (
    (!item.isAdminOnly || isSuperAdmin)
    && (!item.requiresAdmin || isAdmin)
    && (!item.requiredPermission || hasPermission(item.requiredPermission))
  ));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("techhub.theme", theme);
  }, [theme]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 961px)");
    const syncSidebar = (event) => setSidebarOpen(event.matches);
    setSidebarOpen(desktopQuery.matches);
    desktopQuery.addEventListener("change", syncSidebar);
    return () => desktopQuery.removeEventListener("change", syncSidebar);
  }, []);

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
    if (window.matchMedia("(max-width: 960px)").matches) setSidebarOpen(false);
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
    <div className={`app-shell ${sidebarOpen ? "app-shell--sidebar-open" : "app-shell--sidebar-closed"}`}>
      {sidebarOpen && <button type="button" className="sidebar-scrim" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)} />}
      {sidebarOpen && (
        <aside className="sidebar" aria-label="Navegação principal">
          <div className="sidebar__header">
            <button type="button" className="org-switcher" onClick={() => navigateTo("home")} aria-label="Ir para o início">
              <BrandMark compact />
              <span className="org-identity"><strong>TechOps</strong><small>V4 Company</small></span>
            </button>
            <button type="button" className="sidebar__close" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu">×</button>
          </div>
          <nav className="sidebar__nav">
            {NAV_SECTIONS.map(section => {
              const sectionItems = visibleNav.filter(item => item.section === section);
              if (sectionItems.length === 0) return null;
              return (
                <div className="nav-section" key={section}>
                  <div className="nav-section-label">{section}</div>
                  {sectionItems.map(item => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`nav-item ${page === item.id ? 'nav-item--active' : ''}`}
                  aria-current={page === item.id ? "page" : undefined}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("app:reset-page", { detail: item.id }));
                    if (window.matchMedia("(max-width: 960px)").matches) setSidebarOpen(false);
                  }}
                >
                  <span className="nav-item__icon">{typeof item.icon === 'function' ? item.icon() : item.icon}</span>
                  <span className="nav-item__label">{item.label}</span>
                  <div className="nav-item__side">
                    {(item.isAdminOnly || item.requiresAdmin) && <span className="nav-item__lock-icon" title="Acesso restrito para Administrador"><Icons.Lock /></span>}
                  </div>
                </Link>
                  ))}
                </div>
              );
            })}
          </nav>
          <div className="sidebar__footer">
            {isSuperAdmin && (
              <Link to="/configuracoes" className={`nav-item ${page === 'settings' ? 'nav-item--active' : ''}`} onClick={() => window.dispatchEvent(new CustomEvent("app:reset-page", { detail: "settings" }))}>
                <span className="nav-item__icon"><Icons.Settings /></span>
                <span className="nav-item__label">Administrativa</span>
                <div className="nav-item__side">
                  <span className="nav-item__lock-icon" title="Acesso restrito para Administrador"><Icons.Lock /></span>
                </div>
              </Link>
            )}

            <Link to="/perfil" className={`nav-item ${page === 'profile' ? 'nav-item--active' : ''}`} onClick={() => window.dispatchEvent(new CustomEvent("app:reset-page", { detail: "profile" }))}>
              <span className="nav-item__icon"><Icons.Users /></span>
              <span className="nav-item__label">Sua Conta</span>
            </Link>
            <button
              className="nav-item"
              onClick={handleLogout}
              style={{ color: "var(--danger)" }}
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
          <div className="topbar__left">
            <button className="icon-button sidebar-toggle" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu" aria-expanded={sidebarOpen}><Icons.Menu /></button>
            <div className="topbar__context">
              <span>{currentNavItem.section}</span>
              <strong>{currentNavItem.label}</strong>
            </div>
            <button type="button" className="command-trigger" onClick={() => setCommandOpen(true)}>
              <Icons.Search />
              <span>Buscar em todo o sistema...</span>
              <kbd>Ctrl K</kbd>
            </button>
          </div>
          <div className="topbar__right">
            {canSeeNotifications && (
              <div className="topbar-popover-anchor">
                <button
                  className={`icon-button ${showNotifications ? "icon-button--active" : ""}`}
                  onClick={() => {
                    const next = !showNotifications;
                    setShowNotifications(next);
                    if (next) handleMarkAllNotificationsRead();
                  }}
                  title="Notificações administrativas"
                  aria-label={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ""}`}
                  aria-expanded={showNotifications}
                >
                  <span className="bell-icon-wrapper">
                    <Icons.Bell />
                  </span>
                  {unreadCount > 0 && (
                    <span className="icon-button__badge">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    <button className="popover-scrim" aria-label="Fechar notificações" onClick={() => setShowNotifications(false)} />

                    <div className="notification-popover" role="dialog" aria-label="Notificações">
                      <div className="notification-popover__header">
                        <div><strong>Notificações</strong><span>{notifications.length} registros recentes</span></div>
                        {notifications.some(item => item.status === "unread" || item.unread) ? (
                          <button className="btn btn--ghost btn--sm" onClick={handleMarkAllNotificationsRead}>Marcar lidas</button>
                        ) : (
                          <span className="badge badge--success">Em dia</span>
                        )}
                      </div>

                      <div className="notification-popover__list">
                        {notifications.length === 0 ? (
                          <div className="notification-popover__empty">
                            <Icons.CheckCircle />
                            <strong>Tudo certo por aqui</strong>
                            <span>Nenhuma notificação pendente.</span>
                          </div>
                        ) : (
                          notifications.map((n, idx) => (
                            <button
                              type="button"
                              key={n.id || idx}
                              className={`notification-item ${(n.status === "unread" || n.unread) ? "notification-item--unread" : ""}`}
                              onClick={() => handleMarkNotificationRead(n.id)}
                            >
                              <span className="notification-item__dot" />
                              <div className="notification-item__body">
                                <strong>{n.title}</strong>
                                <span>{n.client || n.type || "Sistema"}</span>
                                <small>{n.occurred_at || n.createdAt}</small>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <button className="theme-toggle" onClick={toggleTheme} title={`Ativar tema ${theme === "dark" ? "claro" : "escuro"}`} aria-label={`Ativar tema ${theme === "dark" ? "claro" : "escuro"}`}>{theme === "dark" ? <Icons.Sun /> : <Icons.Moon />}</button>
            <div className="topbar-popover-anchor">
              <button
                className={`user-menu-trigger ${userMenuOpen ? "user-menu-trigger--active" : ""}`}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-label="Abrir menu da conta"
                aria-expanded={userMenuOpen}
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
                    <button className="popover-scrim" aria-label="Fechar menu da conta" onClick={() => setUserMenuOpen(false)} />
                  <div className="user-menu-popover">
                    <div className="user-menu-popover__identity"><strong>{session.user?.name}</strong><span>{session.user?.email}</span></div>
                    <button
                      className="nav-item"
                      onClick={() => { navigateTo("profile"); setUserMenuOpen(false); }}
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
            <ErrorBoundary>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/" element={<PageHome session={session} setPage={navigateTo} />} />
                  <Route path="/dashboard" element={<PageDashboard setPage={navigateTo} isAdmin={isAdmin} />} />
                  <Route path="/dashboard-briu" element={isSuperAdmin || isAdmin ? <PageBriuDashboard /> : <div style={{ color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>Acesso negado.</div>} />
                  <Route path="/clientes" element={<PageClients session={session} />} />
                  <Route path="/documentos" element={<PageDocuments session={session} />} />
                  <Route path="/sobre-nos" element={<PageAboutUs session={session} setPage={navigateTo} />} />
                  <Route path="/ajuda" element={<PageHelp setPage={navigateTo} session={session} />} />
                  <Route path="/telefonia" element={isSuperAdmin ? <PageTelephony permissions={session?.permissions || []} /> : <div style={{ color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>Acesso negado.</div>} />
                  <Route path="/fluxos" element={isAdmin ? <PageFlowTemplates permissions={session?.permissions || []} session={session} setPage={navigateTo} /> : <div style={{ color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>Acesso negado.</div>} />
                  <Route path="/alertas" element={isSuperAdmin ? <PageAlerts permissions={session?.permissions || []} /> : <div style={{ color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>Acesso negado.</div>} />
                  <Route path="/usuarios" element={isSuperAdmin ? <PageUsers /> : <div style={{ color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>Acesso negado.</div>} />
                  <Route path="/perfil" element={<PageProfile session={session} onSessionUpdate={setSession} />} />
                  <Route path="/configuracoes" element={isSuperAdmin ? <PageSettings session={session} /> : <div style={{ color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>Acesso negado.</div>} />
                  <Route path="/controle" element={isSuperAdmin ? <PageControlArea /> : <div style={{ color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>Acesso negado.</div>} />
                  <Route path="*" element={<div style={{ color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>Página não encontrada.</div>} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
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
