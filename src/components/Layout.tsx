import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, ShieldAlert, Eye, HardHat, TrendingUp, Bell, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';

const Layout: React.FC = () => {
  const { user, role, logout } = useAuth();
  const { isReady } = useDatabase();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    // Redirect logic could also be in App.tsx, but handling it here requires user context
    // We'll navigate them away if unauthenticated
    React.useEffect(() => {
      navigate('/login');
    }, [user, navigate]);
    return null;
  }

  // Navigation Items
  const navItems = [
    { name: 'Home', path: '/', icon: Home, show: true },
    { name: 'Tier 1', path: '/tier1', icon: ShieldAlert, show: true },
    // Unified Tier 2: shown to both but worker sees it differently
    { name: 'Tier 2', path: '/tier2', icon: Eye, show: true }, 
    { name: 'Tier 3', path: '/tier3', icon: HardHat, show: true },
    // Tier 4 is hidden for workers
    { name: 'Tier 4', path: '/tier4', icon: TrendingUp, show: role === 'Supervisor' },
  ];

  return (
    <div className="page-container">
      {/* Top Header */}
      <header className="glass-panel" style={{ 
        margin: '1rem', 
        padding: '0.5rem 2rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        position: 'sticky',
        top: '1rem',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1.25rem', letterSpacing: '0.05em' }}>
            <span style={{ color: 'var(--accent-primary)' }}>SMC</span>-KAVACH
          </div>
          {role === 'Supervisor' && (
            <div style={{ fontSize: '0.75rem', background: 'var(--accent-primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>SUPERVISOR VIEW</div>
          )}
          {role === 'Worker' && (
            <div style={{ fontSize: '0.75rem', background: 'var(--warning)', color: '#000', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>WORKER VIEW</div>
          )}
        </div>

        {/* Navigation Icons */}
        <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {navItems.filter(item => item.show).map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                opacity: isActive ? 1 : 0.7,
                transition: 'all 0.2s',
                textDecoration: 'none'
              })}
            >
              <item.icon size={24} />
            </NavLink>
          ))}
          
          {/* Notifications */}
          <button style={{ color: 'var(--text-secondary)', marginLeft: '1rem', position: 'relative' }}>
            <Bell size={24} />
            <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--danger)', width: 10, height: 10, borderRadius: '50%' }}></span>
          </button>
        </nav>

        {/* User Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <UserIcon size={20} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user.name}</span>
          </div>
          <button onClick={handleLogout} style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content animate-fade-in">
        {!isReady && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.2)', border: '1px solid var(--danger)', borderRadius: '8px', marginBottom: '1rem' }}>
            Offline Database is initializing...
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
