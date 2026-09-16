import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { Icons } from "../../icons/Icons";

const TAB_TOOLS = "tools";
const TAB_FINANCIAL = "financial";
const TAB_ACCESS = "access";

export default function PageControlArea() {
  const [activeTab, setActiveTab] = useState(TAB_TOOLS);
  const [data, setData] = useState({ [TAB_TOOLS]: [], [TAB_FINANCIAL]: [], [TAB_ACCESS]: [] });
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        if (activeTab === TAB_TOOLS) {
          const res = await api.getControlTools();
          setData(prev => ({ ...prev, [TAB_TOOLS]: res }));
        } else if (activeTab === TAB_FINANCIAL) {
          const res = await api.getControlFinancial();
          setData(prev => ({ ...prev, [TAB_FINANCIAL]: res }));
        } else if (activeTab === TAB_ACCESS) {
          const res = await api.getControlAccess();
          setData(prev => ({ ...prev, [TAB_ACCESS]: res }));
        }
      } catch (e) {
        console.error("Erro ao buscar dados", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [activeTab, refreshKey]);

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente remover este item?")) return;
    try {
      if (activeTab === TAB_TOOLS) await api.deleteControlTool(id);
      else if (activeTab === TAB_FINANCIAL) await api.deleteControlFinancial(id);
      else if (activeTab === TAB_ACCESS) await api.deleteControlAccess(id);
      setRefreshKey(k => k + 1);
    } catch (e) {
      console.error(e);
      alert("Erro ao remover");
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleSave = async (formData) => {
    try {
      if (activeTab === TAB_TOOLS) {
        if (editingItem?.id) await api.updateControlTool(editingItem.id, formData);
        else await api.createControlTool(formData);
      } else if (activeTab === TAB_FINANCIAL) {
        if (editingItem?.id) await api.updateControlFinancial(editingItem.id, formData);
        else await api.createControlFinancial(formData);
      } else if (activeTab === TAB_ACCESS) {
        if (editingItem?.id) await api.updateControlAccess(editingItem.id, formData);
        else await api.createControlAccess(formData);
      }
      setIsModalOpen(false);
      setRefreshKey(k => k + 1);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar");
    }
  };

  return (
    <div className="page" style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto", animation: "fadeIn 0.3s ease" }}>
      <header style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Icons.Lock /> Área de Controle
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: "4px", fontSize: "14px" }}>
            Acesso restrito para administradores gerenciarem credenciais e acessos.
          </p>
        </div>
        <button className="btn btn--primary" onClick={handleCreate}>
          <Icons.Plus /> Adicionar Novo
        </button>
      </header>

      <div style={{ display: "flex", gap: "2px", background: "var(--bg-secondary)", padding: "4px", borderRadius: "12px", width: "max-content", marginBottom: "24px" }}>
        <TabButton active={activeTab === TAB_TOOLS} onClick={() => setActiveTab(TAB_TOOLS)}>Ferramentas TI</TabButton>
        <TabButton active={activeTab === TAB_FINANCIAL} onClick={() => setActiveTab(TAB_FINANCIAL)}>Controle Financeiro</TabButton>
        <TabButton active={activeTab === TAB_ACCESS} onClick={() => setActiveTab(TAB_ACCESS)}>Base de Acessos</TabButton>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Carregando...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ background: "var(--bg-secondary)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
                <tr>
                  {activeTab === TAB_TOOLS && (
                    <>
                      <th style={thStyle}>Ferramenta</th>
                      <th style={thStyle}>Login</th>
                      <th style={thStyle}>Senha</th>
                      <th style={thStyle}>Autenticação</th>
                      <th style={thStyle}>Obs</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Ações</th>
                    </>
                  )}
                  {activeTab === TAB_FINANCIAL && (
                    <>
                      <th style={thStyle}>Serviço</th>
                      <th style={thStyle}>Custo Mensal</th>
                      <th style={thStyle}>Plano</th>
                      <th style={thStyle}>Vencimento / Renovação</th>
                      <th style={thStyle}>Acesso/User</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Ações</th>
                    </>
                  )}
                  {activeTab === TAB_ACCESS && (
                    <>
                      <th style={thStyle}>Plataforma</th>
                      <th style={thStyle}>Link</th>
                      <th style={thStyle}>Usuário</th>
                      <th style={thStyle}>Senha</th>
                      <th style={thStyle}>Obs</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Ações</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {data[activeTab].map(item => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"} onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}>
                    {activeTab === TAB_TOOLS && (
                      <>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600 }}>{item.tool_name}</div>
                          {item.tool_link && <a href={item.tool_link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--color-primary)", textDecoration: "none" }}>Acessar link</a>}
                        </td>
                        <td style={tdStyle}>{item.login}</td>
                        <td style={tdStyle}><PasswordField password={item.password} /></td>
                        <td style={tdStyle}>{item.auth_details}</td>
                        <td style={tdStyle}>{item.notes}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <button className="btn btn--ghost" style={{ padding: "4px" }} onClick={() => handleEdit(item)}><Icons.Settings /></button>
                          <button className="btn btn--ghost" style={{ padding: "4px", color: "var(--danger)" }} onClick={() => handleDelete(item.id)}>✕</button>
                        </td>
                      </>
                    )}
                    {activeTab === TAB_FINANCIAL && (
                      <>
                        <td style={tdStyle}>{item.service_name}</td>
                        <td style={tdStyle}>{item.monthly_cost ? `R$ ${Number(item.monthly_cost).toFixed(2)}` : "-"}</td>
                        <td style={tdStyle}>{item.plan_details}</td>
                        <td style={tdStyle}>
                          {item.due_date && <div>Dia {item.due_date}</div>}
                          {item.renewal_date && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(item.renewal_date).toLocaleDateString()}</div>}
                        </td>
                        <td style={tdStyle}>{item.user_access}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <button className="btn btn--ghost" style={{ padding: "4px" }} onClick={() => handleEdit(item)}><Icons.Settings /></button>
                          <button className="btn btn--ghost" style={{ padding: "4px", color: "var(--danger)" }} onClick={() => handleDelete(item.id)}>✕</button>
                        </td>
                      </>
                    )}
                    {activeTab === TAB_ACCESS && (
                      <>
                        <td style={tdStyle}>{item.platform}</td>
                        <td style={tdStyle}>{item.link && <a href={item.link} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)", textDecoration: "none" }}>Acessar</a>}</td>
                        <td style={tdStyle}>{item.username}</td>
                        <td style={tdStyle}><PasswordField password={item.password} /></td>
                        <td style={tdStyle}>{item.notes}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <button className="btn btn--ghost" style={{ padding: "4px" }} onClick={() => handleEdit(item)}><Icons.Settings /></button>
                          <button className="btn btn--ghost" style={{ padding: "4px", color: "var(--danger)" }} onClick={() => handleDelete(item.id)}>✕</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {data[activeTab].length === 0 && (
                  <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>Nenhum registro encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal activeTab={activeTab} item={editingItem} onClose={() => setIsModalOpen(false)} onSave={handleSave} />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        background: active ? "var(--bg-card)" : "transparent",
        border: "none",
        borderRadius: "8px",
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        fontWeight: active ? 600 : 500,
        fontSize: "14px",
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
      }}
    >
      {children}
    </button>
  );
}

function PasswordField({ password }) {
  const [show, setShow] = useState(false);
  if (!password) return <span style={{ color: "var(--text-muted)" }}>-</span>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontFamily: "monospace", fontSize: 13, minWidth: 80 }}>{show ? password : "••••••••"}</span>
      <button className="btn btn--ghost" style={{ padding: "2px", width: 24, height: 24, minWidth: 24 }} onClick={() => setShow(!show)}>
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {show ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          )}
        </svg>
      </button>
    </div>
  );
}

function Modal({ activeTab, item, onClose, onSave }) {
  const [formData, setFormData] = useState(item || {});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="doc-overlay" onClick={onClose}>
      <div className="doc-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="doc-modal__header">
          <span className="doc-modal__title">{item ? "Editar" : "Adicionar"} Registro</span>
          <button type="button" className="doc-modal__close" onClick={onClose}>✕</button>
        </div>
        <form className="doc-modal__body" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {activeTab === TAB_TOOLS && (
            <>
              <div className="form-group"><label>Ferramenta</label><input className="form-input" name="tool_name" value={formData.tool_name || ""} onChange={handleChange} required /></div>
              <div className="form-group"><label>Link</label><input className="form-input" name="tool_link" value={formData.tool_link || ""} onChange={handleChange} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group"><label>Login</label><input className="form-input" name="login" value={formData.login || ""} onChange={handleChange} /></div>
                <div className="form-group"><label>Senha {item && "(deixe em branco p/ não alterar)"}</label><input className="form-input" type="text" name="password" value={formData.password || ""} onChange={handleChange} placeholder={item ? "********" : ""} /></div>
              </div>
              <div className="form-group"><label>Autenticação</label><input className="form-input" name="auth_details" value={formData.auth_details || ""} onChange={handleChange} /></div>
              <div className="form-group"><label>Observação</label><textarea className="form-input" name="notes" value={formData.notes || ""} onChange={handleChange} /></div>
            </>
          )}

          {activeTab === TAB_FINANCIAL && (
            <>
              <div className="form-group"><label>Serviço</label><input className="form-input" name="service_name" value={formData.service_name || ""} onChange={handleChange} required /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group"><label>Custo Mensal</label><input className="form-input" type="number" step="0.01" name="monthly_cost" value={formData.monthly_cost || ""} onChange={handleChange} /></div>
                <div className="form-group"><label>Plano</label><input className="form-input" name="plan_details" value={formData.plan_details || ""} onChange={handleChange} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group"><label>Renovação</label><input className="form-input" type="date" name="renewal_date" value={formData.renewal_date ? formData.renewal_date.split('T')[0] : ""} onChange={handleChange} /></div>
                <div className="form-group"><label>Dia Vencimento</label><input className="form-input" type="number" min="1" max="31" name="due_date" value={formData.due_date || ""} onChange={handleChange} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group"><label>Método de Pagamento</label><input className="form-input" name="payment_method" value={formData.payment_method || ""} onChange={handleChange} /></div>
                <div className="form-group"><label>Acesso / Usuário</label><input className="form-input" name="user_access" value={formData.user_access || ""} onChange={handleChange} /></div>
              </div>
              <div className="form-group"><label>NF / Info. Fatura</label><textarea className="form-input" name="invoice_info" value={formData.invoice_info || ""} onChange={handleChange} /></div>
            </>
          )}

          {activeTab === TAB_ACCESS && (
            <>
              <div className="form-group"><label>Plataforma</label><input className="form-input" name="platform" value={formData.platform || ""} onChange={handleChange} required /></div>
              <div className="form-group"><label>Link</label><input className="form-input" name="link" value={formData.link || ""} onChange={handleChange} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group"><label>Usuário</label><input className="form-input" name="username" value={formData.username || ""} onChange={handleChange} /></div>
                <div className="form-group"><label>Senha {item && "(deixe em branco p/ não alterar)"}</label><input className="form-input" type="text" name="password" value={formData.password || ""} onChange={handleChange} placeholder={item ? "********" : ""} /></div>
              </div>
              <div className="form-group"><label>Observação</label><textarea className="form-input" name="notes" value={formData.notes || ""} onChange={handleChange} /></div>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn--primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const thStyle = { padding: "16px", borderBottom: "1px solid var(--border)" };
const tdStyle = { padding: "16px", fontSize: "14px" };
