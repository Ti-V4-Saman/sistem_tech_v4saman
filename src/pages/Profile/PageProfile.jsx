import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { getInitials, roleBadgeStyle } from "../../utils/formatters";
import { DEFAULT_METADATA } from "../../utils/constants";

export default function PageProfile({ session, onSessionUpdate }) {
  const [metadata, setMetadata] = useState(DEFAULT_METADATA);
  const [formData, setFormData] = useState({ name: session.user?.name || "", jobRoleSlug: session.user?.jobRoleSlug || "account", teamSlug: session.user?.teamSlug || "seals", bio: session.user?.bio || "", phone: session.user?.phone || "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.getUserMetadata().then(meta => setMetadata({ ...DEFAULT_METADATA, ...(meta || {}) })); }, []);

  const handleSave = async (event) => {
    event.preventDefault(); setSaving(true); setSaved(false);
    try { const nextSession = await api.updateMyProfile(formData); onSessionUpdate(nextSession); setSaved(true); }
    catch (err) { alert(err.message || "Não foi possível salvar o perfil."); }
    finally { setSaving(false); }
  };

  const user = session.user || {};

  return (
    <div>
      <div className="page-header">
        <div className="page-header__greeting">Minha Conta</div>
        <div className="page-header__title">Perfil</div>
        <div className="page-header__subtitle">Gerencie seus dados de cargo, time e identificação interna.</div>
      </div>
      <div className="g12">
        <div className="card" style={{ textAlign: "center" }}>
          <div className="profile-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" referrerPolicy="no-referrer" /> : getInitials(user.name || user.email)}</div>
          <h3 style={{ marginTop: 16 }}>{user.name}</h3>
          <p style={{ marginTop: 4 }}>{user.email}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
            <span className="badge badge--default" style={roleBadgeStyle(user.accessRoleSlug)}>{user.accessRoleName || "User"}</span>
            <span className="badge badge--warning">{user.jobRoleName || "Cargo não definido"}</span>
            <span className="badge badge--default">{user.teamName || "Time não definido"}</span>
          </div>
        </div>
        <form className="card" onSubmit={handleSave}>
          <div className="card-header"><span className="card-title">Dados do Perfil</span></div>
          <div className="g2" style={{ marginBottom: 16 }}>
            <div><label className="editor-sidebar__label">Nome</label><input className="editor-sidebar__input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
            <div><label className="editor-sidebar__label">E-mail</label><input className="editor-sidebar__input" value={user.email || ""} disabled /></div>
          </div>
          <div className="g2" style={{ marginBottom: 16 }}>
            <div><label className="editor-sidebar__label">Cargo</label><select className="editor-sidebar__select" value={formData.jobRoleSlug} onChange={e => setFormData({ ...formData, jobRoleSlug: e.target.value })}>{metadata.jobRoles.map(role => <option key={role.slug} value={role.slug}>{role.name}</option>)}</select></div>
            <div><label className="editor-sidebar__label">Time</label><select className="editor-sidebar__select" value={formData.teamSlug} onChange={e => setFormData({ ...formData, teamSlug: e.target.value })}>{metadata.teams.map(team => <option key={team.slug} value={team.slug}>{team.name}</option>)}</select></div>
          </div>
          <div style={{ marginBottom: 16 }}><label className="editor-sidebar__label">Telefone</label><input className="editor-sidebar__input" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="Opcional" /></div>
          <div style={{ marginBottom: 20 }}><label className="editor-sidebar__label">Bio</label><textarea className="editor-sidebar__input" style={{ minHeight: 90, resize: "vertical" }} value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} placeholder="Uma breve descrição interna..." /></div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {saved ? <span style={{ color: "var(--success-text)", fontSize: 13 }}>Perfil salvo.</span> : <span />}
            <button className="btn btn--primary" disabled={saving}>{saving ? "Salvando..." : "Salvar Perfil"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
