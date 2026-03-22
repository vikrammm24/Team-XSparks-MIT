import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useDatabase } from '../context/DatabaseContext';
import * as faceapi from 'face-api.js';

const Tier1: React.FC = () => {
  const { user } = useAuth();
  const { tier1Status, setTier1Status } = useApp();
  const { db } = useDatabase();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // AI States
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [identifiedWorker, setIdentifiedWorker] = useState<{name: string, id: number} | null>(null);
  const [debugDistance, setDebugDistance] = useState<number | null>(null);
  
  // PPE States
  const [helmetDetected, setHelmetDetected] = useState(false);
  const [vestDetected, setVestDetected] = useState(false);
  
  const [isYoloAnalyzing, setIsYoloAnalyzing] = useState(false);
  const [yoloDetections, setYoloDetections] = useState<any[]>([]);
  /** True after at least one successful /verify_helmet response while worker is identified (avoids red flash before first check). */
  const [ppeCheckComplete, setPpeCheckComplete] = useState(false);
  const lastYoloCall = useRef<number>(0);
  /** Require two consecutive polls true before showing "verified" (cuts single-frame model hallucinations). */
  const prevHelmetPoll = useRef<boolean | null>(null);
  const prevVestPoll = useRef<boolean | null>(null);

  useEffect(() => {
    if (user?.role !== 'Supervisor') return;
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setModelsLoaded(true);
      } catch(err) {
        console.error("AI Models failed to load:", err);
      }
    };
    loadModels();
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'Supervisor' || !isScanning) return;
    
    let interval: NodeJS.Timeout;
    
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        console.warn("Camera access denied or unavailable. Fallback random mock enabled.", e);
      }
    };
    startVideo();

    const scanFace = async () => {
      if (!videoRef.current) return;

      const context = canvasRef.current?.getContext('2d');
      if (canvasRef.current && context && videoRef.current.videoWidth > 0) {
         canvasRef.current.width = videoRef.current.videoWidth;
         canvasRef.current.height = videoRef.current.videoHeight;
         context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      if (db) {
        // Build Matcher from SQLite
        const matchers: faceapi.LabeledFaceDescriptors[] = [];
        const res = db.exec("SELECT id, name, face_descriptors FROM Workers WHERE face_descriptors IS NOT NULL");
        if (res.length > 0) {
          res[0].values.forEach(row => {
            const [id, name, descStr] = row;
            try {
              const arrs = JSON.parse(descStr as string);
              const descriptors = arrs.map((a: string) => new Float32Array(JSON.parse(a)));
              matchers.push(new faceapi.LabeledFaceDescriptors(`${name}|${id}`, descriptors));
            } catch(e) {}
          });
        }

        const faceMatcher = matchers.length > 0 ? new faceapi.FaceMatcher(matchers, 0.85) : null;

        let detectedDescriptor: Float32Array | null = null;

        if (videoRef.current.videoWidth > 0) {
          const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                                         .withFaceLandmarks()
                                         .withFaceDescriptor();

          if (detection && canvasRef.current) {
             detectedDescriptor = detection.descriptor;
             const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
             const resizedResult = faceapi.resizeResults(detection, dims);
             faceapi.draw.drawDetections(canvasRef.current, resizedResult);
          }
        } else if (matchers.length > 0 && Math.random() > 0.3) {
          detectedDescriptor = matchers[0].descriptors[0];
        }

        if (detectedDescriptor && faceMatcher) {
           const bestMatch = faceMatcher.findBestMatch(detectedDescriptor);
           setDebugDistance(bestMatch.distance);

           if (bestMatch.label !== 'unknown') {
              const [matchedName, matchedId] = bestMatch.label.split('|');
              setIdentifiedWorker({ name: matchedName, id: parseInt(matchedId) });
           } else {
              setIdentifiedWorker(null);
           }
        } else {
           setIdentifiedWorker(null);
           setDebugDistance(null);
        }
      } else {
        setIdentifiedWorker(null);
        setDebugDistance(null);
      }

      // Trained YOLO (ppe_server / best.pt): run on live feed while scanning — independent of identity
      if (videoRef.current.videoWidth > 0) {
        const now = Date.now();
        if (now - lastYoloCall.current > 4000) {
          lastYoloCall.current = now;
          analyzeHelmetWithYolo();
        }
      }
    };

    const analyzeHelmetWithYolo = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      setIsYoloAnalyzing(true);
      try {
        const snapCanvas = document.createElement('canvas');
        snapCanvas.width = videoRef.current.videoWidth || 640;
        snapCanvas.height = videoRef.current.videoHeight || 480;
        snapCanvas.getContext('2d')?.drawImage(videoRef.current, 0, 0, snapCanvas.width, snapCanvas.height);
        
        const base64Image = snapCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];

        let face_box: { x: number; y: number; width: number; height: number } | undefined;
        try {
          if (modelsLoaded && videoRef.current.videoWidth > 0) {
            const fd = await faceapi.detectSingleFace(
              videoRef.current,
              new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })
            );
            if (fd) {
              const b = fd.box;
              const vw = videoRef.current.videoWidth;
              const vh = videoRef.current.videoHeight;
              face_box = {
                x: b.x / vw,
                y: b.y / vh,
                width: b.width / vw,
                height: b.height / vh,
              };
            }
          }
        } catch {
          /* optional hint for server */
        }

        const response = await fetch(`http://localhost:5000/verify_helmet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image, ...(face_box ? { face_box } : {}) })
        });

        if (response.ok) {
           const data = await response.json();
           if (!data.error) {
              const hPoll = !!data.helmet;
              const vPoll = !!data.vest;
              setHelmetDetected(hPoll && prevHelmetPoll.current === true);
              setVestDetected(vPoll && prevVestPoll.current === true);
              prevHelmetPoll.current = hPoll;
              prevVestPoll.current = vPoll;
              setYoloDetections(data.detections || []);
              setPpeCheckComplete(true);
           } else {
              console.warn("YOLO Verification Notice:", data.error);
              setYoloDetections([]);
           }
        }
      } catch (err) {
        console.error("Local YOLO Vision API Error:", err);
        setYoloDetections([]);
      } finally {
        setIsYoloAnalyzing(false);
      }
    };

    interval = setInterval(scanFace, 2000);

    return () => {
      clearInterval(interval);
      if (videoRef.current?.srcObject) {
         const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
         tracks.forEach(t => t.stop());
      }
    };
  }, [user, isScanning, db, modelsLoaded]);

  // Visual Overlay Effect (Drawing Loop)
  useEffect(() => {
    const drawDetections = () => {
       if (!canvasRef.current || !videoRef.current) return;
       const ctx = canvasRef.current.getContext('2d');
       if (!ctx) return;

       // Clear canvas for fresh draw
       ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

       // YOLO boxes: green only when API confirms that gear; red when this class seen but not verified
       if (!ppeCheckComplete || isYoloAnalyzing) return;

       yoloDetections.forEach(det => {
          const [xmin, ymin, xmax, ymax] = det.box;
          const isHelmet = det.class_id === 0;
          const isJacket = det.class_id === 1;
          const known = isHelmet || isJacket;
          const verified = isHelmet ? helmetDetected : isJacket ? vestDetected : false;
          const stroke = !known ? '#94a3b8' : verified ? '#22c55e' : '#ef4444';
          const labelBg = !known
            ? 'rgba(148, 163, 184, 0.9)'
            : verified
              ? 'rgba(34, 197, 94, 0.95)'
              : 'rgba(239, 68, 68, 0.95)';
          const labelText = !known ? '#0f172a' : verified ? '#052e16' : '#450a0a';

          ctx.strokeStyle = stroke;
          ctx.lineWidth = 3;
          ctx.strokeRect(xmin, ymin, xmax - xmin, ymax - ymin);

          const label = isHelmet
            ? verified
              ? 'Helmet verified'
              : 'Helmet not verified'
            : isJacket
              ? verified
                ? 'Jacket verified'
                : 'Jacket not verified'
              : String(det.label || 'Detection');
          ctx.font = 'bold 16px system-ui, sans-serif';
          const textWidth = ctx.measureText(label).width;
          const pad = 8;
          const lh = 26;
          ctx.fillStyle = labelBg;
          ctx.fillRect(xmin, ymin - lh - 4, textWidth + pad * 2, lh);
          ctx.fillStyle = labelText;
          ctx.fillText(label, xmin + pad, ymin - 10);
       });
    };

    const renderLoop = requestAnimationFrame(function loop() {
       drawDetections();
       requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(renderLoop);
  }, [yoloDetections, ppeCheckComplete, isYoloAnalyzing, helmetDetected, vestDetected]);

  useEffect(() => {
    if (!isScanning) {
      setPpeCheckComplete(false);
      setHelmetDetected(false);
      setVestDetected(false);
      setYoloDetections([]);
      setIsYoloAnalyzing(false);
      prevHelmetPoll.current = null;
      prevVestPoll.current = null;
    }
  }, [isScanning]);

  // Automated Assessment & Verification Pipeline
  useEffect(() => {
    if (identifiedWorker) {
      if (helmetDetected && vestDetected) {
        // Condition strictly met: Verified & Auto-Issue
        setTier1Status('Verified: Token Issued');
        if (db) {
            // Direct to DB insertion handled autonomously
          db.run(`UPDATE Workers SET is_verified = 1, digital_token = 'AUTO-TOKEN-${identifiedWorker.id}' WHERE id = ?`, [identifiedWorker.id]);
        }
      } else {
        // Face found but Gear missing
        setTier1Status('Not Verified');
      }
    } else {
      // Nothing found / Reset
      setTier1Status('Pending Scan');
    }
  }, [identifiedWorker, helmetDetected, vestDetected, db, setTier1Status]);

  const ppeStatusBoxStyle = (idle: boolean, pending: boolean, ok: boolean): React.CSSProperties => {
    if (idle) {
      return {
        flex: '1 1 140px',
        minWidth: 120,
        padding: '12px 14px',
        borderRadius: 10,
        border: '3px solid rgba(100, 116, 139, 0.45)',
        background: 'rgba(30, 41, 59, 0.25)',
        color: 'var(--text-muted)',
        fontWeight: 700,
        fontSize: '0.8rem',
        textAlign: 'center',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        lineHeight: 1.35,
      };
    }
    const border = pending ? 'rgba(148, 163, 184, 0.95)' : ok ? '#22c55e' : '#ef4444';
    const bg = pending ? 'rgba(148, 163, 184, 0.12)' : ok ? 'rgba(34, 197, 94, 0.14)' : 'rgba(239, 68, 68, 0.14)';
    const color = pending ? 'var(--text-secondary)' : ok ? '#22c55e' : '#ef4444';
    return {
      flex: '1 1 140px',
      minWidth: 120,
      padding: '12px 14px',
      borderRadius: 10,
      border: `3px solid ${border}`,
      background: bg,
      color,
      fontWeight: 800,
      fontSize: '0.8rem',
      textAlign: 'center',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      lineHeight: 1.35,
    };
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const isVerified = status === 'Verified: Token Issued';
    const isNotVerified = status === 'Not Verified';
    
    let bg = 'rgba(245, 158, 11, 0.2)'; // pending
    let color = 'var(--warning)';
    if (isVerified) { bg = 'rgba(16, 185, 129, 0.2)'; color = 'var(--success)'; }
    if (isNotVerified) { bg = 'rgba(239, 68, 68, 0.2)'; color = 'var(--danger)'; }

    return (
      <div style={{ 
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.5rem 1rem', borderRadius: '50px',
        background: bg, color: color, border: `1px solid ${color}`,
        fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem'
      }}>
        <div className={isVerified ? 'status-pulse-green' : 'status-pulse'} style={{ 
          width: 8, height: 8, borderRadius: '50%', background: color 
        }} />
        {status}
      </div>
    );
  };

  const ppePending = !ppeCheckComplete || isYoloAnalyzing;
  const ppeIdle = !isScanning;

  if (user?.role === 'Worker') {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '2rem' }}>Digital Gatekeeper</h1>
        
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: '120px', height: '120px', background: 'var(--bg-tertiary)', borderRadius: '50%', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', border: '2px solid var(--border-color)' }}>
            👷
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>{user.name}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>ID: {user.worker_id_code}</p>
          
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Entry Gateway Status
            </div>
            <StatusBadge status={tier1Status} />
          </div>

          {tier1Status === 'Verified: Token Issued' && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--success)', borderStyle: 'dashed', marginTop: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--success)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Clearance Token Required for Entry:</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>AUTO-TOKEN-{user.id || 'XXX'}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Tier 1: Digital Gatekeeper</h1>
        <StatusBadge status={tier1Status} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Live Automatch Camera Feed</span>
            <span style={{ fontSize: '0.8rem', color: isScanning ? 'var(--danger)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: 8, height: 8, background: isScanning ? 'var(--danger)' : 'transparent', borderRadius: '50%' }} /> REC</span>
          </div>
          <div style={{ height: '400px', background: '#000', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            
            {!modelsLoaded ? (
               <p style={{ color: 'var(--text-muted)', zIndex: 10 }}>Loading AI Neural Networks from SQLite...</p>
            ) : !isScanning ? (
               <p style={{ color: 'var(--text-muted)', zIndex: 10 }}>Camera Standby. Turn ON "AI Diagnostics".</p>
            ) : null}

            <video ref={videoRef} autoPlay muted playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: isScanning ? 1 : 0 }} />
            <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

            {isScanning && (
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  right: 12,
                  display: 'flex',
                  gap: 10,
                  zIndex: 15,
                  pointerEvents: 'none',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                <div style={ppeStatusBoxStyle(false, ppePending, helmetDetected)}>
                  {ppePending ? 'Helmet — checking…' : helmetDetected ? 'Helmet verified' : 'Helmet not verified'}
                </div>
                <div style={ppeStatusBoxStyle(false, ppePending, vestDetected)}>
                  {ppePending ? 'Jacket — checking…' : vestDetected ? 'Jacket verified' : 'Jacket not verified'}
                </div>
              </div>
            )}

            {/* Simulated Data Overlay inside the feed */}
            {isScanning && (
               <div style={{ position: 'absolute', bottom: '10%', left: '5%', background: 'rgba(0,0,0,0.7)', padding: '0.5rem', borderRadius: '8px', zIndex: 10 }}>
                  {identifiedWorker ? (
                    <div style={{ color: 'var(--success)' }}>
                       <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>✅ IDENTITY SECURED: {identifiedWorker.name}</div>
                       <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Gear Validation Triggered (Dist: {debugDistance?.toFixed(2)})</div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--warning)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                       ⚠️ IDENTITY: SCANNING DATABASE...
                       {debugDistance !== null && ` (Closest Dist: ${debugDistance?.toFixed(2)})`}
                    </div>
                  )}
               </div>
            )}
            
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Automated AI Assessment</h3>
          
          <label style={{ display: 'flex', gap: '1rem', alignItems: 'center', cursor: 'pointer' }}>
            <div className={`toggle-switch ${isScanning ? 'active' : ''}`} style={{ background: isScanning ? 'var(--success)' : 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', width: 44, height: 24, borderRadius: 12, position: 'relative' }}>
              <div style={{ width: 18, height: 18, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: isScanning ? 22 : 2, transition: '0.2s' }} />
            </div>
            <input type="checkbox" checked={isScanning} onChange={e => setIsScanning(e.target.checked)} style={{ display: 'none' }} />
            <span style={{ flex: 1, fontWeight: 'bold', color: isScanning ? 'var(--success)' : 'var(--text-primary)' }}>Activate Deep-Scan Automatch</span>
          </label>

          <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-primary)' }}>
             <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong>Behavior:</strong> Automatically identifies faces against SQLite mathematical fingerprints. If positively mapped, automatically snapshots the frame over to <strong>Local Python YOLO Server</strong> to authorize protective equipment!
             </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'stretch', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>⛑️</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Safety helmet (YOLO)</div>
                <div style={{ ...ppeStatusBoxStyle(ppeIdle, ppeIdle ? false : ppePending, helmetDetected), flex: 'none', width: '100%', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  {ppeIdle ? 'Turn on scan' : ppePending ? 'Checking…' : helmetDetected ? 'Helmet verified' : 'Helmet not verified'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'stretch', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🦺</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reflective jacket (YOLO)</div>
                <div style={{ ...ppeStatusBoxStyle(ppeIdle, ppeIdle ? false : ppePending, vestDetected), flex: 'none', width: '100%', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  {ppeIdle ? 'Turn on scan' : ppePending ? 'Checking…' : vestDetected ? 'Jacket verified' : 'Jacket not verified'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Autonomous Gate Node</span>
              {tier1Status === 'Verified: Token Issued' ? <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>UNLOCKED</span> : <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>LOCKED</span>}
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
               <em>Zero-action autonomous token issuance algorithm is LIVE.</em>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tier1;
