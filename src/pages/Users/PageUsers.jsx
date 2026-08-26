import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { getInitials, formatDateTime, roleBadgeStyle } from "../../utils/formatters";
import { AVAILABLE_MODULES, DEFAULT_METADATA } from "../../utils/constants";

export default function PageUsers() {
  const [users, setUsers] = useState([]);
  const [metadata, setMetadata] = useState(DEFAULT_METADATA);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { name: "", email: "", password: "", accessRoleSlug: "user", jobRoleSlug: "", teamSlug: "", senioritySlug: "", areaSlug: "", businessUnitSlug: "", active: true };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    let alive = true;
    Promise.all([api.getUsers(), api.getUserMetadata()])
      .then(([userData, meta]) => { if (!alive) return; setUsers(userData); setMetadata({ ...DEFAULT_METADATA, ...(meta || {}) }); })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const handleResetPage = (event) => {
      if (event.detail === "users") {
        setShowModal(false);
        setEditingUser(null);
        setExpandedId(null);
      }
    };
    window.addEventListener("app:reset-page", handleResetPage);
    return () => window.removeEventListener("app:reset-page", handleResetPage);
  }, []);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({ name: user.name || "", email: user.email || "", password: "", accessRoleSlug: user.accessRoleSlug || "user", jobRoleSlug: user.jobRoleSlug || "", teamSlug: user.teamSlug || "", senioritySlug: user.senioritySlug || "", areaSlug: user.areaSlug || "", businessUnitSlug: user.businessUnitSlug || "", active: user.active !== false });
    } else { setEditingUser(null); setFormData(emptyForm); }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = { ...formData, email: formData.email.trim().toLowerCase(), status: formData.active ? "active" : "inactive" };
    if (!payload.password) delete payload.password;
    if (!payload.email.endsWith("@v4company.com")) { alert("Somente e-mails @v4company.com são permitidos."); return; }
    setSaving(true);
    try {
      if (editingUser) { const updated = await api.updateUser(editingUser.id, payload); setUsers(users.map(u => u.id === editingUser.id ? updated : u)); }
      else { const created = await api.createUser(payload); setUsers(prev => [...prev, created]); }
      setShowModal(false);
    } catch (err) { alert(err.message || "Erro ao salvar usuário."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (confirm("Deseja desativar este usuário? O registro será mantido para auditoria.")) {
      await api.deleteUser(id);
      setUsers(users.map(u => u.id === id ? { ...u, active: false, status: "inactive" } : u));
      if (expandedId === id) setExpandedId(null);
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div className="page-header__greeting">Gestão de Acessos</div>
          <div className="page-header__title">Usuários</div>
          <div className="page-header__subtitle">{loading ? "Carregando..." : `${users.length} usuários cadastrados`} · domínio permitido: @v4company.com</div>
        </div>
        <button className="btn btn--primary" onClick={() => handleOpenModal()}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Novo Usuário
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Carregando usuários...</div>
        ) : (
          <div className="user-list">
            {users.map(user => (
              <div key={user.id} className={`user-row-wrapper ${expandedId === user.id ? "expanded" : ""}`}>
                <div className="user-row user-row--people" onClick={() => setExpandedId(expandedId === user.id ? null : user.id)}>
                  <div className="user-row__avatar">{getInitials(user.name || user.email)}</div>
                  <div className="user-row__info"><div className="user-row__name">{user.name}</div><div className="user-row__email">{user.email}</div></div>
                  <div className="user-row__role"><span className="badge badge--default" style={roleBadgeStyle(user.accessRoleSlug)}>{user.accessRoleName || user.role || "User"}</span></div>
                  <div className="user-row__role"><span className="badge badge--warning">{user.jobRoleName || "Sem cargo"}</span></div>
                  <div className="user-row__role"><span className="badge badge--default">{user.teamName || "Sem time"}</span></div>
                  <div className="user-row__status"><span className={`badge ${user.active ? "badge--success" : "badge--danger"}`}>{user.active ? "Ativo" : "Inativo"}</span></div>
                  <div className="user-row__chevron">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: expandedId === user.id ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                {expandedId === user.id && (
                  <div className="user-row__details">
                    <div className="user-details-grid">
                      <div><strong>Último login:</strong> {formatDateTime(user.lastLogin)}</div>
                      <div><strong>Criado em:</strong> {formatDateTime(user.createdAt)}</div>
                      <div><strong>Cargo:</strong> {user.jobRoleName || "Sem cargo definido"}</div>
                      <div><strong>Time / Squad:</strong> {user.teamName || "Sem time definido"}</div>
                      <div><strong>Senioridade:</strong> {user.seniorityName || "Sem senioridade"}</div>
                      <div><strong>Área:</strong> {user.areaName || "Sem área"}</div>
                      <div><strong>Business Unit:</strong> {user.businessUnitName || "Sem BU"}</div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <strong>Permissões:</strong>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                          {(user.permissions || []).slice(0, 12).map(p => <span key={p} className="tag-chip tag-chip--sm" style={{ background: "var(--v4-100)", color: "var(--v4-600)" }}>{p}</span>)}
                          {(!user.permissions || user.permissions.length === 0) && <span style={{ color: "var(--text-muted)", fontSize: 12 }}>As permissões vêm do nível de acesso.</span>}
                        </div>
                      </div>
                    </div>
                    <div className="user-details-actions">
                      <button className="btn btn--ghost" onClick={() => handleOpenModal(user)}>Editar</button>
                      <button className="btn btn--ghost" style={{ color: "var(--danger)" }} onClick={() => handleDelete(user.id)}>Desativar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {users.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Nenhum usuário encontrado.</div>}
          </div>
        )}
      </div>

      {showModal && (
        <div className="doc-overlay" onClick={() => setShowModal(false)}>
          <div className="doc-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="doc-modal__header">
              <span className="doc-modal__title">{editingUser ? "Editar Usuário" : "Novo Usuário"}</span>
              <button className="doc-modal__close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="doc-modal__body" onSubmit={handleSave}>
              <div className="g2" style={{ marginBottom: 16 }}>
                <div><label className="editor-sidebar__label">Nome Completo</label><input required className="editor-sidebar__input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: João Silva" /></div>
                <div><label className="editor-sidebar__label">E-mail V4 Company</label><input required type="email" className="editor-sidebar__input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="joao@v4company.com" /></div>
              </div>
              <div className="g2" style={{ marginBottom: 16 }}>
                <div><label className="editor-sidebar__label">Nível de Acesso</label><select className="editor-sidebar__select" value={formData.accessRoleSlug} onChange={e => setFormData({ ...formData, accessRoleSlug: e.target.value })}>{metadata.accessRoles.map(role => <option key={role.slug} value={role.slug}>{role.name}</option>)}</select></div>
                <div><label className="editor-sidebar__label">Status</label><select className="editor-sidebar__select" value={formData.active ? "true" : "false"} onChange={e => setFormData({ ...formData, active: e.target.value === "true" })}><option value="true">Ativo</option><option value="false">Inativo</option></select></div>
              </div>
              <div className="g2" style={{ marginBottom: 16 }}>
                <div><label className="editor-sidebar__label">Cargo</label><select className="editor-sidebar__select" value={formData.jobRoleSlug} onChange={e => setFormData({ ...formData, jobRoleSlug: e.target.value })}><option value="">Selecione...</option>{metadata.jobRoles.map(role => <option key={role.slug} value={role.slug}>{role.name}</option>)}</select></div>
                <div><label className="editor-sidebar__label">Time / Squad</label><select className="editor-sidebar__select" value={formData.teamSlug} onChange={e => setFormData({ ...formData, teamSlug: e.target.value })}><option value="">Selecione...</option>{metadata.teams.map(team => <option key={team.slug} value={team.slug}>{team.name}</option>)}</select></div>
              </div>
              <div className="g2" style={{ marginBottom: 16 }}>
                <div><label className="editor-sidebar__label">Senioridade</label><select className="editor-sidebar__select" value={formData.senioritySlug} onChange={e => setFormData({ ...formData, senioritySlug: e.target.value })}><option value="">Selecione...</option>{(metadata.seniorities || []).map(sen => <option key={sen.slug} value={sen.slug}>{sen.name}</option>)}</select></div>
                <div><label className="editor-sidebar__label">Área</label><select className="editor-sidebar__select" value={formData.areaSlug} onChange={e => setFormData({ ...formData, areaSlug: e.target.value })}><option value="">Selecione...</option>{(metadata.areas || []).map(area => <option key={area.slug} value={area.slug}>{area.name}</option>)}</select></div>
              </div>
              <div className="g2" style={{ marginBottom: 16 }}>
                <div><label className="editor-sidebar__label">Business Unit</label><select className="editor-sidebar__select" value={formData.businessUnitSlug} onChange={e => setFormData({ ...formData, businessUnitSlug: e.target.value })}><option value="">Selecione...</option>{(metadata.businessUnits || []).map(bu => <option key={bu.slug} value={bu.slug}>{bu.name}</option>)}</select></div>
                <div></div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label className="editor-sidebar__label">Senha de fallback</label>
                <input type="password" className="editor-sidebar__input" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={editingUser ? "Deixe em branco para manter" : "Opcional: acesso principal é Google"} />
                <p style={{ fontSize: 12, marginTop: 6 }}>O acesso principal é pelo Google. A senha fica apenas como fallback técnico/local.</p>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 28 }}>
                <button type="button" className="btn btn--ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? "Salvando..." : "Salvar Usuário"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
