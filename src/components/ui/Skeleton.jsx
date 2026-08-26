/**
 * @module Skeleton
 * @description Placeholder visual para carregamento progressivo.
 */
export function Skeleton({ className = "", style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function DashboardSkeleton() {
  return (
    <div className="dashboard-shell">
      <div className="dashboard-hero dashboard-hero--loading">
        <Skeleton style={{ width: 140, height: 14 }} />
        <Skeleton style={{ width: 340, height: 36 }} />
        <Skeleton style={{ width: 520, height: 14 }} />
      </div>
      <div className="metric-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="metric-card" key={index}>
            <Skeleton style={{ width: 90, height: 13 }} />
            <Skeleton style={{ width: 130, height: 34 }} />
            <Skeleton style={{ width: 180, height: 12 }} />
          </div>
        ))}
      </div>
      <div className="dashboard-grid dashboard-grid--two">
        <div className="executive-card"><Skeleton style={{ width: "100%", height: 280 }} /></div>
        <div className="executive-card"><Skeleton style={{ width: "100%", height: 280 }} /></div>
      </div>
    </div>
  );
}

export default Skeleton;
