import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, ArrowRight, BrainCircuit, Leaf, MapPinned, Radio, ShieldCheck, Waypoints } from 'lucide-react';
import TrafficMap from './components/TrafficMap';
import useTrafficRoads from './hooks/useTrafficRoads';
import { readAuthenticatedResponse } from './authenticatedApi';
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
const userTabs = [['map','Map'],['road','Road Details'],['info','Traffic Info'],['ai','AI Analysis']];
const subTabs = [['shap','SHAP'],['what','What-if'],['opt','Optimizer'],['emi','Emissions'],['rep','Reports']];

function Header({ setView }) {
  return <header><div className="logo" onClick={() => setView('home')} role="button" tabIndex="0"><i>↗</i> FlowCast <span style={{color:'var(--pri2)'}}>Mangaluru</span></div><nav id="nav"><a href="#top" onClick={e=>{e.preventDefault();setView('home')}}>Home</a><a href="#about" onClick={e=>{e.preventDefault();setView('home');setTimeout(()=>document.getElementById('about')?.scrollIntoView({behavior:'smooth'}),0)}}>About Us</a><a href="#contact" onClick={e=>{e.preventDefault();setView('home');setTimeout(()=>document.getElementById('contact')?.scrollIntoView({behavior:'smooth'}),0)}}>Contact</a><button className="pill cta" onClick={()=>setView('login')}>Access</button></nav></header>;
}
function Landing({ setView }) {
  const capabilities = [
    {
      icon: <Radio size={21} />,
      title: 'Road conditions, with context',
      text: 'Explore a focused set of Mangaluru corridors. Where the live traffic service responds, compare current speed and travel time with free-flow conditions; scenario data stays clearly identified as historical.',
    },
    {
      icon: <BrainCircuit size={21} />,
      title: 'Predictions you can inspect',
      text: 'Run the trained congestion model against scenario inputs, review class confidence, and see which input features influenced the prediction through TreeSHAP.',
    },
    {
      icon: <Leaf size={21} />,
      title: 'Interventions evaluated in simulation',
      text: 'Review saved SUMO signal-timing comparisons and their traffic and emission metrics. Simulation outputs support analysis; they are not live pollutant measurements.',
    },
  ];

  const steps = [
    ['01', 'Choose a corridor', 'Start with one of the monitored Mangaluru road scenarios or inspect available live road conditions.'],
    ['02', 'Understand the model output', 'Review predicted congestion and feature contributions alongside the input data used.'],
    ['03', 'Compare tested options', 'Explore saved simulation results to understand trade-offs before decisions are made.'],
  ];

  return (
    <main className="view on landing-page">
      <section className="landing-hero" id="top">
        <div className="landing-hero-grid">
          <div className="landing-copy">
            <span className="landing-eyebrow"><i /> TRAFFIC INTELLIGENCE FOR MANGALURU</span>
            <h1>Make sense of movement.<br /><span>Plan what comes next.</span></h1>
            <p className="landing-lead">
              FlowCast brings road conditions, explainable congestion predictions, and
              traffic-simulation comparisons into one decision-support workspace.
            </p>
            <div className="landing-actions">
              <button className="btn landing-primary" type="button" onClick={() => setView('login')}>
                Explore the platform <ArrowRight size={17} />
              </button>
              <a className="landing-secondary" href="#about">Discover FlowCast <span aria-hidden="true">↓</span></a>
            </div>
            <div className="landing-proofline">
              <span><MapPinned size={15} /> 7 monitored corridors</span>
              <span><Activity size={15} /> Traffic model insights</span>
              <span><Waypoints size={15} /> SUMO scenarios</span>
            </div>
          </div>

          <div className="landing-visual" aria-label="Animated illustration of a connected urban road network">
            <div className="network-glow" />
            <svg className="network-art" viewBox="0 0 760 590" role="img" aria-labelledby="network-title">
              <title id="network-title">Abstract animated road network representing Mangaluru traffic</title>
              <defs>
                <linearGradient id="road-stroke" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#0d9488" />
                  <stop offset="0.52" stopColor="#38bdf8" />
                  <stop offset="1" stopColor="#818cf8" />
                </linearGradient>
                <radialGradient id="network-fade">
                  <stop offset="0" stopColor="#10375a" stopOpacity=".16" />
                  <stop offset="1" stopColor="#07182a" stopOpacity="0" />
                </radialGradient>
              </defs>
              <ellipse cx="410" cy="295" rx="340" ry="260" fill="url(#network-fade)" />
              <g className="network-roads">
                <path d="M37 450 C145 400 170 310 266 308 S379 421 465 344 580 226 720 240" />
                <path d="M80 120 C177 172 214 252 309 236 S421 140 514 177 620 300 698 393" />
                <path d="M147 548 C199 441 247 365 318 303 S413 209 442 57" />
                <path d="M31 276 C153 251 222 221 302 252 S444 377 548 378 652 338 738 301" />
                <path d="M225 33 C259 136 304 193 365 267 S475 398 510 552" />
                <path d="M62 365 C183 365 239 420 340 431 S511 402 628 465" />
                <path d="M368 19 C379 111 390 170 365 267 S306 412 277 558" />
              </g>
              <g className="network-flow">
                <path d="M37 450 C145 400 170 310 266 308 S379 421 465 344 580 226 720 240" />
                <path d="M80 120 C177 172 214 252 309 236 S421 140 514 177 620 300 698 393" />
                <path d="M31 276 C153 251 222 221 302 252 S444 377 548 378 652 338 738 301" />
                <path d="M62 365 C183 365 239 420 340 431 S511 402 628 465" />
              </g>
              <g className="network-nodes">
                <circle cx="266" cy="308" r="7" />
                <circle cx="365" cy="267" r="8" />
                <circle cx="465" cy="344" r="6" />
                <circle cx="514" cy="177" r="6" />
                <circle cx="340" cy="431" r="6" />
                <circle cx="548" cy="378" r="7" />
                <circle cx="309" cy="236" r="5" />
                <circle cx="442" cy="57" r="5" />
                <circle cx="628" cy="465" r="5" />
              </g>
            </svg>
            <div className="network-label network-label-one"><span /> KS Rao Road <b>Corridor insight</b></div>
            <div className="network-label network-label-two"><span /> Balmatta <b>Scenario analysis</b></div>
            <div className="network-status-card">
              <span className="status-card-icon"><Activity size={17} /></span>
              <div><small>FLOWCAST WORKSPACE</small><b>One view. More context.</b></div>
              <i aria-hidden="true">↗</i>
            </div>
            <div className="network-caption">A connected view of roads, models and scenarios</div>
          </div>
        </div>
        <div className="hero-bottomline"><span>BUILT AROUND SELECTED MANGALURU CORRIDORS</span><span>LIVE LOOKUPS · EXPLAINABLE AI · SIMULATION</span></div>
      </section>

      <section className="landing-about landing-section" id="about">
        <div className="landing-section-intro">
          <span className="landing-kicker">ABOUT FLOWCAST</span>
          <h2>Traffic decisions start with a clearer picture.</h2>
          <p>
            FlowCast is an academic decision-support project focused on selected urban
            corridors in Mangaluru, Karnataka. It brings together road information,
            machine-learning analysis, and saved traffic-simulation results so users can
            explore conditions and compare possible interventions in one place.
          </p>
          <p>
            The platform is designed to make the source and limits of each result visible:
            live road-service responses are separated from processed scenario records,
            model predictions, and SUMO simulation outputs.
          </p>
        </div>
        <div className="landing-capability-grid">
          {capabilities.map((item, index) => (
            <article className="landing-capability" key={item.title}>
              <span className="capability-index">0{index + 1}</span>
              <span className="capability-icon">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-method">
        <div className="landing-method-inner">
          <div className="landing-method-heading">
            <span className="landing-kicker">FROM DATA TO INSIGHT</span>
            <h2>A practical workflow for exploring traffic.</h2>
            <p>Move from a corridor view to a model result, then compare the evidence available for tested options.</p>
          </div>
          <div className="landing-steps">
            {steps.map(([number, title, detail]) => (
              <article className="landing-step" key={number}>
                <span>{number}</span>
                <div><h3>{title}</h3><p>{detail}</p></div>
              </article>
            ))}
          </div>
          <div className="landing-caveat">
            <ShieldCheck size={19} />
            <p><b>Decision support, not automatic control.</b> Live coverage depends on the connected traffic service. Historical scenarios and SUMO results are not live citywide measurements, and FlowCast does not control road infrastructure.</p>
          </div>
        </div>
      </section>

      <section className="landing-contact landing-section" id="contact">
        <div className="contact-main">
          <span className="landing-kicker">CONTACT &amp; PROJECT INFORMATION</span>
          <h2>Let’s make traffic analysis more useful.</h2>
          <p>
            Have feedback about the Mangaluru corridor scenarios, a question about how
            a prediction is produced, or an idea for the project? We welcome conversations
            about demonstrations, academic collaboration, data quality, and responsible use.
          </p>
          <button className="btn landing-primary" type="button" onClick={() => setView('login')}>
            Access FlowCast <ArrowRight size={17} />
          </button>
        </div>
        <div className="contact-details">
          <div><span>PROJECT</span><b>AI Urban Traffic &amp; Emission Intervention Optimizer</b></div>
          <div><span>LOCATION</span><b>Mangaluru, Karnataka, India</b></div>
          <div><span>AREAS OF INTEREST</span><b>Traffic insight · Explainable AI · Simulation</b></div>
          <p>For project enquiries or feedback, please use the contact channel provided by the project team or your academic department.</p>
        </div>
      </section>
    </main>
  );
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
function Overview() {
 return <div className="pg"><div className="grid g4" style={{marginBottom:18}}><Stat label="Selected roads" value="7" note="Mangaluru road scenarios"/><Stat label="Traffic scenarios" value="5,000" note="Processed dataset"/><Stat label="Severe scenarios" value="2,928" note="Historical dataset class" tone="up"/><Stat label="Clean CO₂ records" value="175,200" note="Processed emission records"/></div><div className="grid overview-grid"><div className="card"><h3>City congestion index · scenario dataset</h3><p className="sub">Historical model dataset distribution; not live citywide counts.</p><div className="chart-bars">{[['Severe',2928,'#ef4444'],['Moderate',938,'#f59e0b'],['Low',617,'#16a34a'],['High',517,'#f97316']].map(([l,v,c])=><div className="chart-col" key={l}><div className="chart-bar" style={{height:`${v/2928*145}px`,background:c}}/><b>{v.toLocaleString('en-IN')}</b><span>{l}</span></div>)}</div></div><div className="card"><h3>Busiest corridors</h3>{roads.slice(0,4).map((r,i)=><div className="row" key={r.name}><span>{i+1}. {r.name}</span><b className={r.level==='Severe'?'up':''}>{r.level}</b></div>)}</div></div><div className="card" style={{marginTop:18}}><h3>Recommended intervention · SUMO simulation</h3><p className="lead">KS Rao Road near City Point — Intervention 1 was the best-performing tested option in the current simulation comparison.</p><div className="grid g3"><div className="signal"><span>North–South green</span><b>45 sec</b></div><div className="signal"><span>East–West green</span><b>39 sec</b></div><div className="signal"><span>Optimization score</span><b>100</b></div></div><div className="grid g3" style={{marginTop:14}}><Stat label="Travel time" value="−12.71%" note="vs simulated baseline" tone="dn"/><Stat label="Waiting time" value="−100%" note="vs simulated baseline" tone="dn"/><Stat label="CO₂ emissions" value="−10.62%" note="vs simulated baseline" tone="dn"/></div><p className="sub" style={{marginTop:12}}>These are SUMO simulation comparisons, not real-world measured savings.</p></div></div>;
}
function RoadDetails({ onSessionExpired }) {
  const { roads: roadRecords, loading, error, retry } = useTrafficRoads(onSessionExpired);
  const [selectedScenario, setSelectedScenario] = useState('');
  const selectedRoad = roadRecords.find((road) => String(road.scenarioId) === selectedScenario)
    || roadRecords[0];
  const features = selectedRoad?.features || {};
  const metrics = [
    ['Traffic volume', features.Traffic_Volume, 'vehicles / scenario'],
    ['Average hourly count', features.Average_Hourly_Vehicle_Count, 'vehicles / hour'],
    ['Passenger-car units', features.PCU, 'PCU / scenario'],
    ['Peak-hour volume', features.Peak_Hour_Volume, 'vehicles / hour'],
    ['Peak-hour PCU', features.Peak_Hour_PCU, 'PCU / hour'],
    ['Road capacity', features.Road_Capacity_PCU, 'PCU'],
    ['V/C ratio', features.VC_Ratio, 'volume / capacity'],
    ['Estimated speed', features.Estimated_Speed_kmph, 'km/h'],
    ['Delay index', features.Delay_Index, 'scenario index'],
  ];
  const formatMetric = (value) => Number.isFinite(Number(value))
    ? Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
    : '—';

  if (loading) {
    return <div className="pg"><div className="card road-state" role="status">Loading road scenario details…</div></div>;
  }

  if (error) {
    return (
      <div className="pg">
        <div className="card road-state" role="alert">
          <div><h3>Road data is unavailable</h3><p className="sub">{error}</p></div>
          <button className="btn ghost" type="button" onClick={retry}>Try again</button>
        </div>
      </div>
    );
  }

  if (!selectedRoad) {
    return <div className="pg"><div className="card road-state">No Mangaluru road scenarios are available.</div></div>;
  }

  return (
    <div className="pg road-details-page">
      <div className="road-page-heading">
        <div>
          <span className="tag">Road intelligence · Mangaluru</span>
          <h2>Road details</h2>
          <p className="sub">Traffic and capacity indicators from the selected processed scenario record.</p>
        </div>
        <span className="data-source-note">Scenario data · not live readings</span>
      </div>

      <div className="grid road-grid">
        <section className="card road-picker">
          <h3>Select a corridor</h3>
          <label htmlFor="road-details-select">Road</label>
          <select
            id="road-details-select"
            className="f"
            value={selectedRoad.scenarioId}
            onChange={(event) => setSelectedScenario(event.target.value)}
          >
            {roadRecords.map((road) => (
              <option key={road.scenarioId} value={road.scenarioId}>{road.name}</option>
            ))}
          </select>
          <div className="road-record-info">
            <span className="sub">Scenario record</span>
            <b>#{selectedRoad.scenarioId} · {selectedRoad.scenarioLevel}</b>
            <span className="sub">Peak period: {selectedRoad.peakPeriod || 'Not specified'}</span>
          </div>
          <p className="road-data-note">
            Traffic volume, estimated speed, V/C ratio, and delay shown here come from a processed
            historical scenario. Live speed is available separately from the map when the service responds.
          </p>
        </section>

        <section className="card road-metrics-card">
          <div className="road-metrics-heading">
            <div>
              <h3>{selectedRoad.name}</h3>
              <p className="sub">Scenario #{selectedRoad.scenarioId} · {selectedRoad.scenarioLevel} demand</p>
            </div>
            <span className={`congestion-badge ${selectedRoad.congestion?.toLowerCase() || 'unknown'}`}>
              {selectedRoad.congestion || 'Not classified'}
            </span>
          </div>
          <div className="road-metrics-grid">
            {metrics.map(([label, value, unit]) => (
              <div className="road-metric" key={label}>
                <span>{label}</span>
                <strong>{formatMetric(value)}</strong>
                <small>{unit}</small>
              </div>
            ))}
          </div>
          <div className="capacity-indicator">
            <div className="capacity-label">
              <span>Volume-to-capacity ratio</span>
              <b>{formatMetric(features.VC_Ratio)}</b>
            </div>
            <div className="capacity-track" role="meter" aria-label="Volume to capacity ratio" aria-valuemin="0" aria-valuemax="2" aria-valuenow={Number(features.VC_Ratio) || 0}>
              <i style={{ width: `${Math.min(100, Math.max(0, (Number(features.VC_Ratio) || 0) / 2 * 100))}%` }} />
            </div>
            <p className="sub">Values above 1 indicate scenario demand exceeding listed road capacity.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
function TrafficInfo() { return <div className="pg"><div className="grid info-grid"><div className="card"><h3>Live traffic info</h3><p className="lead">Select a road marker on the Live Map to request current speed and travel-time data from the connected live traffic service.</p><p>Live fields may include current speed, free-flow speed, current travel time, free-flow travel time, confidence and road closure.</p><p className="sub">Traffic volume, PCU, V/C ratio, delay index and pollutant emissions are not provided directly by the live speed endpoint; those remain historical, modelled or simulated project values.</p></div><div className="grid"><div className="card hv"><div className="ico">🕗</div><h3>Best time to travel</h3><p>Use live speed and travel-time readings to compare conditions before choosing a travel time.</p></div><div className="card hv"><div className="ico">⚠️</div><h3>Congestion caution</h3><p>Check the selected road’s live status where data is available; historical congestion classes are scenario-based.</p></div><div className="card hv"><div className="ico">🛣️</div><h3>Alternate route</h3><p>Use the road map to compare selected corridors. Route recommendations require a connected routing source.</p></div></div></div></div>; }
function RegisterDetails({ onSessionExpired }) {
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
        onSessionExpired?.();
        setError('Your session is missing. Please sign in again.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/users`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await readAuthenticatedResponse(response, {
          onSessionExpired,
          fallback: 'Could not load registered accounts.',
        });
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
  }, [onSessionExpired, reload]);

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
const emissionMetrics = [
  ['CO2_mg', 'CO₂', 'mg'],
  ['CO_mg', 'CO', 'mg'],
  ['NOx_mg', 'NOₓ', 'mg'],
  ['PMx_mg', 'PMₓ', 'mg'],
  ['Fuel_mg', 'Fuel', 'mg'],
];

function formatNumber(value, digits = 2) {
  return Number(value).toLocaleString('en-IN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

async function requestAnalysis(path, options = {}, onSessionExpired) {
  const token = sessionStorage.getItem('access_token');
  if (!token) {
    onSessionExpired?.();
    throw new Error('Your session has expired. Sign in again to continue.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  return readAuthenticatedResponse(response, {
    onSessionExpired,
    fallback: `Request failed (${response.status}).`,
  });
}

function getWhatIfFeatures(features, trafficReduction, speedIncrease) {
  const trafficFactor = 1 - trafficReduction / 100;
  return {
    ...features,
    Traffic_Volume: features.Traffic_Volume * trafficFactor,
    Average_Hourly_Vehicle_Count: features.Average_Hourly_Vehicle_Count * trafficFactor,
    PCU: features.PCU * trafficFactor,
    Peak_Hour_Volume: features.Peak_Hour_Volume * trafficFactor,
    Peak_Hour_PCU: features.Peak_Hour_PCU * trafficFactor,
    VC_Ratio: features.VC_Ratio * trafficFactor,
    Estimated_Speed_kmph: features.Estimated_Speed_kmph + speedIncrease,
    Delay_Index: features.Delay_Index * trafficFactor,
  };
}

function downloadTextFile(filename, content, mimeType = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AIPanel({ onSessionExpired }) {
  const [sub, setSub] = useState('shap');
  const [roadName, setRoadName] = useState('');
  const [trafficReduction, setTrafficReduction] = useState(15);
  const [speedIncrease, setSpeedIncrease] = useState(5);
  const [roadRecords, setRoadRecords] = useState([]);
  const [comparison, setComparison] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [whatIfPrediction, setWhatIfPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [roadError, setRoadError] = useState('');
  const [comparisonError, setComparisonError] = useState('');
  const [predictionError, setPredictionError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const load = async (path) => {
      const token = sessionStorage.getItem('access_token');
      if (!token) {
        onSessionExpired?.();
        throw new Error('Your session has expired. Sign in again to continue.');
      }
      const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      return readAuthenticatedResponse(response, {
        onSessionExpired,
        fallback: `Could not load ${path}.`,
      });
    };

    Promise.allSettled([
      load('/traffic-roads'),
      load('/comparison'),
      load('/recommendation'),
    ]).then(([roadsResult, comparisonResult, recommendationResult]) => {
      if (controller.signal.aborted) return;
      if (roadsResult.status === 'fulfilled' && Array.isArray(roadsResult.value)) {
        setRoadRecords(roadsResult.value);
        setRoadName(roadsResult.value[0]?.name || '');
      } else {
        setRoadError(roadsResult.status === 'rejected'
          ? roadsResult.reason.message
          : 'The server returned an invalid road list.');
      }
      if (comparisonResult.status === 'fulfilled' && Array.isArray(comparisonResult.value)) {
        setComparison(comparisonResult.value);
      } else {
        setComparisonError(comparisonResult.status === 'rejected'
          ? comparisonResult.reason.message
          : 'The server returned an invalid simulation comparison.');
      }
      if (recommendationResult.status === 'fulfilled') {
        setRecommendation(recommendationResult.value);
      } else if (recommendationResult.status === 'rejected') {
        setComparisonError((current) => current || recommendationResult.reason.message);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [onSessionExpired]);

  const currentRoad = roadRecords.find((record) => record.name === roadName);
  const baseline = comparison.find((row) => row.Scenario_ID === 'Baseline');
  const recommendedScenario = recommendation?.scenario;
  const recommended = comparison.find((row) => row.Scenario_ID === recommendedScenario);
  const explanation = prediction?.explanation;
  const contributions = explanation?.features
    ? [...explanation.features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    : [];
  const maxContribution = Math.max(0.001, ...contributions.map((item) => Math.abs(item.contribution)));

  const requestPrediction = (features) => requestAnalysis('/predict', {
    method: 'POST',
    body: JSON.stringify(features),
  }, onSessionExpired);

  const runBaselinePrediction = async () => {
    if (!currentRoad?.features) return;
    setBusy(true);
    setPredictionError('');
    setWhatIfPrediction(null);
    try {
      setPrediction(await requestPrediction(currentRoad.features));
    } catch (error) {
      setPredictionError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const runWhatIfPrediction = async () => {
    if (!currentRoad?.features) return;
    setBusy(true);
    setPredictionError('');
    try {
      const [baselineResult, scenarioResult] = await Promise.all([
        prediction || requestPrediction(currentRoad.features),
        requestPrediction(getWhatIfFeatures(
          currentRoad.features,
          trafficReduction,
          speedIncrease,
        )),
      ]);
      setPrediction(baselineResult);
      setWhatIfPrediction(scenarioResult);
    } catch (error) {
      setPredictionError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const downloadReport = () => {
    const lines = [
      'FLOWCAST MANGALURU — TRAFFIC ANALYSIS REPORT',
      `Generated: ${new Date().toLocaleString()}`,
      `Corridor: ${currentRoad?.name || 'Not selected'}`,
      `Source scenario: ${currentRoad ? `#${currentRoad.scenarioId} (${currentRoad.scenarioLevel})` : 'Not available'}`,
      '',
      'SCENARIO TRAFFIC INPUTS',
      ...(currentRoad?.features
        ? Object.entries(currentRoad.features).map(([feature, value]) =>
          `  ${feature}: ${formatNumber(value, 3)}`)
        : ['  No scenario input values are available.']),
      '',
      'AI CONGESTION PREDICTION',
      prediction
        ? `Predicted congestion: ${prediction.predicted_congestion} (${formatNumber(prediction.confidence)}% confidence)`
        : 'No prediction has been run for this report.',
      ...(prediction
        ? Object.entries(prediction.class_probabilities || {}).map(([label, probability]) =>
          `  ${label}: ${formatNumber(probability)}%`)
        : []),
      '',
      'TREE SHAP FEATURE CONTRIBUTIONS',
      explanation
        ? `Method: ${explanation.method}; values are on the predicted-class raw-margin scale.`
        : 'No explanation is available until a prediction has been run.',
      ...(explanation?.features || []).map((item) =>
        `  ${item.feature} = ${formatNumber(item.value, 3)}; contribution ${item.contribution >= 0 ? '+' : ''}${formatNumber(item.contribution, 6)}`),
      '',
      'WHAT-IF MODEL FORECAST',
      whatIfPrediction
        ? `Assumptions: traffic counts/PCU/V-C/delay reduced by ${trafficReduction}%; speed increased by ${speedIncrease} km/h.`
        : 'No what-if forecast has been run.',
      ...(whatIfPrediction
        ? [`Predicted congestion: ${whatIfPrediction.predicted_congestion} (${formatNumber(whatIfPrediction.confidence)}% confidence)`]
        : []),
      'This is a model forecast using analyst-defined input adjustments, not a SUMO traffic simulation.',
      '',
      'SAVED SUMO EMISSION COMPARISON',
      baseline && recommended
        ? `Recommended option: ${recommended.Scenario_ID}; signal green times ${recommended.NorthSouth_Green_s}s north-south / ${recommended.EastWest_Green_s}s east-west.`
        : 'Saved SUMO comparison data is unavailable.',
      ...emissionMetrics.map(([key, label, unit]) => {
        if (!baseline || !recommended) return `  ${label}: not available`;
        const change = ((Number(recommended[key]) - Number(baseline[key])) / Number(baseline[key])) * 100;
        return `  ${label}: baseline ${formatNumber(baseline[key])} ${unit}; recommended ${formatNumber(recommended[key])} ${unit}; change ${formatNumber(change)}%`;
      }),
      '',
      'Traffic scenario predictions and emissions are modelled/simulated project outputs, not live pollutant measurements.',
    ];
    downloadTextFile('flowcast-traffic-analysis.txt', lines.join('\n'));
  };

  const downloadComparisonCsv = () => {
    if (!comparison.length) return;
    const columns = Object.keys(comparison[0]);
    const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [
      columns.map(quote).join(','),
      ...comparison.map((row) => columns.map((column) => quote(row[column])).join(',')),
    ].join('\r\n');
    downloadTextFile('flowcast-sumo-comparison.csv', csv, 'text/csv');
  };

  const selectRoad = (event) => {
    setRoadName(event.target.value);
    setPrediction(null);
    setWhatIfPrediction(null);
    setPredictionError('');
  };

  return (
    <div className="pg ai-page">
      <div className="ai-page-heading">
        <div>
          <span className="tag">Traffic intelligence · Mangaluru</span>
          <h2>AI analysis &amp; interventions</h2>
          <p className="sub">Model predictions, explanations, and saved traffic-simulation results in one place.</p>
        </div>
        <span className="data-source-note">Historical scenario data · SUMO simulation</span>
      </div>

      <div className="card ai-controls">
        <div>
          <label htmlFor="analysis-road">Corridor</label>
          <select id="analysis-road" className="f" value={roadName} onChange={selectRoad} disabled={loading || roadRecords.length === 0}>
            {roadRecords.map((record) => (
              <option key={record.name} value={record.name}>{record.name}</option>
            ))}
          </select>
        </div>
        <div className="selected-scenario">
          <span className="sub">Selected source record</span>
          <b>{currentRoad ? `#${currentRoad.scenarioId} · ${currentRoad.scenarioLevel}` : loading ? 'Loading scenarios…' : 'Not available'}</b>
          {currentRoad && <small>Peak period: {currentRoad.peakPeriod || 'Not specified'}</small>}
        </div>
        <button className="btn" type="button" onClick={runBaselinePrediction} disabled={busy || loading || !currentRoad}>
          {busy ? 'Running model…' : 'Run AI prediction'}
        </button>
      </div>

      {roadError && <p className="auth-message error" role="alert">{roadError}</p>}
      {predictionError && <p className="auth-message error" role="alert">{predictionError}</p>}

      {prediction && (
        <section className="prediction-summary card" aria-live="polite">
          <div>
            <span className="sub">Model prediction · {currentRoad?.name}</span>
            <h3>{prediction.predicted_congestion}</h3>
            <p className="sub">Predicted congestion class for source scenario #{currentRoad?.scenarioId}.</p>
          </div>
          <div className="prediction-confidence">
            <span className="sub">Model confidence</span>
            <strong>{formatNumber(prediction.confidence)}%</strong>
          </div>
          <div className="class-probabilities">
            <span className="sub">Class probabilities</span>
            <div>{Object.entries(prediction.class_probabilities || {}).map(([label, probability]) => (
              <span className="probability-chip" key={label}>{label} <b>{formatNumber(probability)}%</b></span>
            ))}</div>
          </div>
        </section>
      )}

      <div className="subnav" aria-label="Analysis sections">
        {subTabs.map(([id, label]) => (
          <button key={id} type="button" className={`pill ${sub === id ? 'on' : ''}`} onClick={() => setSub(id)}>
            {label}
          </button>
        ))}
      </div>

      {sub === 'shap' && (
        <section className="card analysis-card">
          <div className="section-heading">
            <div>
              <h3>Why did the model make this prediction?</h3>
              <p className="sub">TreeSHAP contributions for the predicted class. Positive values raise its raw model score; negative values lower it.</p>
            </div>
            {explanation && <span className="tag">Base value {formatNumber(explanation.base_value, 4)}</span>}
          </div>
          {!explanation ? (
            <div className="empty-analysis">
              <b>Run a prediction to see its explanation.</b>
              <span>The contribution scores below are calculated from the selected scenario and the trained XGBoost model.</span>
            </div>
          ) : (
            <div className="contribution-list">
              {contributions.map((item) => (
                <div className="contribution-row" key={item.feature}>
                  <div className="contribution-label">
                    <b>{item.feature.replaceAll('_', ' ')}</b>
                    <span>Input: {formatNumber(item.value, 3)}</span>
                  </div>
                  <div className="contribution-meter">
                    <i className={item.contribution >= 0 ? 'positive' : 'negative'} style={{ width: `${Math.max(3, Math.abs(item.contribution) / maxContribution * 100)}%` }} />
                  </div>
                  <strong className={item.contribution >= 0 ? 'positive-text' : 'negative-text'}>
                    {item.contribution >= 0 ? '+' : ''}{formatNumber(item.contribution, 5)}
                  </strong>
                </div>
              ))}
              <p className="sub">Contribution units are the predicted class raw-margin scale (not percentage points). Larger absolute values indicate stronger influence on this prediction.</p>
            </div>
          )}
        </section>
      )}

      {sub === 'what' && (
        <div className="grid what-grid">
          <section className="card analysis-card">
            <h3>Configure a what-if forecast</h3>
            <p className="sub">Adjust the selected scenario inputs and rerun the trained congestion model.</p>
            <label htmlFor="traffic-reduction">Traffic and vehicle-count reduction <b>{trafficReduction}%</b></label>
            <input id="traffic-reduction" className="scenario-range" type="range" min="0" max="40" step="1" value={trafficReduction} onChange={(event) => setTrafficReduction(Number(event.target.value))} />
            <label htmlFor="speed-increase">Estimated speed increase <b>{speedIncrease} km/h</b></label>
            <input id="speed-increase" className="scenario-range" type="range" min="0" max="20" step="1" value={speedIncrease} onChange={(event) => setSpeedIncrease(Number(event.target.value))} />
            <div className="assumption-note">
              <b>Scenario assumptions</b>
              <span>Traffic volume, hourly count, PCU, peak counts, V/C ratio, and delay are scaled together. Speed is increased by the selected amount; road capacity is unchanged.</span>
              <span>This is a model-based what-if forecast, not a new SUMO run or a measured real-world outcome.</span>
            </div>
            <button className="btn" type="button" onClick={runWhatIfPrediction} disabled={busy || loading || !currentRoad}>
              {busy ? 'Running forecast…' : 'Run what-if forecast'}
            </button>
          </section>
          <section className="card analysis-card">
            <h3>Baseline and adjusted forecast</h3>
            {whatIfPrediction ? (
              <div className="forecast-comparison">
                <div><span className="sub">Baseline</span><b>{prediction?.predicted_congestion}</b><small>{formatNumber(prediction?.confidence || 0)}% confidence</small></div>
                <span className="forecast-arrow" aria-hidden="true">→</span>
                <div className="forecast-result"><span className="sub">What-if model output</span><b>{whatIfPrediction.predicted_congestion}</b><small>{formatNumber(whatIfPrediction.confidence)}% confidence</small></div>
              </div>
            ) : (
              <div className="empty-analysis">
                <b>No adjusted forecast yet.</b>
                <span>Choose assumptions and run the model to compare predicted classes.</span>
              </div>
            )}
            {whatIfPrediction && <p className="sub" style={{ marginTop: 20 }}>The output is recalculated by the backend model using the adjusted feature values shown in the scenario assumptions.</p>}
          </section>
        </div>
      )}

      {sub === 'opt' && (
        <section className="card analysis-card">
          <div className="section-heading">
            <div>
              <h3>Tested signal interventions</h3>
              <p className="sub">Ranked from the saved SUMO comparison using the project’s recommendation results.</p>
            </div>
            {recommendation && <span className="tag">Recommended · {recommendation.scenario}</span>}
          </div>
          {comparisonError && <p className="auth-message error" role="alert">{comparisonError}</p>}
          {comparison.length > 0 && (
            <div className="comparison-table-wrap">
              <table className="comparison-table">
                <thead><tr><th>Scenario</th><th>N–S green</th><th>E–W green</th><th>Travel time</th><th>Waiting</th><th>Speed</th><th>CO₂</th><th>NOₓ</th></tr></thead>
                <tbody>{comparison.map((row) => (
                  <tr key={row.Scenario_ID} className={row.Scenario_ID === recommendedScenario ? 'recommended-row' : ''}>
                    <td>{row.Scenario_ID}{row.Scenario_ID === recommendedScenario && <span className="recommended-label">Recommended</span>}</td>
                    <td>{formatNumber(row.NorthSouth_Green_s, 0)} s</td>
                    <td>{formatNumber(row.EastWest_Green_s, 0)} s</td>
                    <td>{formatNumber(row.Average_Travel_Time_s)} s</td>
                    <td>{formatNumber(row.Average_Waiting_Time_s)} s</td>
                    <td>{formatNumber(row.Average_Speed_kmh)} km/h</td>
                    <td>{formatNumber(row.CO2_mg)} mg</td>
                    <td>{formatNumber(row.NOx_mg)} mg</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {recommendation && <p className="sub recommendation-note">Recommendation score: {formatNumber(recommendation.overall_score, 1)} / 100 · {formatNumber(recommendation.co2_reduction_percent)}% CO₂ reduction and {formatNumber(recommendation.nox_reduction_percent)}% NOₓ reduction versus the saved baseline.</p>}
        </section>
      )}

      {sub === 'emi' && (
        <section className="card analysis-card">
          <div className="section-heading">
            <div>
              <h3>Emission and fuel impact</h3>
              <p className="sub">Exact values from the saved SUMO runs. These are simulation outputs, not live sensor readings.</p>
            </div>
          </div>
          {comparisonError && <p className="auth-message error" role="alert">{comparisonError}</p>}
          {baseline && recommended ? (
            <>
              <div className="emission-summary">
                <Stat label="Simulated travel time" value={`${formatNumber(recommended.Average_Travel_Time_s)} s`} note={`${formatNumber(baseline.Average_Travel_Time_s)} s baseline`} />
                <Stat label="Simulated waiting time" value={`${formatNumber(recommended.Average_Waiting_Time_s)} s`} note={`${formatNumber(baseline.Average_Waiting_Time_s)} s baseline`} />
                <Stat label="Average speed" value={`${formatNumber(recommended.Average_Speed_kmh)} km/h`} note={`${formatNumber(baseline.Average_Speed_kmh)} km/h baseline`} />
              </div>
              <div className="comparison-table-wrap">
                <table className="comparison-table emission-table">
                  <thead><tr><th>Measure</th><th>Baseline</th><th>Recommended · {recommended.Scenario_ID}</th><th>Change vs baseline</th></tr></thead>
                  <tbody>
                    {emissionMetrics.map(([key, label, unit]) => {
                      const baseValue = Number(baseline[key]);
                      const interventionValue = Number(recommended[key]);
                      const change = ((interventionValue - baseValue) / baseValue) * 100;
                      return <tr key={key}><td>{label}</td><td>{formatNumber(baseValue)} {unit}</td><td>{formatNumber(interventionValue)} {unit}</td><td className={change <= 0 ? 'positive-text' : 'negative-text'}>{change > 0 ? '+' : ''}{formatNumber(change)}%</td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
              <p className="sub recommendation-note">Emission mass is reported in milligrams as exported by the saved SUMO comparison. Fuel is also shown in the source file’s mg unit; no unit conversion is implied.</p>
            </>
          ) : !comparisonError && <div className="empty-analysis">Loading saved emission comparison…</div>}
        </section>
      )}

      {sub === 'rep' && (
        <section className="card analysis-card">
          <h3>Download analysis report</h3>
          <p className="sub">Export the current corridor prediction, TreeSHAP explanation, what-if assumptions, and saved SUMO emissions comparison.</p>
          <div className="report-actions">
            <button className="btn" type="button" onClick={downloadReport}>Download text report (.txt)</button>
            <button className="btn ghost" type="button" onClick={downloadComparisonCsv} disabled={!comparison.length}>Download SUMO data (.csv)</button>
          </div>
          <div className="assumption-note report-note">
            <b>Report contents</b>
            <span>{prediction ? `Includes the ${prediction.predicted_congestion} prediction and ${explanation?.features?.length || 0} feature contributions.` : 'Run a prediction to include AI results and feature contributions.'}</span>
            <span>{comparison.length ? `${comparison.length} saved SUMO scenarios are available for the emissions section.` : 'Saved SUMO data is not currently available.'}</span>
          </div>
          <p className="sub" style={{ marginTop: 16 }}>Text reports can be opened in any document editor and printed or saved as PDF.</p>
        </section>
      )}
    </div>
  );
}


function AppWorkspace({ role, onLogout, onSessionExpired }) {
  const [page, setPage] = useState(role === 'admin' ? 'over' : 'map');

  const tabs = role === 'admin' ? adminTabs : userTabs;

  useEffect(() => {
    document.body.classList.toggle('fullscreen-map', page === 'map');
    return () => document.body.classList.remove('fullscreen-map');
  }, [page]);

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
                <h3>Mangaluru traffic map</h3>
                <p className="sub">
                  Select a monitored corridor to inspect its scenario data and request live speed information.
                </p>
              </div>
              <span className="tag">7 monitored corridors</span>
            </div>

            <TrafficMap onSessionExpired={onSessionExpired} />
          </div>
        </div>
      )}

      {page === 'road' && <RoadDetails onSessionExpired={onSessionExpired} />}

      {page === 'info' && <TrafficInfo />}

      {page === 'ai' && <AIPanel onSessionExpired={onSessionExpired} />}

      {page === 'accounts' && role === 'admin' && (
        <RegisterDetails onSessionExpired={onSessionExpired} />
      )}
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

  const handleSessionExpired = useCallback(() => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('current_user');
    setRole(null);
    setView('login');
    setRestoreError('Your session has expired or is no longer valid. Please sign in again.');
  }, []);

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
    setRestoreError('');
    setRole(verifiedRole);
    setView('app');
  };

  const logout = () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('current_user');
    setRole(null);
    setRestoreError('');
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
          onSessionExpired={handleSessionExpired}
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
