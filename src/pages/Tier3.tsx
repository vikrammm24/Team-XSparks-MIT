import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const MiniSparkline: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  const w = 140;
  const h = 40;
  const pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = pad + (i / Math.max(values.length - 1, 1)) * (w - 2 * pad);
      const y = pad + (1 - (v - min) / span) * (h - 2 * pad);
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block', opacity: 0.9 }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

const Tier3: React.FC = () => {
  const { user } = useAuth();
  const [heartRate, setHeartRate] = useState(68);
  const [spo2, setSpo2] = useState(98.2);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  const hrHistory = useMemo(() => {
    const base = [66, 67, 68, 69, 67, 68, 68, 69, 68, heartRate];
    return base;
  }, [heartRate]);

  const spo2History = useMemo(() => {
    return [97.8, 98.0, 98.1, 98.2, 98.0, 98.2, 98.1, 98.3, 98.2, spo2];
  }, [spo2]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setHeartRate((h) => {
        const n = h + (Math.random() > 0.5 ? 1 : -1) * (Math.random() > 0.7 ? 1 : 0);
        return Math.round(Math.min(82, Math.max(62, n)));
      });
      setSpo2((s) => {
        const n = s + (Math.random() - 0.5) * 0.15;
        return Math.round(n * 10) / 10;
      });
      setLastUpdated(new Date());
    }, 3000);
    return () => window.clearInterval(id);
  }, []);

  const roleLabel = user?.role === 'Supervisor' ? 'Supervisor view' : 'Worker view';

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Tier 3 – Sachet Active Guard</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Real-time biometric monitoring
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{roleLabel}</p>
        </div>
      </div>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          Live biometrics
        </h2>
        <div
          className="glass-panel"
          style={{
            padding: '1.5rem',
            maxWidth: '420px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>Vikram</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>W004</div>
            </div>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                padding: '0.35rem 0.65rem',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.2)',
                color: 'var(--success)',
                border: '1px solid var(--success)',
              }}
            >
              NORMAL
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Heart rate
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.35rem' }}>
                {heartRate}
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}> bpm</span>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <MiniSparkline values={hrHistory} color="var(--danger)" />
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                SpO₂
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.35rem' }}>
                {spo2.toFixed(1)}
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}> %</span>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <MiniSparkline values={spo2History} color="var(--accent-primary)" />
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          Emergency controls
        </h2>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => window.alert('Site SOS triggered — dispatch workflow would start here.')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              background: 'var(--danger)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              width: '100%',
              maxWidth: '420px',
            }}
          >
            <span aria-hidden>🔔</span> Trigger site SOS
          </button>
          <button
            type="button"
            disabled
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.95rem',
              width: '100%',
              maxWidth: '420px',
              cursor: 'not-allowed',
              border: '1px solid var(--glass-border)',
            }}
          >
            <span aria-hidden>✓</span> Acknowledge alerts
          </button>
          <div
            style={{
              marginTop: '0.25rem',
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              maxWidth: '560px',
              lineHeight: 1.45,
            }}
          >
            All worker locations are continuously tracked. SOS triggers automatic rescue dispatch to nearest responders.
          </div>
        </div>
      </section>
    </div>
  );
};

export default Tier3;
