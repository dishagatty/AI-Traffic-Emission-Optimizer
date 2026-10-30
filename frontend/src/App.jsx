import { useEffect, useRef, useState } from 'react';
import TrafficMap from './components/TrafficMap';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const roads = [
  { name: 'KRR Road', level: 'Severe', volume: 916, vc: 1.404, speed: 26.05, delay: 1.673 },
  { name: 'KS Rao Road', level: 'Moderate', volume: 3352, vc: 0.602, speed: null, delay: null },
  { name: 'KS Rao Road near City Point', level: 'Severe', volume: 3295, vc: 1.227, speed: null, delay: null },
  { name: 'Balmatta Road two way', level: 'Severe', volume: 502, vc: 1.976, speed: null, delay: null },
  { name: 'Mother Theresa Road', level: 'Not shown', volume: null, vc: null, speed: null, delay: null },
  { name: 'Attavar Road', level: 'Not shown', volume: null, vc: null, speed: null, delay: null },
  { name: 'Bunts Hostel Road', level: 'Not shown', volume: null, vc: null, speed: null, delay: null },
]
const adminTabs = [['over','Overview'],['map','Live Map'],['road','Road Details'],['info','Traffic Info'],['ai','AI Prediction'],['accounts','Register Details']];
const userTabs = [['map','Map'],['road','Road Details'],['info','Traffic Info']];
const subTabs = [['shap','SHAP'],['what','What-if'],['opt','Optimizer'],['emi','Emissions'],['rep','Reports']];

function Header({ setView }) {
  return <header><div className="logo" onClick={() => setView('home')} role="button" tabIndex="0"><i>↗</i> FlowCast <span style={{color:'var(--pri2)'}}>Mangaluru</span></div><nav id="nav"><a href="#top" onClick={e=>{e.preventDefault();setView('home')}}>Home</a><a href="#about" onClick={e=>{e.preventDefault();setView('home');setTimeout(()=>document.getElementById('about')?.scrollIntoView({behavior:'smooth'}),0)}}>About Us</a><a href="#contact" onClick={e=>{e.preventDefault();setView('home');setTimeout(()=>document.getElementById('contact')?.scrollIntoView({behavior:'smooth'}),0)}}>Contact</a><button className="pill cta" onClick={()=>setView('login')}>Access</button></nav></header>;
}
function Landing({ setView }) {
 return <><div className="view on"><div className="stage" id="top"><div className="hcard"><span className="tag">● Decision support · Mangaluru</span><h1>Find meaning in <span>movement</span>.</h1><p className="lead">Explore selected Mangaluru roads, understand congestion, and test traffic interventions virtually before implementation.</p><p style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:0}}><button className="btn" onClick={()=>setView('login')}>Get Started</button><button className="btn ghost" onClick={()=>document.getElementById('about')?.scrollIntoView({behavior:'smooth'})}>Learn more</button></p></div><div className="hm"><div className="hero-map"><div className="map-road r1"/><div className="map-road r2"/><div className="map-road r3"/><div className="map-road r4"/><span className="pin p1">KRR Road</span><span className="pin p2">KS Rao Road</span><span className="pin p3">Balmatta</span><div className="map-note"><b>7 selected roads</b><span>Historical scenarios + live speed lookup</span></div></div></div></div><section className="s" id="about"><h2>About us</h2><p className="lead" style={{marginBottom:28}}>An analytical decision-support platform for traffic administrators. It evaluates options and supports human decisions; it does not directly control physical infrastructure.</p><div className="grid g3"><div className="card hv"><div className="ico">📡</div><h3>Real-time insight</h3><p>Check current speed and travel-time information where the live traffic service responds.</p></div><div className="card hv"><div className="ico">🧠</div><h3>Explainable AI</h3><p>Review congestion predictions and feature contributions when model and SHAP outputs are available.</p></div><div className="card hv"><div className="ico">🌿</div><h3>Emission-aware</h3><p>Compare baseline and simulated traffic interventions using the project’s SUMO results.</p></div></div></section><section className="s" id="contact"><h2>Contact</h2><p className="lead">AI Urban Traffic &amp; Emission Intervention Optimizer · MCA project<br/>Mangaluru, Karnataka</p></section></div></>;
}

function authErrorMessage(data, fallback) {
  if (typeof data?.detail === 'string') return data.detail;
  if (Array.isArray(data?.detail)) {
    return data.detail.map((item) => item.msg).filter(Boolean).join(' ') || fallback;
  }
  return fallback;
}

function Login({ onEnter, setView }) {
  const [mode, setMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const requestInFlight = useRef(false);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (requestInFlight.current) return;
    setError('');
    setSuccess('');

    const normalizedEmail = email.trim();
    const normalizedName = fullName.trim();
    if (mode === 'register') {
      if (normalizedName.length < 2 || normalizedName.length > 100) {
        setError('Enter your full name (2–100 characters).');
        return;
      }
      if (password.length < 8 || password.length > 128) {
        setError('Password must be between 8 and 128 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('The passwords do not match.');
        return;
      }
    } else if (!password || password.length > 128) {
      setError('Enter a password of no more than 128 characters.');
      return;
    }

    requestInFlight.current = true;
    setBusy(true);

    try {
      const registering = mode === 'register';
      const response = await fetch(`${API_BASE_URL}/auth/${registering ? 'register' : 'login'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registering
          ? { email: normalizedEmail, full_name: normalizedName, password }
          : { email: normalizedEmail, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(authErrorMessage(
          data,
          registering ? 'Account creation failed. Please try again.' : 'Login failed. Please check your credentials.'
        ));
      }

      if (registering) {
        if (!data.email || !data.id) {
          throw new Error('The server returned an incomplete account response.');
        }
        setPassword('');
        setConfirmPassword('');
        setMode('login');
        setSuccess('Account created successfully. Sign in with your new account.');
      } else {
        if (!data.access_token || !data.user || !['user', 'admin'].includes(data.user.role)) {
          throw new Error('Invalid authentication response from server.');
        }

        // The authenticated backend response determines dashboard access.
        sessionStorage.setItem('access_token', data.access_token);
        sessionStorage.setItem('current_user', JSON.stringify(data.user));
        onEnter(data.user.role);
      }
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot reach the backend. Make sure FastAPI is running.'
          : err.message
      );
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="view on">
      <section className="s login-section">
        <div className="auth-shell">
          <div className="auth-intro">
            <a href="#home" onClick={(e) => { e.preventDefault(); setView('home'); }}>
              ← Back to home
            </a>
            <span className="tag">● Secure platform access</span>
            <h2>{mode === 'register' ? 'Create your account' : 'Welcome back'}</h2>
            <p className="lead">
              {mode === 'register'
                ? 'Create an account to explore Mangaluru traffic insights and intervention tools.'
                : 'Sign in to continue. Your verified account role determines your dashboard.'}
            </p>
            <div className="auth-note">
              <b>Traffic insight, thoughtfully delivered.</b>
              <span>Explore selected roads, congestion information, and simulation-based interventions.</span>
            </div>
          </div>

          <form className="card auth-form" onSubmit={handleSubmit}>
            <div className="ico">{mode === 'register' ? '✨' : '🔐'}</div>
            <h3>{mode === 'register' ? 'Create account' : 'Sign in'}</h3>
            <p className="sub">
              {mode === 'register' ? 'All fields are required.' : 'Use your registered email and password.'}
            </p>

            {mode === 'register' && <>
              <label htmlFor="register-name">Full name</label>
              <input
                id="register-name"
                className="f"
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
              />
            </>}

            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="f"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className="f"
              type="password"
              placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={mode === 'register' ? 8 : undefined}
              maxLength={128}
              required
            />

            {mode === 'register' && <>
              <label htmlFor="register-confirm">Confirm password</label>
              <input
                id="register-confirm"
                className="f"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                maxLength={128}
                required
              />
            </>}

            {error && <p className="auth-message error" role="alert">{error}</p>}
            {success && <p className="auth-message success" role="status">{success}</p>}

            <button className="btn auth-submit" type="submit" disabled={busy}>
              {busy
                ? (mode === 'register' ? 'Creating account…' : 'Signing in…')
                : (mode === 'register' ? 'Create account →' : 'Sign in →')}
            </button>

            <p className="auth-switch">
              {mode === 'register' ? 'Already have an account?' : 'New to FlowCast?'}
              {' '}
              <button type="button" disabled={busy} onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}>
                {mode === 'register' ? 'Sign in' : 'Create an account'}
              </button>
            </p>
            {mode === 'register' && <p className="sub auth-role-note">New accounts receive standard user access. Access roles are managed by the server.</p>}
          </form>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, note, tone='' }) { return <div className="card hv"><div className="sub">{label}</div><div className="stat">{value}</div><div className={`sub ${tone}`}>{note}</div></div>; }
function Bar({ label, value, max=100, color='var(--pri)' }) { return <div className="row"><span style={{width:'36%'}}>{label}</span><div className="meter"><i style={{width:`${Math.min(100,value/max*100)}%`,background:color}}/></div><b>{value}</b></div>; }
function Overview() {
 return <div className="pg"><div className="grid g4" style={{marginBottom:18}}><Stat label="Selected roads" value="7" note="Mangaluru road scenarios"/><Stat label="Traffic scenarios" value="5,000" note="Processed dataset"/><Stat label="Severe scenarios" value="2,928" note="Historical dataset class" tone="up"/><Stat label="Clean CO₂ records" value="175,200" note="Processed emission records"/></div><div className="grid overview-grid"><div className="card"><h3>City congestion index · scenario dataset</h3><p className="sub">Historical model dataset distribution; not live citywide counts.</p><div className="chart-bars">{[['Severe',2928,'#ef4444'],['Moderate',938,'#f59e0b'],['Low',617,'#16a34a'],['High',517,'#f97316']].map(([l,v,c])=><div className="chart-col" key={l}><div className="chart-bar" style={{height:`${v/2928*145}px`,background:c}}/><b>{v.toLocaleString('en-IN')}</b><span>{l}</span></div>)}</div></div><div className="card"><h3>Busiest corridors</h3>{roads.slice(0,4).map((r,i)=><div className="row" key={r.name}><span>{i+1}. {r.name}</span><b className={r.level==='Severe'?'up':''}>{r.level}</b></div>)}</div></div><div className="card" style={{marginTop:18}}><h3>Recommended intervention · SUMO simulation</h3><p className="lead">KS Rao Road near City Point — Intervention 1 was the best-performing tested option in the current simulation comparison.</p><div className="grid g3"><div className="signal"><span>North–South green</span><b>45 sec</b></div><div className="signal"><span>East–West green</span><b>39 sec</b></div><div className="signal"><span>Optimization score</span><b>100</b></div></div><div className="grid g3" style={{marginTop:14}}><Stat label="Travel time" value="−12.71%" note="vs simulated baseline" tone="dn"/><Stat label="Waiting time" value="−100%" note="vs simulated baseline" tone="dn"/><Stat label="CO₂ emissions" value="−10.62%" note="vs simulated baseline" tone="dn"/></div><p className="sub" style={{marginTop:12}}>These are SUMO simulation comparisons, not real-world measured savings.</p></div></div>;
}
function RoadDetails() { const [selected,setSelected]=useState(roads[0].name); const road=roads.find(r=>r.name===selected)||roads[0]; return <div className="pg"><div className="grid road-grid"><div className="card"><h3>Road details</h3><label>Corridor</label><select className="f" value={selected} onChange={e=>setSelected(e.target.value)}>{roads.map(r=><option key={r.name}>{r.name}</option>)}</select><p className="sub" style={{marginTop:12}}>Values below are from the processed scenario dataset and should not be interpreted as live readings.</p></div><div className="card"><h3>{road.name}</h3><div className="grid g3"><Stat label="Scenario traffic volume" value={road.volume==null?'—':road.volume.toLocaleString('en-IN')} note="Scenario record"/><Stat label="V/C ratio" value={road.vc==null?'—':road.vc.toFixed(3)} note="Volume / capacity"/><Stat label="Estimated speed" value={road.speed==null?'—':`${road.speed} km/h`} note="Processed scenario"/></div><div style={{marginTop:18}}>{road.delay==null?<div className="row"><span>Delay index</span><b>—</b></div>:<Bar label="Delay index" value={road.delay} max={2} color="#f59e0b"/>}<div className="row"><span>Congestion class</span><b className={road.level==='Severe'?'up':''}>{road.level}</b></div></div></div></div></div>; }
function TrafficInfo() { return <div className="pg"><div className="grid info-grid"><div className="card"><h3>Live traffic info</h3><p className="lead">Select a road marker on the Live Map to request current speed and travel-time data from the connected live traffic service.</p><p>Live fields may include current speed, free-flow speed, current travel time, free-flow travel time, confidence and road closure.</p><p className="sub">Traffic volume, PCU, V/C ratio, delay index and pollutant emissions are not provided directly by the live speed endpoint; those remain historical, modelled or simulated project values.</p></div><div className="grid"><div className="card hv"><div className="ico">🕗</div><h3>Best time to travel</h3><p>Use live speed and travel-time readings to compare conditions before choosing a travel time.</p></div><div className="card hv"><div className="ico">⚠️</div><h3>Congestion caution</h3><p>Check the selected road’s live status where data is available; historical congestion classes are scenario-based.</p></div><div className="card hv"><div className="ico">🛣️</div><h3>Alternate route</h3><p>Use the road map to compare selected corridors. Route recommendations require a connected routing source.</p></div></div></div></div>; }
function RegisterDetails() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const token = sessionStorage.getItem('access_token');

    const loadAccounts = async () => {
      setLoading(true);
      setError('');

      if (!token) {
        setError('Your session is missing. Please sign in again.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/users`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(authErrorMessage(data, 'Could not load registered accounts.'));
        }
        if (!Array.isArray(data)) {
          throw new Error('The server returned an invalid account list.');
        }

        setAccounts(data);
      } catch (requestError) {
        if (requestError.name === 'AbortError') return;
        setError(requestError instanceof TypeError
          ? 'Cannot reach the backend. Make sure FastAPI is running.'
          : requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadAccounts();
    return () => controller.abort();
  }, [reload]);

  const formatCreatedAt = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '—'
      : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
  };

  return (
    <div className="pg accounts-page">
      <div className="accounts-heading">
        <div>
          <h2>Register Details</h2>
          <p className="sub">Registered accounts and access status.</p>
        </div>
        {!loading && !error && (
          <span className="tag">{accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}</span>
        )}
      </div>

      {loading && <div className="card accounts-state" role="status">Loading registered accounts…</div>}

      {!loading && error && (
        <div className="card accounts-state" role="alert">
          <p className="auth-message error">{error}</p>
          <button className="btn ghost" type="button" onClick={() => setReload((value) => value + 1)}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && accounts.length === 0 && (
        <div className="card accounts-state">No registered accounts were found.</div>
      )}

      {!loading && !error && accounts.length > 0 && (
        <div className="card accounts-card">
          <div className="accounts-table-wrap">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Registered</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td data-label="ID">{account.id}</td>
                    <td data-label="Name">{account.full_name}</td>
                    <td data-label="Email">{account.email}</td>
                    <td data-label="Role"><span className="account-role">{account.role}</span></td>
                    <td data-label="Status">
                      <span className={`account-status ${account.is_active ? 'active' : 'inactive'}`}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td data-label="Registered">{formatCreatedAt(account.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="account-cards">
            {accounts.map((account) => (
              <article className="account-item" key={account.id}>
                <div className="account-item-heading">
                  <h3>{account.full_name}</h3>
                  <span className="account-role">{account.role}</span>
                </div>
                <dl>
                  <div><dt>ID</dt><dd>{account.id}</dd></div>
                  <div><dt>Email</dt><dd>{account.email}</dd></div>
                  <div><dt>Status</dt><dd><span className={`account-status ${account.is_active ? 'active' : 'inactive'}`}>{account.is_active ? 'Active' : 'Inactive'}</span></dd></div>
                  <div><dt>Registered</dt><dd>{formatCreatedAt(account.created_at)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function AIPanel() {
  const [road, setRoad] = useState(roads[2].name);
  const [sub, setSub] = useState('shap');
  const [hour, setHour] = useState(8);
  const [intervention, setIntervention] = useState('Signal retiming');
  const [message, setMessage] = useState('Choose a road and review the available analysis.');
  const [busy, setBusy] = useState(false);
  const current = roads.find(r => r.name === road) || roads[0];
  const runPrediction = async () => {
    setBusy(true);
    setMessage('Requesting prediction from backend…');
    try {
      const res = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ road_name: road, Traffic_Volume: current.volume, VC_Ratio: current.vc, Estimated_Speed_kmph: current.speed, Delay_Index: current.delay })
      });
      if (!res.ok) throw new Error(`Prediction endpoint returned ${res.status}`);
      const data = await res.json();
      setMessage(`Backend response: ${JSON.stringify(data)}`);
    } catch (e) {
      setMessage(`Prediction endpoint could not be used (${e.message}). Confirm the backend /predict request schema in /docs; displayed road values remain historical scenario data.`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="pg">
      <div className="card ai-controls">
        <div><label>Corridor</label><select className="f" value={road} onChange={e => setRoad(e.target.value)}>{roads.map(r => <option key={r.name}>{r.name}</option>)}</select></div>
        <div><label>Scenario hour</label><input className="f" type="range" min="0" max="23" value={hour} onChange={e => setHour(Number(e.target.value))} /><b>{String(hour).padStart(2, '0')}:00</b></div>
        <button className="btn" onClick={runPrediction} disabled={busy}>{busy ? 'Checking…' : 'Run AI prediction'}</button>
      </div>
      <div className="subnav">{subTabs.map(([id, label]) => <button key={id} className={`pill ${sub === id ? 'on' : ''}`} onClick={() => setSub(id)}>{label}</button>)}</div>
      {sub === 'shap' && <div className="card">
        <h3>SHAP · what drives the prediction</h3>
        <p className="sub">SHAP values are not yet connected to this view. These are the feature names used by the project model, not computed contribution scores.</p>
        <div className="feature-list">{['Traffic_Volume', 'Average_Hourly_Vehicle_Count', 'PCU', 'Peak_Hour_Volume', 'Peak_Hour_PCU', 'Road_Capacity_PCU', 'VC_Ratio', 'Estimated_Speed_kmph', 'Delay_Index'].map(f => <span className="feature-chip" key={f}>{f}</span>)}</div>
      </div>}
      {sub === 'what' && <div className="grid what-grid">
        <div className="card"><h3>What-if scenario</h3><label>Intervention</label><select className="f" value={intervention} onChange={e => setIntervention(e.target.value)}><option>Signal retiming</option><option>Dedicated bus lane</option><option>One-way flow</option></select><label>Start hour: {String(hour).padStart(2, '0')}:00</label><input className="f" type="range" min="0" max="23" value={hour} onChange={e => setHour(Number(e.target.value))} /><p className="sub">This control records a what-if choice. A new forecast requires the backend simulation/prediction endpoint.</p></div>
        <div className="card"><h3>Scenario preview · illustrative only</h3><p>{message}</p><div className="chart-bars">{Array.from({ length: 8 }, (_, i) => <div className="chart-col" key={i}><div className="chart-bar" style={{ height: `${45 + ((i + hour) % 5) * 17}px`, background: '#2563eb' }} /><b>{String((hour + i) % 24).padStart(2, '0')}:00</b><span>Preview only</span></div>)}</div></div>
      </div>}
      {sub === 'opt' && <div className="card"><h3>Optimizer · ranked interventions</h3><p className="sub">Ranked result from the currently available SUMO comparison.</p><div className="row"><b>1. Signal retiming · 45s / 39s</b><span className="dn">Recommended</span></div><Bar label="Travel time reduction" value={12.71} max={20} color="#16a34a" /><Bar label="CO₂ reduction" value={10.62} max={20} color="#16a34a" /><Bar label="NOx reduction" value={11.01} max={20} color="#16a34a" /><p className="sub">Baseline: 88.50 s travel time, 10.50 s waiting, 40.47 km/h speed, CO₂ 683451.08 and NOx 247.91 in the saved SUMO run.</p></div>}
      {sub === 'emi' && <div className="card"><h3>Emissions · baseline vs best intervention</h3><p className="sub">Saved SUMO simulation results for the tested KS Rao Road near City Point scenario.</p><div className="grid g3"><Stat label="CO₂ baseline" value="683,451.08" note="simulation output" /><Stat label="CO₂ intervention" value="610,869.77" note="−10.62% vs baseline" tone="dn" /><Stat label="NOx intervention" value="220.61" note="−11.01% vs baseline" tone="dn" /></div><p className="sub" style={{ marginTop: 14 }}>These are SUMO outputs in the saved comparison, not live pollutant sensor measurements.</p></div>}
      {sub === 'rep' && <div className="card"><h3>Reports</h3>{[['Daily congestion summary', 'Scenario dataset distribution'], ['Intervention comparison', 'SUMO baseline vs intervention'], ['Emission impact', 'CO₂ and NOx simulation comparison'], ['SHAP explanation log', 'Available after SHAP output is connected']].map(([a, b]) => <div className="row" key={a}><span><b>{a}</b><small className="sub" style={{ display: 'block' }}>{b}</small></span><button className="btn ghost" onClick={() => setMessage(`${a}: ${b}. Export can be connected to report generation.`)}>Preview</button></div>)}<p className="sub" style={{ marginTop: 12 }}>{message}</p></div>}
    </div>
  );
}


function AppWorkspace({ role, onLogout }) {
  const [page, setPage] = useState(role === 'admin' ? 'over' : 'map');
  const [selectedRoad, setSelectedRoad] = useState(null);

  const tabs = role === 'admin' ? adminTabs : userTabs;

  return (
    <div className={`app ${role === 'admin' ? 'admin' : ''}`}>
      <div className="bar">
        <span id="tabs" style={{ display: 'contents' }}>
          {tabs.map(([id, label]) => (
            <button
              key={id}
              className={`pill ${page === id ? 'on' : ''}`}
              onClick={() => setPage(id)}
            >
              {label}
            </button>
          ))}
        </span>

        <span className="role">
          {role === 'admin' ? 'Traffic Admin' : 'Normal User'} ·{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onLogout();
            }}
            style={{ color: 'var(--pri)' }}
          >
            Switch access
          </a>
        </span>
      </div>

      {page === 'over' && <Overview />}

      {page === 'map' && (
        <div className="pg">
          <div className="card map-card">
            <div className="map-heading">
              <div>
                <h3>Live traffic map</h3>
                <p className="sub">
                  Seven selected Mangaluru roads · select a marker for available live data.
                </p>
              </div>
              <span className="tag">● Map view</span>
            </div>

            <TrafficMap onRoadSelect={setSelectedRoad} />
          </div>

          {selectedRoad && (
            <div className="card" style={{ marginTop: 18 }}>
              <h3>
                {selectedRoad.name ||
                  selectedRoad.road_name ||
                  'Selected road'}
              </h3>
              <p className="sub">
                Road selected on the map. Current speed and travel-time
                details are shown in the map’s live traffic panel when the
                service responds.
              </p>
            </div>
          )}
        </div>
      )}

      {page === 'road' && <RoadDetails />}

      {page === 'info' && <TrafficInfo />}

      {page === 'ai' && <AIPanel />}

      {page === 'accounts' && role === 'admin' && <RegisterDetails />}
    </div>
  );
}


export default function App() {
  const [view, setView] = useState('home');
  const [role, setRole] = useState(null);
  const [restoreError, setRestoreError] = useState('');
  const [restoring, setRestoring] = useState(
    () => Boolean(sessionStorage.getItem('access_token'))
  );

  useEffect(() => {
    let active = true;
    const token = sessionStorage.getItem('access_token');

    if (!token) {
      return () => { active = false; };
    }

    fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const user = await response.json().catch(() => null);
        if (!response.ok || !user || !['user', 'admin'].includes(user.role)) {
          const error = new Error(
            !response.ok ? 'Could not verify the stored session.' : 'Stored session is no longer valid.'
          );
          error.status = response.status;
          throw error;
        }
        return user;
      })
      .then((user) => {
        if (!active) return;
        sessionStorage.setItem('current_user', JSON.stringify(user));
        setRole(user.role);
        setView('app');
      })
      .catch((error) => {
        const sessionInvalid = error.message === 'Stored session is no longer valid.'
          || error.status === 401
          || error.status === 403
          || !(error instanceof TypeError);
        if (sessionInvalid) {
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('current_user');
        }
        if (active) {
          setRole(null);
          setView('home');
          setRestoreError(sessionInvalid
            ? ''
            : 'Your saved session could not be verified because the backend is unavailable. Try again when it is running.');
        }
      })
      .finally(() => {
        if (active) setRestoring(false);
      });

    return () => { active = false; };
  }, []);

  const enter = (verifiedRole) => {
    setRole(verifiedRole);
    setView('app');
  };

  const logout = () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('current_user');
    setRole(null);
    setView('home');
  };

  if (restoring) {
    return <main className="auth-restoring" role="status">Verifying your session…</main>;
  }

  return (
    <>
      <Header setView={setView} />

      {restoreError && <p className="session-warning" role="alert">{restoreError}</p>}

      {view === 'home' && <Landing setView={setView} />}

      {view === 'login' && (
        <Login onEnter={enter} setView={setView} />
      )}

      {view === 'app' && role && (
        <AppWorkspace
          role={role}
          onLogout={logout}
        />
      )}

      {view === 'app' && role && (
        <footer>
          © 2026 FlowCast Mangaluru · Analytical decision-support only.
          Simulation and historical data are labelled separately from live traffic.
        </footer>
      )}

      {view !== 'app' && (
        <footer>
          © 2026 FlowCast Mangaluru · AI Urban Traffic &amp; Emission
          Intervention Optimizer
        </footer>
      )}
    </>
  );
}
