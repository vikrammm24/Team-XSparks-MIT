import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';

const Login: React.FC = () => {
  const [role, setRole] = useState<'Supervisor' | 'Worker'>('Supervisor');
  const [workerId, setWorkerId] = useState('');
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const { db, isReady } = useDatabase();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isReady || !db) {
      setError('Database is not ready yet');
      return;
    }

    if (role === 'Supervisor') {
      // Dummy logic for Supervisor login
      login({ id: 0, name: 'Admin Supervisor', role: 'Supervisor' });
      navigate('/');
    } else {
      if (!workerId) {
        setError('Please enter Worker ID');
        return;
      }
      
      try {
        const stmt = db.prepare("SELECT * FROM Workers WHERE worker_id_code = :id");
        stmt.bind([workerId]);
        const hasResult = stmt.step();
        
        if (hasResult) {
          const row = stmt.getAsObject();
          login({ 
            id: row.id as number, 
            name: row.name as string, 
            worker_id_code: row.worker_id_code as string,
            role: 'Worker' 
          });
          navigate('/');
        } else {
          setError('Worker not found');
        }
        stmt.free();
      } catch (err: any) {
        setError('Database error: ' + err.message);
      }
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '2.5rem', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.75rem' }}>
          <span style={{ color: 'var(--accent-primary)' }}>SMC</span>-KAVACH<br/>Login
        </h2>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button 
            type="button"
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '8px', fontWeight: 600,
              background: role === 'Supervisor' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: role === 'Supervisor' ? '#fff' : 'var(--text-secondary)',
              border: role === 'Supervisor' ? '1px solid var(--accent-hover)' : '1px solid var(--glass-border)'
            }}
            onClick={() => setRole('Supervisor')}
          >
            Supervisor
          </button>
          <button 
            type="button"
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '8px', fontWeight: 600,
              background: role === 'Worker' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: role === 'Worker' ? '#fff' : 'var(--text-secondary)',
              border: role === 'Worker' ? '1px solid var(--accent-hover)' : '1px solid var(--glass-border)'
            }}
            onClick={() => setRole('Worker')}
          >
            Worker
          </button>
        </div>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {role === 'Supervisor' ? (
            <>
              <input type="text" placeholder="Username (Admin)" disabled value="admin" style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white' }} />
              <input type="password" placeholder="Password" disabled value="password" style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white' }} />
            </>
          ) : (
            <input 
              type="text" 
              placeholder="Enter Worker ID Code" 
              value={workerId} 
              onChange={e => setWorkerId(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', outline: 'none' }} 
            />
          )}
          
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
            Enter Ecosystem
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Need to enroll a worker?{' '}
          <span style={{ color: 'var(--accent-primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/register')}>
            Register here
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
