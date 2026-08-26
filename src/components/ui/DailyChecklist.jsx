import { useEffect, useMemo, useState } from "react";
import { getDailyChecklist } from "../../utils/operations";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function DailyChecklist({ storageKey = "techhub.daily-checklist" }) {
  const dateKey = todayKey();
  const tasks = useMemo(() => getDailyChecklist(), []);
  const [checked, setChecked] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return stored.date === dateKey ? stored.checked || {} : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ date: dateKey, checked }));
  }, [checked, dateKey, storageKey]);

  const done = tasks.filter((task) => checked[task]).length;
  const progress = Math.round((done / tasks.length) * 100);

  return (
    <article className="executive-card daily-checklist">
      <div className="section-header">
        <div>
          <div className="section-header__eyebrow">Rotina interna</div>
          <div className="section-header__title">Checklist do dia</div>
          <p className="section-header__description">Itens locais do navegador para manter a operação limpa sem criar tabela no banco.</p>
        </div>
        <span className="checklist-progress">{progress}%</span>
      </div>

      <div className="checklist-list">
        {tasks.map((task) => (
          <label key={task} className={`checklist-item ${checked[task] ? "checklist-item--done" : ""}`}>
            <input
              type="checkbox"
              checked={Boolean(checked[task])}
              onChange={(event) => setChecked((prev) => ({ ...prev, [task]: event.target.checked }))}
            />
            <span>{task}</span>
          </label>
        ))}
      </div>
    </article>
  );
}
