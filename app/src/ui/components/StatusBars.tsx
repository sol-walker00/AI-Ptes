import type { PetState } from '../../domain/petTypes';

const rows = [
  ['心情', 'mood'],
  ['饥饿', 'hunger'],
  ['精力', 'energy'],
  ['亲密', 'intimacy'],
  ['清洁', 'cleanliness'],
  ['健康', 'health'],
  ['无聊', 'boredom'],
  ['信任', 'trust'],
] as const;

export function StatusBars({ state }: { state: PetState }) {
  return (
    <div className="status-bars" aria-label="pet status">
      {rows.map(([label, key]) => {
        const value = key === 'mood' ? undefined : state[key];
        return (
          <div className="status-row" key={key}>
            <span>{label}</span>
            {key === 'mood' ? (
              <strong>{state.mood}</strong>
            ) : (
              <div className="meter" aria-label={`${label} ${value}`}>
                <span style={{ width: `${value}%` }} />
              </div>
            )}
          </div>
        );
      })}
      <div className="status-row status-meta">
        <span>成长</span>
        <strong>{state.lifeStage} · Lv.{state.level} · {state.coins}币</strong>
      </div>
    </div>
  );
}
