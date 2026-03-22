import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, MapPin, Clock, AlertTriangle, CheckCircle, Info, Send, LogOut, BarChart2, CloudRain, Sun, Cloud, CloudLightning, Snowflake } from 'lucide-react';

const mockChartData = [
  { time: '00:00', rainfall: 45, ultrasonic: 5 },
  { time: '04:00', rainfall: 48, ultrasonic: 7 },
  { time: '08:00', rainfall: 52, ultrasonic: 9 },
  { time: '12:00', rainfall: 75, ultrasonic: 15 },
  { time: '16:00', rainfall: 85, ultrasonic: 17 },
  { time: '20:00', rainfall: 65, ultrasonic: 10 },
  { time: '24:00', rainfall: 50, ultrasonic: 6 },
];

const mockResponders = [
  { id: 1, name: 'Rajesh Kumar', code: 'W001', time: '3.5 min away' },
  { id: 2, name: 'Suresh Patel', code: 'W002', time: '5.0 min away' },
  { id: 3, name: 'Amit Singh', code: 'W003', time: '2.7 min away' }
];

const mockIncidents = [
  { time: '6:55:01 PM', site: 'S01', event: 'Worker check-in completed', severity: 'SUCCESS' },
  { time: '5:55:01 PM', site: 'S02', event: 'Ultrasonic surge +8%', severity: 'INFO' },
];

const Tier4: React.FC = () => {
  const { user } = useAuth();
  
  // Real-time live meteorology
  const [weatherData, setWeatherData] = useState<{temp: number, description: string, main: string, locationName: string, id: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  React.useEffect(() => {
    const fetchWeatherByCoords = async (lat: number, lon: number) => {
      try {
        const apiKey = (import.meta as any).env?.VITE_OPENWEATHER_API_KEY || '31e8d7498f0d4fa76fc3683f93f38848';
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
        const data = await res.json();
        
        if (data.weather && data.weather.length > 0) {
           setWeatherData({
             temp: data.main.temp,
             description: data.weather[0].description,
             main: data.weather[0].main,
             locationName: data.name,
             id: data.weather[0].id
           });
        }
      } catch(err) {
        console.error("OpenWeather Synchronization Failed", err);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Location permission denied", error);
          setLocationError("Location Defaulted (Solapur)");
          fetchWeatherByCoords(17.6599, 75.9064); 
        }
      );
    } else {
      setLocationError("Geolocation not natively supported by browser sandbox.");
      fetchWeatherByCoords(17.6599, 75.9064);
    }
  }, []);

  const getSafetyStatus = (weatherId: number) => {
    if (weatherId >= 200 && weatherId < 300) return { color: 'var(--danger)', text: 'NOT SAFE: Thunderstorm Risk', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' };
    if (weatherId >= 502 && weatherId < 600) return { color: 'var(--danger)', text: 'NOT SAFE: Heavy/Extreme Rain', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' };
    
    // Moderate conditions (light rain, snow, mist, haze)
    if (weatherId === 500 || weatherId === 501 || (weatherId >= 300 && weatherId < 400)) return { color: 'var(--warning)', text: 'Moderate Risk: Light Rain', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' };
    if (weatherId >= 600 && weatherId < 700) return { color: 'var(--warning)', text: 'Moderate Risk: Snowfall', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' };
    if (weatherId >= 700 && weatherId < 800) return { color: 'var(--warning)', text: 'Moderate Risk: Low Visibility', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' };
    
    // Default safe (800 Clear, 80x Clouds)
    return { color: 'var(--success)', text: 'Safe to Enter', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' };
  };

  const getWeatherIcon = (main: string) => {
    switch(main.toLowerCase()) {
      case 'clear': return <Sun size={18} />;
      case 'clouds': return <Cloud size={18} />;
      case 'rain': case 'drizzle': return <CloudRain size={18} />;
      case 'thunderstorm': return <CloudLightning size={18} />;
      case 'snow': return <Snowflake size={18} />;
      default: return <Cloud size={18} />;
    }
  };

  // The system allows both Supervisor and Worker to see the dashboard as requested,
  // but we enforce strict action-button checks natively.
  const isSupervisor = user?.role === 'Supervisor';

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1>Tier 4: Command & Rescue Logistics</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Predictive Safety & Emergency Coordination Hub</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {/* New Requested Weather Icon Status with Live Data */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            {weatherData ? (() => {
               const safety = getSafetyStatus(weatherData.id);
               return (
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: safety.color, background: safety.bg, padding: '0.5rem 1rem', borderRadius: '50px', border: `1px solid ${safety.border}` }}>
                   {getWeatherIcon(weatherData.main)}
                   <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>
                     {weatherData.locationName}: {Math.round(weatherData.temp)}°C, {weatherData.description} — {safety.text}
                   </span>
                 </div>
               );
            })() : (
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--info)', background: 'rgba(59, 130, 246, 0.15)', padding: '0.5rem 1rem', borderRadius: '50px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                 <div className="status-pulse" style={{width: 10, height: 10, borderRadius: '50%', background: 'var(--info)'}} />
                 <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Syncing Atmosphere & Geolocalizing...</span>
               </div>
            )}
            {locationError && <span style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: 2 }}>⚠️ {locationError}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
            <BarChart2 size={18} />
            Command Center Active
            <div className="status-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)', marginLeft: '0.25rem' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Left Panel: Flood Prediction */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={20} color="var(--accent-primary)" /> Flood Prediction</h3>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ width: 10, height: 10, background: 'var(--accent-primary)' }} /> Rainfall
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <div style={{ width: 10, height: 10, background: 'var(--info)' }} /> Ultrasonic
              </div>
            </div>
          </div>
          
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRainfall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUltrasonic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--info)" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="var(--info)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Area type="monotone" dataKey="ultrasonic" stroke="var(--info)" fillOpacity={1} fill="url(#colorUltrasonic)" />
                <Area type="monotone" dataKey="rainfall" stroke="var(--accent-primary)" fillOpacity={1} fill="url(#colorRainfall)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Current Risk</div>
              <div style={{ color: 'var(--success)', fontWeight: 'bold' }}>LOW</div>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Peak (15:00)</div>
              <div style={{ color: 'var(--warning)', fontWeight: 'bold' }}>MEDIUM</div>
            </div>
            <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Forecast</div>
              <div style={{ color: 'var(--info)', fontWeight: 'bold' }}>RAIN</div>
            </div>
          </div>
        </div>

        {/* Right Panel: Rescue Coordinator */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><MapPin size={20} color="var(--accent-primary)" /> Rescue Coordinator</h3>
          
          <div style={{ width: '100%', height: '180px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--glass-border)', position: 'relative', marginBottom: '1.5rem', overflow: 'hidden' }}>
            {/* Mock Map Background Grid */}
            <div style={{ width: '100%', height: '100%', opacity: 0.1, backgroundImage: 'linear-gradient(var(--accent-primary) 1px, transparent 1px), linear-gradient(90deg, var(--accent-primary) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            
            {/* Mock Responder Nodes */}
            <div style={{ position: 'absolute', top: '40%', left: '30%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
               <div style={{ width: 24, height: 24, background: 'rgba(59, 130, 246, 0.3)', border: '2px solid var(--info)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />
               </div>
               <span style={{ fontSize: '0.6rem', color: 'var(--info)', marginTop: 4, fontWeight: 'bold' }}>W001</span>
            </div>
            
            <div style={{ position: 'absolute', top: '25%', left: '70%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
               <div style={{ width: 24, height: 24, background: 'rgba(59, 130, 246, 0.3)', border: '2px solid var(--info)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />
               </div>
               <span style={{ fontSize: '0.6rem', color: 'var(--info)', marginTop: 4, fontWeight: 'bold' }}>W002</span>
            </div>

            <div style={{ position: 'absolute', top: '65%', left: '60%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
               <div style={{ width: 24, height: 24, background: 'rgba(59, 130, 246, 0.3)', border: '2px solid var(--info)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />
               </div>
               <span style={{ fontSize: '0.6rem', color: 'var(--info)', marginTop: 4, fontWeight: 'bold' }}>W003</span>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Nearest Responders</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            {mockResponders.map((r) => (
               <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                      {r.id}
                    </div>
                    <span>{r.name} <span style={{ color: 'var(--text-muted)' }}>{r.code}</span></span>
                 </div>
                 <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>{r.time}</span>
               </div>
            ))}
          </div>

          {/* Action Buttons purely isolated to Supervisor mode */}
          {isSupervisor ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
               <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--accent-primary)', borderRadius: '6px' }} onClick={() => alert("Rescue Team Dispatched!")}>
                 <Send size={16} /> Send Rescue Team
               </button>
               <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--danger)', borderRadius: '6px', color: '#fff' }} onClick={() => alert("Evacuation Protocol Triggered!")}>
                 <LogOut size={16} /> Evacuate Site
               </button>
            </div>
          ) : (
            <div style={{ marginTop: '1.5rem', padding: '0.75rem', textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
               <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Emergency Commands are restricted to Supervisors.</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Panel: Incident Log */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={20} color="var(--accent-primary)" /> Incident Log</h3>
          <button style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' }} 
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
            Export Log
          </button>
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', textAlign: 'left', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.75rem 0', fontWeight: 500 }}>TIME</th>
                <th style={{ padding: '0.75rem 0', fontWeight: 500 }}>SITE</th>
                <th style={{ padding: '0.75rem 0', fontWeight: 500 }}>EVENT</th>
                <th style={{ padding: '0.75rem 0', fontWeight: 500 }}>SEVERITY</th>
              </tr>
            </thead>
            <tbody>
              {mockIncidents.map((inc, i) => {
                 let color = 'var(--info)';
                 let Icon = Info;
                 if (inc.severity === 'WARNING') { color = 'var(--warning)'; Icon = AlertTriangle; }
                 if (inc.severity === 'SUCCESS') { color = 'var(--success)'; Icon = CheckCircle; }
                 
                 return (
                   <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                     <td style={{ padding: '1rem 0', color: 'var(--text-muted)' }}>{inc.time}</td>
                     <td style={{ padding: '1rem 0' }}>{inc.site}</td>
                     <td style={{ padding: '1rem 0' }}>{inc.event}</td>
                     <td style={{ padding: '1rem 0' }}>
                       <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: color, fontSize: '0.75rem', fontWeight: 'bold' }}>
                         <Icon size={14} /> {inc.severity}
                       </div>
                     </td>
                   </tr>
                 );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Tier4;
