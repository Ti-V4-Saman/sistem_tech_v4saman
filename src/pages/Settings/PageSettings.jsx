import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Icons } from "../../icons/Icons";
import { SectionHeader } from "../../components/ui/SectionHeader";

export default function PageSettings({ session }) {
  const [activeType, setActiveType] = useState(null);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingUsersItem, setViewingUsersItem] = useState(null);
  const [formData, setFormData] = useState({ name: "", slug: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleResetPage = (event) => {
      if (event.detail === "settings") {
        setActiveType(null);
        setShowModal(false);
        setEditingItem(null);
        setViewingUsersItem(null);
      }
    };
    window.addEventListener("app:reset-page", handleResetPage);
    return () => window.removeEventListener("app:reset-page", handleResetPage);
  }, []);

  const isAdmin = session?.user?.accessRoleSlug === "admin" || session?.user?.accessRoleSlug === "super-admin";

  const categories = [
    { id: "squads", name: "Squads", desc: "Gerencie squads e equipes da organização", icon: <Icons.Shield /> },
    { id: "cargos", name: "Cargos", desc: "Gerencie os cargos disponíveis para usuários", icon: <Icons.Briefcase /> },
    { id: "senioridades", name: "Senioridades", desc: "Gerencie os níveis de senioridade", icon: <Icons.TrendingUp /> },
    { id: "areas", name: "Áreas", desc: "Gerencie as áreas da organização", icon: <Icons.Grid /> },
    { id: "business-units", name: "Business Units", desc: "Gerencie as unidades de negócio", icon: <Icons.Building /> }
  ];

  const fetchItems = async (type) => { setLoading(true); try { const [data, userData] = await Promise.all([api.getSettings(type), api.getUsers()]); setItems(data || []); setUsers(userData || []); } catch (e) { alert("Erro ao carregar itens."); } finally { setLoading(false); } };

  const getUserCount = (slug) => {
    if (activeType === "squads") return users.filter(u => u.teamSlug === slug).length;
    if (activeType === "cargos") return users.filter(u => u.jobRoleSlug === slug).length;
    if (activeType === "senioridades") return users.filter(u => u.senioritySlug === slug).length;
    if (activeType === "areas") return users.filter(u => u.areaSlug === slug).length;
    if (activeType === "business-units") return users.filter(u => u.businessUnitSlug === slug).length;
    return 0;
  };

  const getUsersForItem = (slug) => {
    if (activeType === "squads") return users.filter(u => u.teamSlug === slug);
    if (activeType === "cargos") return users.filter(u => u.jobRoleSlug === slug);
    if (activeType === "senioridades") return users.filter(u => u.senioritySlug === slug);
    if (activeType === "areas") return users.filter(u => u.areaSlug === slug);
    if (activeType === "business-units") return users.filter(u => u.businessUnitSlug === slug);
    return [];
  };

  const handleSelectCategory = (type) => { setActiveType(type); fetchItems(type); };
  const handleBack = () => { setActiveType(null); setItems([]); };

  const handleOpenModal = (item = null) => {
    if (!isAdmin) return;
    if (item) { setEditingItem(item); setFormData({ name: item.name, slug: item.slug }); }
    else { setEditingItem(null); setFormData({ name: "", slug: "" }); }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name) return alert("O nome é obrigatório");
    setSaving(true);
    try {
      if (editingItem) { const updated = await api.updateSetting(activeType, editingItem.id, formData); setItems(items.map(i => i.id === editingItem.id ? updated : i)); }
      else { const created = await api.createSetting(activeType, formData); setItems([created, ...items]); }
      setShowModal(false);
    } catch (e) { alert(e.message || "Erro ao salvar."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => { if (!isAdmin) return; if (confirm("Tem certeza que deseja excluir este item?")) { try { await api.deleteSetting(activeType, id); setItems(items.filter(i => i.id !== id)); } catch (e) { alert("Erro ao excluir item."); } } };

  if (activeType) {
    const category = categories.find(c => c.id === activeType);
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        <div style={{ marginBottom: 24 }}>
          <div onClick={handleBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 13, cursor: "pointer", marginBottom: 16, padding: "6px 0" }}>
            ← Voltar para configurações
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <SectionHeader
              eyebrow="Administrativa"
              title={category.name}
              description={category.desc}
            />
            {isAdmin && (<button className="btn btn--primary" onClick={() => handleOpenModal()}>+ Novo Item</button>)}
          </div>
        </div>
        {loading ? <LoadingSpinner /> : (
          <div className="table-wrap"><table className="table"><thead><tr><th>Nome</th><th>Slug</th><th>Usuários</th>{isAdmin && <th style={{ textAlign: "right" }}>Ações</th>}</tr></thead><tbody>
            {items.map(item => (<tr key={item.id}>
              <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</td>
              <td style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>{item.slug}</td>
              <td style={{ color: "var(--text-secondary)" }}>{getUserCount(item.slug) > 0 ? (<button type="button" className="btn btn--ghost" style={{ padding: "4px 8px", textDecoration: "underline", color: "var(--color-primary)", fontSize: "13px", height: "auto", minHeight: "0" }} onClick={() => setViewingUsersItem(item)}>{getUserCount(item.slug)} {getUserCount(item.slug) === 1 ? "usuário" : "usuários"}</button>) : (<span style={{ fontSize: "13px", paddingLeft: "8px" }}>0 usuários</span>)}</td>
              {isAdmin && (<td style={{ textAlign: "right" }}><button className="btn btn--ghost" style={{ marginRight: 8, padding: "4px 8px" }} onClick={() => handleOpenModal(item)}>Editar</button><button className="btn btn--ghost" style={{ color: "var(--danger)", padding: "4px 8px" }} onClick={() => handleDelete(item.id)}>Excluir</button></td>)}
            </tr>))}
            {items.length === 0 && (<tr><td colSpan={isAdmin ? 4 : 3} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Nenhum item cadastrado.</td></tr>)}
          </tbody></table></div>
        )}

        {showModal && (
          <div className="doc-overlay" onClick={() => setShowModal(false)}><div className="doc-modal" onClick={e => e.stopPropagation()}>
            <div className="doc-modal__header"><span className="doc-modal__title">{editingItem ? "Editar Item" : "Novo Item"}</span><button className="doc-modal__close" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="doc-modal__body">
              <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
                <div><label className="editor-sidebar__label">Nome *</label><input className="editor-sidebar__input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Atlas" /></div>
                <div><label className="editor-sidebar__label">Slug (opcional)</label><input className="editor-sidebar__input" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} placeholder="Ex: atlas (deixe em branco para auto-gerar)" /></div>
              </div>
              <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12 }}><button className="btn btn--ghost" onClick={() => setShowModal(false)}>Cancelar</button><button className="btn btn--primary" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button></div>
            </div>
          </div></div>
        )}

        {viewingUsersItem && (
          <div className="doc-overlay" onClick={() => setViewingUsersItem(null)}><div className="doc-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="doc-modal__header"><span className="doc-modal__title">Usuários Alocados: {viewingUsersItem.name}</span><button className="doc-modal__close" onClick={() => setViewingUsersItem(null)}>✕</button></div>
            <div className="doc-modal__body">
              <div style={{ maxHeight: 350, overflowY: "auto", marginTop: 16, display: "grid", gap: 10 }}>
                {getUsersForItem(viewingUsersItem.slug).length === 0 ? (<div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: 13 }}>Nenhum usuário alocado a este item.</div>) : (
                  getUsersForItem(viewingUsersItem.slug).map(u => (<div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-primary)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 13 }}>{u.name ? u.name.charAt(0).toUpperCase() : "?"}</div>
                    <div><div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>{u.name}</div><div style={{ color: "var(--text-muted)", fontSize: 12 }}>{u.email}</div></div>
                  </div>))
                )}
              </div>
              <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}><button className="btn btn--ghost" onClick={() => setViewingUsersItem(null)}>Fechar</button></div>
            </div>
          </div></div>
        )}
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <SectionHeader
        eyebrow="Sistema"
        title="Configurações Administrativas"
        description="Gerencie as estruturas organizacionais do sistema."
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginTop: 24 }}>
        {categories.map(cat => (
          <div
            key={cat.id}
            onClick={() => handleSelectCategory(cat.id)}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "20px 24px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 16,
              transition: "all 0.2s",
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--sh-md)"; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "var(--color-primary-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-primary)",
              flexShrink: 0,
            }}>
              {cat.icon}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px 0" }}>{cat.name}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0, lineHeight: 1.4 }}>{cat.desc}</p>
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 16, flexShrink: 0 }}>→</div>
          </div>
        ))}
      </div>
    </div>
  );
}
