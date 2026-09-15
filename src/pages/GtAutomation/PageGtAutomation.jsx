import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Icons } from "../../icons/Icons";
import { GtWizardModal } from "./GtWizardModal";

export default function PageGtAutomation({ session }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    setLoading(true);
    api.getAdminGtJobs()
      .then(res => setJobs(res.data || []))
      .catch(err => {
        // Fallback for when API doesn't exist yet
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-layout">
      <SectionHeader
        title="Central de Automação GT"
        description="Provisionamento e manutenção de integrações e capturas de anúncios via Workflows GT."
        right={
          <button className="btn btn--primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setWizardOpen(true)}>
            <Icons.Plus /> Novo Provisionamento
          </button>
        }
      />

      {loading && <LoadingSpinner />}
      {error && <div className="alert alert--warning" style={{ marginBottom: 16 }}>Não foi possível carregar os jobs: {error}</div>}

      {!loading && jobs.length === 0 ? (
        <EmptyState
          icon={<Icons.Activity />}
          title="Nenhum job em andamento"
          description="Nenhuma automação foi provisionada ou atualizada recentemente."
        />
      ) : (!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {jobs.map(job => (
            <div key={job.id} className="card p-4">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h4 style={{ fontWeight: "bold", fontSize: 16 }}>Job #{job.id}</h4>
                  <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{job.clientName}</p>
                </div>
                <span className={`badge ${job.status === 'succeeded' ? 'badge--success' : job.status === 'failed' ? 'badge--danger' : 'badge--warning'}`}>
                  {job.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}

      {wizardOpen && (
        <GtWizardModal onClose={() => setWizardOpen(false)} />
      )}
    </div>
  );
}
