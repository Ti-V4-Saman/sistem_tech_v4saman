import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { Icons } from "../../icons/Icons";
import { getInitials, formatDateTime, roleBadgeStyle } from "../../utils/formatters";
import { DEFAULT_METADATA } from "../../utils/constants";

const EMPTY_FORM = {
  name: "", email: "", password: "", accessRoleSlug: "user", jobRoleSlug: "",
  teamSlug: "", senioritySlug: "", areaSlug: "", businessUnitSlug: "", active: true,
};

function userToForm(user) {
  if (!user) return { ...EMPTY_FORM };
  return {
    name: user.name || "",
    email: user.email || "",
    password: "",
    accessRoleSlug: user.accessRoleSlug || "user",
    jobRoleSlug: user.jobRoleSlug || "",
    teamSlug: user.teamSlug || "",
    senioritySlug: user.senioritySlug || "",
    areaSlug: user.areaSlug || "",
    businessUnitSlug: user.businessUnitSlug || "",
    active: user.active !== false,
  };
}

export default function PageUsers() {
  const [users, setUsers] = useState([]);
  const [metadata, setMetadata] = useState(DEFAULT_METADATA);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingUser, setEditingUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lockingId, setLockingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [userData, meta] = await Promise.all([api.getUsers(), api.getUserMetadata()]);
      setUsers(userData || []);
      setMetadata({ ...DEFAULT_METADATA, ...(meta || {}) });
    } catch (error) {
      alert(error.message || "Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  useEffect(() => {
    const storedSearch = localStorage.getItem("techhub.userSearch");
    if (storedSearch) {
      setSearch(storedSearch);
      localStorage.removeItem("techhub.userSearch");
    }
    const handleGlobalSearch = event => {
      setSearch(String(event.detail || ""));
      localStorage.removeItem("techhub.userSearch");
    };
    window.addEventListener("techhub.userSearch", handleGlobalSearch);
    return () => window.removeEventListener("techhub.userSearch", handleGlobalSearch);
  }, []);

  useEffect(() => {
    const handleResetPage = (event) => {
      if (event.detail !== "users") return;
      setDrawerOpen(false);
      setEditingUser(null);
      setSearch("");
      setStatusFilter("all");
      setRoleFilter("all");
    };
    window.addEventListener("app:reset-page", handleResetPage);
    return () => window.removeEventListener("app:reset-page", handleResetPage);
  }, []);

  const summary = useMemo(() => ({
    total: users.length,
    active: users.filter(user => user.active !== false).length,
    blocked: users.filter(user => user.active === false).length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter(user => {
      const matchesSearch = !term || [user.name, user.email, user.teamName, user.jobRoleName]
        .some(value => String(value || "").toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? user.active !== false : user.active === false);
      const matchesRole = roleFilter === "all" || user.accessRoleSlug === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [roleFilter, search, statusFilter, users]);

  const openDrawer = (user = null) => {
    setEditingUser(user);
    setFormData(userToForm(user));
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setEditingUser(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const payload = {
      ...formData,
      email: formData.email.trim().toLowerCase(),
      status: formData.active ? "active" : "inactive",
    };
    if (!payload.password) delete payload.password;
    if (!payload.email.endsWith("@v4company.com")) {
      alert("Somente e-mails @v4company.com são permitidos.");
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const updated = await api.updateUser(editingUser.id, payload);
        setUsers(current => current.map(user => user.id === editingUser.id ? updated : user));
      } else {
        const created = await api.createUser(payload);
        setUsers(current => [...current, created].sort((a, b) => String(a.name).localeCompare(String(b.name))));
      }
      setDrawerOpen(false);
      setEditingUser(null);
    } catch (error) {
      alert(error.message || "Não foi possível salvar o usuário.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAccess = async (user) => {
    const willBlock = user.active !== false;
    const action = willBlock ? "bloquear" : "desbloquear";

    setLockingId(user.id);
    try {
      let updated;
      if (willBlock) {
        await api.deleteUser(user.id);
        updated = { ...user, active: false, status: "inactive" };
      } else {
        updated = await api.updateUser(user.id, {
          name: user.name,
          email: user.email,
          status: "active",
          active: true,
          accessRoleSlug: user.accessRoleSlug,
          jobRoleSlug: user.jobRoleSlug,
          teamSlug: user.teamSlug,
          senioritySlug: user.senioritySlug,
          areaSlug: user.areaSlug,
          businessUnitSlug: user.businessUnitSlug,
        });
      }
      setUsers(current => current.map(item => item.id === user.id ? updated : item));
      setFeedback({ type: "success", text: `Acesso de ${user.name || user.email} ${willBlock ? "bloqueado" : "desbloqueado"}.` });
      window.setTimeout(() => setFeedback(null), 3500);
    } catch (error) {
      setFeedback({ type: "error", text: error.message || `Não foi possível ${action} este usuário.` });
    } finally {
      setLockingId(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setRoleFilter("all");
  };

  return (
    <div className="users-page">
      {feedback && <div className={`user-feedback user-feedback--${feedback.type}`} role="status" aria-live="polite"><span>{feedback.type === "success" ? "✓" : "!"}</span>{feedback.text}<button type="button" onClick={() => setFeedback(null)} aria-label="Fechar aviso">×</button></div>}
      <header className="users-page__header">
        <div>
          <div className="page-header__greeting">Configurações</div>
          <h1 className="page-header__title">Controle de acesso</h1>
          <p className="page-header__subtitle">Gerencie usuários, perfis organizacionais e disponibilidade de acesso.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => openDrawer()}><Icons.Plus /> Novo usuário</button>
      </header>

      <section className="user-metric-grid" aria-label="Resumo de usuários">
        <article className="user-metric-card">
          <span className="user-metric-card__icon"><Icons.Users /></span>
          <div><small>Total de usuários</small><strong>{summary.total}</strong><span>Cadastrados na conta</span></div>
        </article>
        <article className="user-metric-card user-metric-card--success">
          <span className="user-metric-card__icon"><Icons.Shield /></span>
          <div><small>Com acesso ativo</small><strong>{summary.active}</strong><span>Podem acessar o sistema</span></div>
        </article>
        <article className="user-metric-card user-metric-card--danger">
          <span className="user-metric-card__icon"><Icons.Lock /></span>
          <div><small>Usuários bloqueados</small><strong>{summary.blocked}</strong><span>Sem acesso no momento</span></div>
        </article>
      </section>

      <section className="users-panel">
        <div className="users-panel__heading">
          <div><h2>Usuários e permissões</h2><p>Edite dados e controle quem pode acessar a plataforma.</p></div>
          <span>{filteredUsers.length} de {users.length}</span>
        </div>

        <div className="users-toolbar">
          <label className="users-search">
            <Icons.Search />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome, e-mail, cargo ou squad" />
            <kbd>Ctrl K</kbd>
          </label>
          <div className="users-toolbar__filters">
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filtrar por status">
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="blocked">Bloqueados</option>
            </select>
            <select value={roleFilter} onChange={event => setRoleFilter(event.target.value)} aria-label="Filtrar por perfil">
              <option value="all">Todos os perfis</option>
              {(metadata.accessRoles || []).map(role => <option key={role.slug} value={role.slug}>{role.name}</option>)}
            </select>
            <button type="button" className="btn btn--outline" onClick={clearFilters}>Limpar</button>
          </div>
        </div>

        <div className="users-table-wrap">
          <table className="users-table">
            <thead><tr><th>Usuário</th><th>Cargo e squad</th><th>E-mail</th><th>Cadastrado em</th><th>Status</th><th aria-label="Ações">Ações</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6"><div className="users-table__empty">Carregando usuários...</div></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="6"><div className="users-table__empty"><Icons.Search /><strong>Nenhum usuário encontrado</strong><span>Revise os filtros utilizados.</span></div></td></tr>
              ) : filteredUsers.map(user => (
                <tr key={user.id}>
                  <td><div className="user-cell"><span className="user-cell__avatar">{getInitials(user.name || user.email)}</span><div><strong>{user.name || "Sem nome"}</strong>{["admin", "super-admin"].includes(user.accessRoleSlug) && <span className="user-cell__role" style={roleBadgeStyle(user.accessRoleSlug)}>{user.accessRoleName || "Administrador"}</span>}</div></div></td>
                  <td><div className="user-org-cell"><strong>{user.jobRoleName || "Sem cargo"}</strong><span>{user.teamName || "Sem squad"}</span></div></td>
                  <td className="users-table__muted">{user.email}</td>
                  <td className="users-table__muted">{formatDateTime(user.createdAt)}</td>
                  <td><span className={`user-access-status ${user.active !== false ? "user-access-status--active" : "user-access-status--blocked"}`}><i />{user.active !== false ? "Ativo" : "Bloqueado"}</span></td>
                  <td><div className="user-row-actions">
                    <button type="button" className="row-icon-button" onClick={() => openDrawer(user)} title="Editar usuário" aria-label={`Editar ${user.name}`}><Icons.Edit /></button>
                    <button type="button" className={`row-icon-button ${user.active === false ? "row-icon-button--unlock" : ""}`} onClick={() => toggleAccess(user)} disabled={lockingId === user.id} title={user.active !== false ? "Bloquear acesso" : "Desbloquear acesso"} aria-label={`${user.active !== false ? "Bloquear" : "Desbloquear"} ${user.name}`}>{user.active !== false ? <Icons.Lock /> : <Icons.Unlock />}</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {drawerOpen && (
        <div className="user-drawer-overlay" onMouseDown={closeDrawer}>
          <aside className="user-drawer" onMouseDown={event => event.stopPropagation()} aria-label={editingUser ? "Editar acesso" : "Novo usuário"}>
            <div className="user-drawer__header">
              <div><span>{editingUser ? "Editar acesso" : "Cadastrar acesso"}</span><h2>{editingUser?.name || "Novo usuário"}</h2><p>{editingUser ? "Revise os dados e ajuste o acesso deste usuário." : "Preencha os dados para criar um novo acesso."}</p></div>
              <button type="button" className="doc-modal__close" onClick={closeDrawer} aria-label="Fechar painel">✕</button>
            </div>

            <form id="userAccessForm" className="user-drawer__body" onSubmit={handleSave}>
              <section className="user-form-section">
                <div className="user-form-section__number">1</div><div className="user-form-section__heading"><h3>Informações do usuário</h3><p>Dados usados para identificação e acesso.</p></div>
                <div className="user-form-section__content g2">
                  <div><label className="editor-sidebar__label">Nome completo *</label><input required className="editor-sidebar__input" value={formData.name} onChange={event => setFormData(current => ({ ...current, name: event.target.value }))} /></div>
                  <div><label className="editor-sidebar__label">E-mail corporativo *</label><input required type="email" className="editor-sidebar__input" value={formData.email} onChange={event => setFormData(current => ({ ...current, email: event.target.value }))} /></div>
                  <div><label className="editor-sidebar__label">Cargo</label><select className="editor-sidebar__select" value={formData.jobRoleSlug} onChange={event => setFormData(current => ({ ...current, jobRoleSlug: event.target.value }))}><option value="">Selecione...</option>{(metadata.jobRoles || []).map(role => <option key={role.slug} value={role.slug}>{role.name}</option>)}</select></div>
                  <div><label className="editor-sidebar__label">Perfil de acesso</label><select className="editor-sidebar__select" value={formData.accessRoleSlug} onChange={event => setFormData(current => ({ ...current, accessRoleSlug: event.target.value }))}>{(metadata.accessRoles || []).map(role => <option key={role.slug} value={role.slug}>{role.name}</option>)}</select></div>
                </div>
              </section>

              <section className="user-form-section">
                <div className="user-form-section__number">2</div><div className="user-form-section__heading"><h3>Alocação organizacional</h3><p>Defina a equipe e o contexto de atuação.</p></div>
                <div className="user-form-section__content g2">
                  <div><label className="editor-sidebar__label">Squad principal</label><select className="editor-sidebar__select" value={formData.teamSlug} onChange={event => setFormData(current => ({ ...current, teamSlug: event.target.value }))}><option value="">Sem squad</option>{(metadata.teams || []).map(team => <option key={team.slug} value={team.slug}>{team.name}</option>)}</select></div>
                  <div><label className="editor-sidebar__label">Senioridade</label><select className="editor-sidebar__select" value={formData.senioritySlug} onChange={event => setFormData(current => ({ ...current, senioritySlug: event.target.value }))}><option value="">Não definida</option>{(metadata.seniorities || []).map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></div>
                  <div><label className="editor-sidebar__label">Área</label><select className="editor-sidebar__select" value={formData.areaSlug} onChange={event => setFormData(current => ({ ...current, areaSlug: event.target.value }))}><option value="">Não definida</option>{(metadata.areas || []).map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></div>
                  <div><label className="editor-sidebar__label">Business Unit</label><select className="editor-sidebar__select" value={formData.businessUnitSlug} onChange={event => setFormData(current => ({ ...current, businessUnitSlug: event.target.value }))}><option value="">Não definida</option>{(metadata.businessUnits || []).map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></div>
                </div>
              </section>

              <section className="user-form-section">
                <div className="user-form-section__number">3</div><div className="user-form-section__heading"><h3>Acesso ao sistema</h3><p>O cadeado da tabela permite bloquear ou reativar este acesso.</p></div>
                <div className="user-form-section__content">
                  <label className="access-switch"><span><strong>Acesso ativo</strong><small>O usuário poderá entrar e usar as permissões do seu perfil.</small></span><input type="checkbox" checked={formData.active} onChange={event => setFormData(current => ({ ...current, active: event.target.checked }))} /><i /></label>
                  <div className="user-permission-preview"><span>Permissões atribuídas pelo perfil</span><div>{editingUser?.permissions?.length ? editingUser.permissions.slice(0, 12).map(permission => <em key={permission}>{permission}</em>) : <small>As permissões serão carregadas automaticamente conforme o perfil selecionado.</small>}</div></div>
                  <div className="user-fallback-field"><label className="editor-sidebar__label">Senha de fallback</label><input type="password" className="editor-sidebar__input" value={formData.password} onChange={event => setFormData(current => ({ ...current, password: event.target.value }))} placeholder={editingUser ? "Deixe em branco para manter" : "Opcional — acesso principal via Google"} /></div>
                </div>
              </section>
            </form>

            <div className="user-drawer__footer"><button type="button" className="btn btn--outline" onClick={closeDrawer} disabled={saving}>Cancelar</button><button type="submit" form="userAccessForm" className="btn btn--primary" disabled={saving}><Icons.CheckCircle /> {saving ? "Salvando..." : "Salvar alterações"}</button></div>
          </aside>
        </div>
      )}
    </div>
  );
}
