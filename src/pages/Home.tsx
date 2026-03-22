import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { Cloud, Sun, CloudRain, CloudLightning, Snowflake, Thermometer, Droplets, Info, AlertTriangle } from 'lucide-react';

const Home: React.FC = () => {
  const { user } = useAuth();
  const { isReady } = useDatabase();

  const [weatherData, setWeatherData] = useState<{temp: number, description: string, main: string, humidity: number, id: number} | null>(null);

  useEffect(() => {
    const fetchWeatherByCoords = async (lat: number, lon: number) => {
      try {
        const apiKey = (import.meta as any).env?.VITE_OPENWEATHER_API_KEY || '31e8d7498f0d4fa76fc3683f93f38848';
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
        const data = await res.json();
        
        if (data.weather && data.weather.length > 0) {
           setWeatherData({
             temp: data.main.temp,
             humidity: data.main.humidity,
             description: data.weather[0].description,
             main: data.weather[0].main,
             id: data.weather[0].id
           });
        }
      } catch(err) {
        console.error("OpenWeather Fetch Error", err);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => fetchWeatherByCoords(position.coords.latitude, position.coords.longitude),
        () => fetchWeatherByCoords(17.6599, 75.9064)
      );
    } else {
      fetchWeatherByCoords(17.6599, 75.9064);
    }
  }, []);

  const getWeatherIcon = (main: string, color: string) => {
    switch(main?.toLowerCase()) {
      case 'clear': return <Sun size={24} color={color} />;
      case 'clouds': return <Cloud size={24} color={color} />;
      case 'rain': case 'drizzle': return <CloudRain size={24} color={color} />;
      case 'thunderstorm': return <CloudLightning size={24} color={color} />;
      case 'snow': return <Snowflake size={24} color={color} />;
      default: return <Cloud size={24} color={color} />;
    }
  };

  const getAlertText = () => {
     if (!weatherData) return "Scanning atmosphere...";
     // Map OpenWeather description to an alert text.
     if (weatherData.id >= 200 && weatherData.id < 600) {
       return `Weather: ${weatherData.description} expected shortly. Suspend outdoor clearing.`;
     }
     return `Weather Operations Clear: Expect ${weatherData.description} conditions.`;
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', paddingTop: '4rem', paddingBottom: '4rem' }}>
      <h1 style={{ fontSize: '3rem', color: 'var(--accent-primary)', marginBottom: '1rem' }}>SMC-KAVACH</h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
        "Zero Unsafe Entries" - Digital Gatekeeper Ecosystem
      </p>
      
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'left', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Welcome, {user?.name}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Role: <strong>{user?.role}</strong> {user?.worker_id_code && `| ID: ${user.worker_id_code}`}
        </p>

        {user?.role === 'Supervisor' && (
          <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid var(--accent-primary)', borderRadius: '0 8px 8px 0', marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Supervisor Dashboard</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              You have full administrative access to all 4 Safety Tiers. Use the navigation header to monitor entry points, view endoscope feeds, and approve digital tokens.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--success)' }}>🟢 DB Browser SQLite Linked Connected</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  All modifications happening in this UI are currently being strictly synced with `vikas.sqlite` directly on your physical computer! Open that file in DB Browser!
                </p>
              </div>
            </div>
          </div>
        )}
        
        {user?.role === 'Worker' && (
          <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid var(--warning)', borderRadius: '0 8px 8px 0' }}>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Worker Profile</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              You are currently viewing the system as a Sanitation Worker. Head over to <strong>Tier 1</strong> to secure your entry token, or <strong>Tier 2</strong> to view joint diagnostics.
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
         {/* Weather Conditions Box */}
         <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'left', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Weather Conditions</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
               <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {weatherData ? getWeatherIcon(weatherData.main, '#3b82f6') : <Cloud size={24} color="#3b82f6" />}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem', marginBottom: '0.25rem' }}>Condition</span>
                  <strong style={{ fontSize: '1.1rem', textTransform: 'capitalize' }}>{weatherData ? weatherData.description : '--'}</strong>
               </div>
               <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Thermometer size={24} color="#f59e0b" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem', marginBottom: '0.25rem' }}>Temperature</span>
                  <strong style={{ fontSize: '1.1rem' }}>{weatherData ? `${Math.round(weatherData.temp)}°C` : '--°C'}</strong>
               </div>
               <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Droplets size={24} color="#06b6d4" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem', marginBottom: '0.25rem' }}>Humidity</span>
                  <strong style={{ fontSize: '1.1rem' }}>{weatherData ? `${weatherData.humidity}%` : '--%'}</strong>
               </div>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#60a5fa' }}>
               <Info size={18} style={{ flexShrink: 0 }} />
               <span style={{ fontSize: '0.95rem' }}>{getAlertText()}</span>
            </div>
         </div>

         {/* Global Alerts Box */}
         <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'left', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Global Alerts</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <Info size={20} color="#60a5fa" style={{ marginTop: '2px', flexShrink: 0 }}/>
                  <div>
                    <div style={{ fontSize: '0.95rem', color: '#60a5fa', marginBottom: '0.25rem' }}>{getAlertText()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(96, 165, 250, 0.6)' }}>{new Date().toLocaleTimeString()}</div>
                  </div>
               </div>

               <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <AlertTriangle size={20} color="#fbbf24" style={{ marginTop: '2px', flexShrink: 0 }}/>
                  <div>
                    <div style={{ fontSize: '0.95rem', color: '#fbbf24', marginBottom: '0.25rem' }}>Sensor: Site S03 ultrasonic surge +12%</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(251, 191, 36, 0.6)' }}>{new Date(Date.now() - 600000).toLocaleTimeString()}</div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Home;
