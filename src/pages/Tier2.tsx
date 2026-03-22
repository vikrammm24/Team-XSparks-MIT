import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

const Tier2: React.FC = () => {
  const { user } = useAuth();
  const { tier2Status, setTier2Status, showClearanceProtocol, setShowClearanceProtocol } = useApp();
  
  // Simulated Gas Gauges
  const [methane, setMethane] = useState(1); // safe < 5
  const [h2s, setH2s] = useState(2); // safe < 10 ppm
  const [waterLevel, setWaterLevel] = useState(10); // safe < 50cm
  
  const isSafe = methane < 5 && h2s < 10 && waterLevel < 50;

  // Simulator for Supervisor to tweak values
  const handleApproveEntry = () => {
    if (isSafe) {
      setTier2Status('Clearance Granted');
    } else {
      alert("Cannot approve entry while environmental values are hazardous!");
    }
  };

  const Gauge = ({ label, value, max, unit, dangerThreshold }: { label: string, value: number, max: number, unit: string, dangerThreshold: number }) => {
    const isDanger = value >= dangerThreshold;
    const percentage = Math.min((value / max) * 100, 100);
    
    return (
      <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', textAlign: 'center', flex: 1 }}>
        <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>{label}</h4>
        
        <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Circular Track */}
          <svg style={{ width: '100%', height: '100%', position: 'absolute', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-tertiary)" strokeWidth="8" />
            <circle 
              cx="50" cy="50" r="40" fill="none" 
              stroke={isDanger ? 'var(--danger)' : 'var(--success)'} 
              strokeWidth="8" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * percentage) / 100}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            {value}<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{unit}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Tier 2: "Drishti" Pre-Entry Scouting</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Unified Inspection View</p>
        </div>
        
        <div style={{ 
          padding: '0.5rem 1rem', borderRadius: '12px',
          background: tier2Status === 'Clearance Granted' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
          color: tier2Status === 'Clearance Granted' ? 'var(--success)' : 'var(--warning)',
          border: `1px solid ${tier2Status === 'Clearance Granted' ? 'var(--success)' : 'var(--warning)'}`,
          fontWeight: 600
        }}>
          {tier2Status}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
        
        {/* Left Column: Video & Diagnostics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Panoramic Video Feed */}
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>ESP32 Cam Module Stream</span>
              <span style={{ fontSize: '0.8rem', background: 'var(--success)', padding: '0.1rem 0.5rem', borderRadius: '4px', color: '#000' }}>ONLINE</span>
            </div>
            {/* Mocked Video Stream Viewport */}
            <div style={{ width: '100%', height: '400px', background: '#000', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: 'var(--text-muted)' }}>esp32_cam_stream_mock.mp4</p>
              <div style={{ position: 'absolute', bottom: '10%', right: '5%', background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                Depth: 2.4m | HD 1080p
              </div>
            </div>
          </div>

          {/* Environmental Gas Gauges & Water Level */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Gauge label="Methane (CH4)" value={methane} max={10} unit="%" dangerThreshold={5} />
            <Gauge label="Hydrogen Sulfide (H2S)" value={h2s} max={50} unit="ppm" dangerThreshold={10} />
            
            <div className="glass-panel" style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Flood Diagnostics (HC-SR04)</h4>
              <div style={{ width: '60px', height: '120px', background: 'var(--bg-tertiary)', borderRadius: '8px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ 
                  position: 'absolute', bottom: 0, width: '100%', height: `${Math.min((waterLevel / 100) * 100, 100)}%`,
                  background: waterLevel >= 50 ? 'var(--danger)' : 'var(--accent-primary)',
                  transition: 'height 0.5s ease'
                }} />
              </div>
              <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>{waterLevel} cm</div>
            </div>
          </div>

        </div>

        {/* Right Column: Supervisor Controls or Worker Wait status */}
        <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
          <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Clearance Control</h3>
          
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              All environmental parameters must be within safe limits before Final Clearance is granted.
            </p>
            <div style={{ padding: '1rem', borderRadius: '8px', background: isSafe ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: isSafe ? 'var(--success)' : 'var(--danger)', fontWeight: 600, textAlign: 'center' }}>
              {isSafe ? 'Environment: SAFE' : 'Environment: HAZARDOUS'}
            </div>
          </div>

          {user?.role === 'Supervisor' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', border: '1px dashed var(--glass-border)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Simulator Tweaks </h4>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Methane: <input type="range" min="0" max="10" value={methane} onChange={e => setMethane(Number(e.target.value))} style={{ width: '100%' }} /></label>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>H2S: <input type="range" min="0" max="50" value={h2s} onChange={e => setH2s(Number(e.target.value))} style={{ width: '100%' }} /></label>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Water Level: <input type="range" min="0" max="100" value={waterLevel} onChange={e => setWaterLevel(Number(e.target.value))} style={{ width: '100%' }} /></label>
              </div>

              <button 
                className="btn-primary" 
                style={{ width: '100%', padding: '1rem', background: isSafe ? 'var(--success)' : 'var(--bg-tertiary)' }}
                disabled={!isSafe || tier2Status === 'Clearance Granted'}
                onClick={handleApproveEntry}
              >
                {tier2Status === 'Clearance Granted' ? 'ENTRY APPROVED' : 'APPROVE ENTRY'}
              </button>
            </div>
          )}
          
          {user?.role === 'Worker' && (
            <div>
              <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Your Supervisor is currently reviewing these live diagnostics. You will receive a protocol alert here immediately upon approval.
              </div>
            </div>
          )}
        </div>

      </div>

      {/* CLEARANCE PROTOCOL NOTIFICATION POPUP */}
      {showClearanceProtocol && user?.role === 'Worker' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '3rem', maxWidth: '500px', width: '90%', textAlign: 'center', border: '2px solid var(--success)', background: 'linear-gradient(180deg, rgba(30,41,59,0.95) 0%, rgba(16,185,129,0.1) 100%)', boxShadow: '0 0 40px rgba(16, 185, 129, 0.4)', position: 'relative' }}>
            
            <div className="status-pulse-green" style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--success)', margin: '0 auto 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '2.5rem' }}>🛡️</span>
            </div>

            <h2 style={{ fontSize: '2rem', color: 'var(--success)', marginBottom: '1rem', letterSpacing: '0.05em' }}>CLEARANCE GRANTED</h2>
            
            <p style={{ fontSize: '1.2rem', color: 'white', marginBottom: '2rem', lineHeight: 1.6 }}>
              The Supervisor has verified the environment as safe. All critical parameters (Methane, H2S, Water Level) are within optimal thresholds.
            </p>

            <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-around' }}>
              <div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CH4</div><div style={{ fontWeight: 'bold' }}>{methane}%</div></div>
              <div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>H2S</div><div style={{ fontWeight: 'bold' }}>{h2s} ppm</div></div>
              <div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Flood</div><div style={{ fontWeight: 'bold' }}>{waterLevel} cm</div></div>
            </div>

            <button 
              className="btn-primary" 
              style={{ padding: '1rem 3rem', fontSize: '1.2rem', background: 'var(--success)', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)' }}
              onClick={() => setShowClearanceProtocol(false)}
            >
              ACKNOWLEDGE & PROCEED
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Tier2;
