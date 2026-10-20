'use client';

import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crosshair,
  Hospital,
  Info,
  MapPin,
  Navigation,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Route,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  Sparkles,
  Truck,
  Waypoints,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { computeAllRoutes } from '../algorithms/dijkstra';
import {
  AMBULANCE_UNITS,
  CITY_NODES,
  CITY_ROADS,
  DEFAULT_CLOSED_ROADS,
  HOSPITALS,
  ROAD_CLOSURES,
} from '../data/cityNetwork';
import type { HospitalDestination, RoadNode, RouteAlgorithm, RouteResult } from '../types/route';

const ALGORITHMS: Array<{
  id: RouteAlgorithm;
  shortName: string;
  name: string;
  complexity: string;
  approach: string;
  strength: string;
  limitation: string;
}> = [
  {
    id: 'dijkstra',
    shortName: 'Dijkstra',
    name: "Dijkstra's algorithm",
    complexity: 'O((V + E) log V)',
    approach: 'Expands the unsettled intersection with the smallest known travel time.',
    strength: 'Reliable for non-negative road costs; no geographic guess required.',
    limitation: 'May fan out broadly because it has no destination-directed heuristic.',
  },
  {
    id: 'astar',
    shortName: 'A*',
    name: 'A* search',
    complexity: 'O((V + E) log V)',
    approach: 'Ranks intersections by known cost g(n) plus a straight-line lower bound h(n).',
    strength: 'Often explores fewer intersections when a clear hospital destination is known.',
    limitation: 'Its speed advantage depends on an admissible, consistent heuristic.',
  },
  {
    id: 'floyd-warshall',
    shortName: 'Floyd–Warshall',
    name: 'Floyd–Warshall',
    complexity: 'O(V³) time · O(V²) space',
    approach: 'Tests every intersection as an intermediate stop for every node pair.',
    strength: 'Computes the shortest paths between all pairs; useful for repeated queries.',
    limitation: 'Higher setup cost and memory use on large or frequently changing networks.',
  },
];

const NODE_BY_ID = new Map(CITY_NODES.map((node) => [node.id, node]));

function formatETA(minutes: number): string {
  if (!Number.isFinite(minutes)) return 'No route';
  return `${Math.max(0, Math.ceil(minutes))} min`;
}

function pathDescription(result: RouteResult): string {
  if (!result.pathNodeIds.length) return 'No open route connects this unit to the selected hospital.';
  return result.pathNodeIds.map((id) => NODE_BY_ID.get(id)?.label ?? id).join('  →  ');
}

function nodeById(id: string): RoadNode {
  return NODE_BY_ID.get(id)!;
}

export function RoutingDashboard() {
  const [unitId, setUnitId] = useState(AMBULANCE_UNITS[0].id);
  const [hospitalId, setHospitalId] = useState(HOSPITALS[0].id);
  const [algorithm, setAlgorithm] = useState<RouteAlgorithm>('astar');
  const [closedRoadIds, setClosedRoadIds] = useState<string[]>(DEFAULT_CLOSED_ROADS);
  const [stepIndex, setStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [runNumber, setRunNumber] = useState(1);

  const unit = AMBULANCE_UNITS.find((candidate) => candidate.id === unitId) ?? AMBULANCE_UNITS[0];
  const hospital = HOSPITALS.find((candidate) => candidate.id === hospitalId) ?? HOSPITALS[0];
  const closedRoadSet = useMemo(() => new Set(closedRoadIds), [closedRoadIds]);
  // This illustrative network is small, so compute all strategies on each render and on explicit reruns.
  const routes = computeAllRoutes(CITY_NODES, CITY_ROADS, unit.locationNodeId, hospital.locationNodeId, closedRoadSet);
  const currentRoute = routes[algorithm];
  const currentStepIndex = Math.min(stepIndex, currentRoute.steps.length - 1);
  const currentStep = currentStepIndex >= 0 ? currentRoute.steps[currentStepIndex] : undefined;
  const selectedAlgorithm = ALGORITHMS.find((item) => item.id === algorithm)!;

  useEffect(() => {
    if (!isPlaying) return;
    if (currentStepIndex >= currentRoute.steps.length - 1) return;
    const timer = window.setTimeout(() => {
      const nextIndex = Math.min(currentStepIndex + 1, currentRoute.steps.length - 1);
      setStepIndex(nextIndex);
      if (nextIndex >= currentRoute.steps.length - 1) setIsPlaying(false);
    }, 1150);
    return () => window.clearTimeout(timer);
  }, [isPlaying, currentStepIndex, currentRoute.steps.length]);

  function resetTrace() {
    setStepIndex(-1);
    setIsPlaying(false);
  }

  function selectAlgorithm(nextAlgorithm: RouteAlgorithm) {
    setAlgorithm(nextAlgorithm);
    resetTrace();
  }

  function toggleClosure(edgeId: string) {
    setClosedRoadIds((current) => current.includes(edgeId)
      ? current.filter((id) => id !== edgeId)
      : [...current, edgeId]);
    resetTrace();
  }

  function rerunAnalysis() {
    setRunNumber((number) => number + 1);
    resetTrace();
  }

  function resetScenario() {
    setUnitId(AMBULANCE_UNITS[0].id);
    setHospitalId(HOSPITALS[0].id);
    setAlgorithm('astar');
    setClosedRoadIds(DEFAULT_CLOSED_ROADS);
    setRunNumber(1);
    resetTrace();
  }

  function togglePlayback() {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (currentStepIndex >= currentRoute.steps.length - 1) setStepIndex(-1);
    setIsPlaying(true);
  }

  const comparedRows = ALGORITHMS.map((item) => ({ algorithm: item, result: routes[item.id] }));
  const routePoints = currentRoute.pathNodeIds.map((id) => {
    const node = nodeById(id);
    return `${node.x},${node.y}`;
  }).join(' ');
  const visitedIds = new Set(currentStep?.visitedNodeIds ?? []);
  const activeNodeId = currentStep?.activeNodeId;
  const algorithmName = selectedAlgorithm.shortName;

  return (
    <main className="app-shell" id="top">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="MediRoute home">
          <span className="brand-symbol"><Route size={22} strokeWidth={2.1} /></span>
          <span className="brand-wordmark">Medi<span>Route</span><small>RESPONSE INTELLIGENCE</small></span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a className="nav-link active" href="#dispatch">Dispatch board</a>
          <a className="nav-link" href="#analysis">Algorithm lab</a>
        </nav>
        <div className="topbar-state"><span className="state-dot" /> SIMULATION ACTIVE <span className="topbar-rule" /><span className="topbar-tag">METRO GRID 01</span></div>
      </header>

      <div className="page-frame">
        <section className="page-intro" id="dispatch">
          <div>
            <div className="eyebrow"><Siren size={14} /> EMERGENCY ROUTE OPTIMIZATION <span className="eyebrow-line" /></div>
            <h1>Every minute moves <em>the outcome.</em></h1>
            <p>Compare the fastest way through the city, account for closures, and see the search unfold intersection by intersection.</p>
          </div>
          <div className="mode-badge"><span className="mode-icon"><ShieldCheck size={16} /></span><span><b>TRAINING SIMULATION</b><small>Illustrative network · no live dispatch feed</small></span></div>
        </section>

        <section className="stat-strip" aria-label="Simulation network status">
          <div className="stat-item"><span className="stat-icon mint"><Truck size={17} /></span><span><b>03</b><small>units on network</small></span></div>
          <span className="stat-divider" />
          <div className="stat-item"><span className="stat-icon coral"><Hospital size={17} /></span><span><b>03</b><small>receiving hospitals</small></span></div>
          <span className="stat-divider" />
          <div className="stat-item"><span className="stat-icon amber"><SlidersHorizontal size={16} /></span><span><b>{closedRoadIds.length.toString().padStart(2, '0')}</b><small>active road closures</small></span></div>
          <div className="stat-spacer" />
          <div className="network-meta"><Waypoints size={15} /><span>{CITY_NODES.length} intersections</span><i /> <span>{CITY_ROADS.length} road links</span></div>
        </section>

        <div className="workspace-grid">
          <section className="map-column" aria-label="City network and route analysis">
            <section className="map-card panel">
              <div className="panel-heading map-heading">
                <div><div className="panel-kicker"><span className="kicker-square" /> CITY NETWORK <span className="subtle-kicker">/ CENTRAL DISTRICT</span></div><h2>Dispatch map</h2></div>
                <div className="map-heading-right"><span className="map-status"><i /> NETWORK READY</span><span className="map-scale">N ↑</span></div>
              </div>
              <div className="map-canvas">
                <svg className="city-map" viewBox="0 0 1000 650" role="img" aria-label="Illustrative city road network with ambulance locations, hospitals, road closures, and the selected route">
                  <defs>
                    <pattern id="cityGrid" width="42" height="42" patternUnits="userSpaceOnUse">
                      <path d="M 42 0 L 0 0 0 42" fill="none" stroke="#aac0bc" strokeOpacity=".055" strokeWidth="1" />
                    </pattern>
                    <radialGradient id="mapGlow" cx="53%" cy="42%" r="72%">
                      <stop offset="0%" stopColor="#1a3437" />
                      <stop offset="100%" stopColor="#101f25" />
                    </radialGradient>
                    <filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <rect width="1000" height="650" fill="url(#mapGlow)" />
                  <rect width="1000" height="650" fill="url(#cityGrid)" />
                  <path d="M 0 330 C 150 310 175 325 268 296 C 330 278 405 306 478 287 C 583 260 641 277 714 307 C 809 345 892 323 1000 339 L 1000 381 C 879 365 812 388 704 349 C 615 317 575 314 488 341 C 391 371 319 345 259 367 C 166 401 104 380 0 394 Z" fill="#28706b" fillOpacity=".08" />
                  <text x="72" y="58" className="map-area-label">NORTH DISTRICT</text>
                  <text x="782" y="58" className="map-area-label">RIVERSIDE</text>
                  <text x="402" y="632" className="map-area-label">SOUTH WHARF</text>

                  <g className="road-layer">
                    {CITY_ROADS.map((road) => {
                      const from = nodeById(road.from);
                      const to = nodeById(road.to);
                      const isClosed = closedRoadSet.has(road.id);
                      const kindWidth = road.kind === 'arterial' ? 11 : road.kind === 'connector' ? 7 : 6;
                      return (
                        <g key={road.id}>
                          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={isClosed ? '#a24745' : '#385056'} strokeWidth={kindWidth} strokeLinecap="round" opacity={isClosed ? '.65' : '.78'} />
                          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={isClosed ? '#ff7770' : '#849b9c'} strokeWidth="1.3" strokeDasharray={isClosed ? '7 8' : '4 9'} strokeLinecap="round" opacity={isClosed ? '.98' : '.43'} />
                          {isClosed && <g transform={`translate(${(from.x + to.x) / 2} ${(from.y + to.y) / 2})`}><circle r="12" fill="#4a2326" stroke="#ff8980" strokeWidth="1.5" /><path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#ffd0c7" strokeWidth="2.2" strokeLinecap="round" /></g>}
                        </g>
                      );
                    })}
                  </g>

                  {routePoints && <polyline points={routePoints} fill="none" stroke="#16cdb0" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" opacity=".17" filter="url(#routeGlow)" />}
                  {routePoints && <polyline points={routePoints} fill="none" stroke="#49e4c4" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" className="route-line" />}

                  <g className="intersection-layer">
                    {CITY_NODES.map((node) => {
                      const isOrigin = node.id === unit.locationNodeId;
                      const isDestination = node.id === hospital.locationNodeId;
                      const isVisited = visitedIds.has(node.id);
                      const isCurrent = activeNodeId === node.id;
                      if (isOrigin || isDestination) return null;
                      return (
                        <g key={node.id}>
                          {isVisited && <circle cx={node.x} cy={node.y} r={isCurrent ? 16 : 12} fill={isCurrent ? '#f1b75f' : '#4c8fe6'} fillOpacity=".17" stroke={isCurrent ? '#ffd68a' : '#82b3ff'} strokeOpacity=".76" strokeWidth="1.5" />}
                          <circle cx={node.x} cy={node.y} r={isCurrent ? 5.5 : 3.6} fill={isCurrent ? '#ffe0a6' : isVisited ? '#87b6ff' : '#a9c0bb'} stroke="#14252a" strokeWidth="2" />
                        </g>
                      );
                    })}
                  </g>

                  {AMBULANCE_UNITS.map((candidate) => {
                    const location = nodeById(candidate.locationNodeId);
                    const isSelected = candidate.id === unit.id;
                    const fill = candidate.accent === 'teal' ? '#45e0c2' : candidate.accent === 'blue' ? '#79b6ff' : '#f2bd65';
                    return (
                      <g key={candidate.id} transform={`translate(${location.x} ${location.y})`}>
                        {isSelected && <circle r="27" fill={fill} fillOpacity=".13" stroke={fill} strokeOpacity=".5" strokeWidth="1.5" className="marker-pulse" />}
                        <rect x="-17" y="-12" width="34" height="24" rx="8" fill="#14242a" stroke={isSelected ? fill : '#758d91'} strokeWidth={isSelected ? 2 : 1.3} />
                        <path d="M-9 -4 H3 V5 H-9 Z M4 -2 H9 L12 2 V5 H4 Z" fill={fill} opacity=".95" />
                        <circle cx="-5" cy="7" r="2" fill="#f2f5ed" /><circle cx="8" cy="7" r="2" fill="#f2f5ed" />
                        {isSelected && <text x="21" y="-14" className="marker-label" fill={fill}>{candidate.callSign} · {location.label}</text>}
                        <title>{`${candidate.callSign} at ${location.label}`}</title>
                      </g>
                    );
                  })}

                  {HOSPITALS.map((destination: HospitalDestination) => {
                    const location = nodeById(destination.locationNodeId);
                    const isSelected = destination.id === hospital.id;
                    return (
                      <g key={destination.id} transform={`translate(${location.x} ${location.y})`}>
                        {isSelected && <circle r="28" fill="#ff7368" fillOpacity=".11" stroke="#ff9288" strokeOpacity=".52" strokeWidth="1.4" />}
                        <circle r="16" fill="#402a2d" stroke={isSelected ? '#ff8b7c' : '#a77471'} strokeWidth={isSelected ? 2.2 : 1.2} />
                        <path d="M-2.6 -8 H2.6 V-2.6 H8 V2.6 H2.6 V8 H-2.6 V2.6 H-8 V-2.6 H-2.6 Z" fill="#ffb3a8" />
                        {isSelected && <text x="22" y="21" className="marker-label hospital-label">{destination.name}</text>}
                        <title>{`${destination.name} · ${destination.traumaLevel}`}</title>
                      </g>
                    );
                  })}
                </svg>

                <div className="map-overlay incident-overlay"><span className="incident-icon"><MapPin size={15} /></span><span><b>INCIDENT SCENARIO</b><small>Union Square · Central District</small></span></div>
                <div className="map-overlay trace-overlay"><span className="trace-overlay-dot" />{currentStep ? `TRACE · ${currentStepIndex + 1}/${currentRoute.steps.length}` : 'ROUTE · ETA OPTIMIZED'}</div>
                <div className="map-legend" aria-label="Map legend">
                  <span><i className="legend-unit" /> ambulance</span><span><i className="legend-hospital">+</i> hospital</span><span><i className="legend-path" /> recommended route</span><span><i className="legend-closure" /> closed road</span>
                </div>
                <div className="map-credit">ILLUSTRATIVE CITY GRID <span>·</span> TRAFFIC WEIGHTS SIMULATED</div>
              </div>
              <div className="map-footer"><span><Crosshair size={14} /> ROUTE COMPUTED FOR <b>{unit.callSign}</b></span><span className="map-footer-destination"><Navigation size={13} /> {hospital.name}</span></div>
            </section>

            <section className="trace-card panel" aria-label="Step-by-step algorithm trace">
              <div className="trace-topline">
                <div><div className="panel-kicker"><span className="kicker-square orange" /> ALGORITHM TRACE <span className="subtle-kicker">/ {algorithmName.toUpperCase()}</span></div><h2>Follow the search</h2></div>
                <span className="trace-step-pill">{currentStepIndex >= 0 ? `STEP ${String(currentStepIndex + 1).padStart(2, '0')}` : 'READY'}<span> / {String(currentRoute.steps.length).padStart(2, '0')}</span></span>
              </div>
              <div className="trace-progress"><div style={{ width: `${currentStepIndex >= 0 && currentRoute.steps.length ? ((currentStepIndex + 1) / currentRoute.steps.length) * 100 : 0}%` }} /></div>
              <div className="trace-content">
                <div className="trace-copy"><div className="trace-current"><span className="step-orb">{currentStep ? String(currentStepIndex + 1).padStart(2, '0') : <Sparkles size={16} />}</span><span>{currentStep?.title ?? 'Ready to inspect this route'}</span></div><p>{currentStep?.description ?? `Trace ${algorithmName} from ${nodeById(unit.locationNodeId).label} to ${nodeById(hospital.locationNodeId).label}. Each step reveals the next node the algorithm considers.`}</p></div>
                <div className="trace-controls">
                  <button className="icon-button" onClick={() => { setStepIndex(Math.max(-1, currentStepIndex - 1)); setIsPlaying(false); }} aria-label="Previous algorithm step" disabled={currentStepIndex < 0}><ChevronLeft size={17} /></button>
                  <button className="trace-play" onClick={togglePlayback} disabled={!currentRoute.steps.length}>{isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}<span>{isPlaying ? 'Pause trace' : currentStepIndex >= currentRoute.steps.length - 1 ? 'Replay trace' : 'Play trace'}</span></button>
                  <button className="icon-button" onClick={() => { setStepIndex(Math.min(currentRoute.steps.length - 1, currentStepIndex + 1)); setIsPlaying(false); }} aria-label="Next algorithm step" disabled={currentStepIndex >= currentRoute.steps.length - 1}><ChevronRight size={17} /></button>
                </div>
              </div>
              <div className="trace-foot"><span><i className="trace-foot-dot" /> {currentRoute.exploredNodeIds.length} intersections explored</span><span>{currentRoute.relaxations} edge relaxations <span className="foot-separator">·</span> run #{runNumber}</span></div>
            </section>

            <section className="comparison-card panel" id="analysis" aria-label="Shortest-path algorithm comparison">
              <div className="panel-heading comparison-heading">
                <div><div className="panel-kicker"><span className="kicker-square blue" /> DESIGN &amp; ANALYSIS OF ALGORITHMS</div><h2>Same city. Three search strategies.</h2><p>Route distance and travel time use the same road costs; closed segments are excluded from every run.</p></div>
                <span className="comparison-stamp"><Activity size={15} /> LIVE COMPARISON</span>
              </div>
              <div className="comparison-table-wrap">
                <table className="comparison-table">
                  <thead><tr><th>ALGORITHM</th><th>TRAVEL DISTANCE</th><th>EST. TIME</th><th>NODES EXPLORED</th><th>COMPLEXITY</th><th /></tr></thead>
                  <tbody>
                    {comparedRows.map(({ algorithm: item, result }) => (
                      <tr
                        key={item.id}
                        className={item.id === algorithm ? 'selected-row' : ''}
                        onClick={() => selectAlgorithm(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            selectAlgorithm(item.id);
                          }
                        }}
                        tabIndex={0}
                        aria-label={`Select ${item.shortName} search strategy`}
                        aria-current={item.id === algorithm ? 'true' : undefined}
                        style={{ cursor: 'pointer' }}
                      >
                        <td><span className={`table-algorithm ${item.id === algorithm ? 'current' : ''}`}><i />{item.shortName}{item.id === algorithm && <small>ACTIVE</small>}</span></td>
                        <td className="table-number">{result.pathNodeIds.length ? `${result.distanceKm.toFixed(1)} km` : '—'}</td>
                        <td className="table-number eta-number">{formatETA(result.etaMinutes)}</td>
                        <td><span className="node-count"><b>{result.exploredNodeIds.length}</b><small> / {CITY_NODES.length}</small></span></td>
                        <td className="complexity-cell">{item.complexity}</td>
                        <td><button className="row-select" onClick={() => selectAlgorithm(item.id)} aria-label={`Use ${item.shortName}`} title={`Use ${item.shortName}`}><ArrowUpRight size={15} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="comparison-note"><Info size={14} /><span><b>Why routes can match:</b> All three seek the same minimum-time path, so equal distance and ETA are expected. Select a row to load its strategy trace. “Nodes explored” counts unique intersections settled by Dijkstra/A*, and all graph intersections processed as Floyd–Warshall pivots; this is a fixed illustrative network, not a live ETA.</span></div>

              <div className="algorithm-notes">
                {ALGORITHMS.map((item, index) => (
                  <button key={item.id} className={`algorithm-note ${item.id === algorithm ? 'active-note' : ''}`} onClick={() => selectAlgorithm(item.id)}>
                    <span className="note-index">0{index + 1}</span><span className="note-main"><b>{item.name}</b><small>{item.approach}</small></span><span className="note-complexity">{item.complexity}</span><ArrowUpRight className="note-arrow" size={15} />
                  </button>
                ))}
              </div>
              <div className="strength-row"><span><BadgeCheck size={14} /> WHEN IT FITS</span><p><b>{selectedAlgorithm.shortName}:</b> {selectedAlgorithm.strength} <span>{selectedAlgorithm.limitation}</span></p></div>
            </section>
          </section>

          <aside className="control-column panel" aria-label="Route optimization controls">
            <div className="control-heading"><div><div className="panel-kicker"><span className="kicker-square coral" /> ROUTE CONSOLE</div><h2>Build a route</h2></div><span className="console-run"><Radio size={13} /> RUN {String(runNumber).padStart(2, '0')}</span></div>
            <p className="control-description">Choose a response unit, receiving hospital, and route strategy.</p>

            <div className="control-section">
              <div className="section-label"><span>01</span> DISPATCH PAIR</div>
              <label className="field-label" htmlFor="unit-select">Ambulance unit</label>
              <div className="select-wrap"><Truck size={16} className="select-icon" /><select id="unit-select" value={unitId} onChange={(event) => { setUnitId(event.target.value); resetTrace(); }}>{AMBULANCE_UNITS.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.callSign} · {candidate.name} — {candidate.status}</option>)}</select><ChevronDown size={14} className="select-chevron" /></div>
              <label className="field-label hospital-field-label" htmlFor="hospital-select">Receiving hospital</label>
              <div className="select-wrap"><Hospital size={16} className="select-icon hospital-icon" /><select id="hospital-select" value={hospitalId} onChange={(event) => { setHospitalId(event.target.value); resetTrace(); }}>{HOSPITALS.map((destination) => <option key={destination.id} value={destination.id}>{destination.name} · {destination.traumaLevel}</option>)}</select><ChevronDown size={14} className="select-chevron" /></div>
            </div>

            <div className="control-section algorithm-section">
              <div className="section-label"><span>02</span> ROUTING ALGORITHM <span className="section-side">3 AVAILABLE</span></div>
              <div className="algorithm-picker" role="group" aria-label="Choose shortest-path algorithm">
                {ALGORITHMS.map((item) => (
                  <button key={item.id} className={`algorithm-option ${item.id === algorithm ? 'selected' : ''}`} onClick={() => selectAlgorithm(item.id)} aria-pressed={item.id === algorithm}>
                    <span className="algorithm-radio">{item.id === algorithm && <i />}</span><span>{item.shortName}</span>{item.id === algorithm && <Check size={13} className="algorithm-check" />}
                  </button>
                ))}
              </div>
            </div>

            <section className="recommendation-card" aria-label="Selected route recommendation">
              <div className="recommendation-top"><span><Sparkles size={14} /> RECOMMENDED ROUTE</span><span className="recommendation-badge">{algorithmName} SEARCH</span></div>
              <div className="recommendation-metrics"><div><b>{currentRoute.pathNodeIds.length ? currentRoute.distanceKm.toFixed(1) : '—'}<small> km</small></b><span>TRAVEL DISTANCE</span></div><div><b>{formatETA(currentRoute.etaMinutes)}</b><span>EST. ARRIVAL</span></div></div>
              <div className="route-sequence"><span>PATH</span><p title={pathDescription(currentRoute)}>{pathDescription(currentRoute)}</p></div>
              <div className="recommendation-meta"><span><Waypoints size={13} /> {currentRoute.exploredNodeIds.length} nodes explored</span><span><Zap size={13} /> {currentRoute.relaxations} edge checks</span></div>
            </section>

            <div className="action-row">
              <button className="primary-action" onClick={rerunAnalysis}><Route size={16} /> Re-run all three <ArrowRight size={15} /></button>
              <button className="reset-action" onClick={resetScenario} aria-label="Reset scenario" title="Reset scenario"><RotateCcw size={16} /></button>
            </div>

            <div className="control-section closure-section">
              <div className="section-label"><span>03</span> ROAD CONDITIONS <span className="section-side closure-count">{closedRoadIds.length} CLOSED</span></div>
              <p className="closure-intro">Toggle a closure. Every algorithm will route around it.</p>
              <div className="closure-list">
                {ROAD_CLOSURES.map((closure) => {
                  const isClosed = closedRoadIds.includes(closure.edgeId);
                  return (
                    <button key={closure.edgeId} className={`closure-item ${isClosed ? 'is-closed' : ''}`} onClick={() => toggleClosure(closure.edgeId)} aria-pressed={isClosed}>
                      <span className="closure-icon">{isClosed ? <X size={15} /> : <Check size={15} />}</span>
                      <span className="closure-copy"><b>{closure.street}</b><small>{closure.segment}</small></span>
                      <span className={`closure-toggle ${isClosed ? 'on' : ''}`}><i /></span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="dispatch-summary"><span className="summary-shield"><ShieldCheck size={15} /></span><p><b>Closure-aware routing</b><small>Closed links are removed from the graph before route costs are evaluated.</small></p></div>
            <div className="console-foot"><Clock3 size={13} /> All times are synthetic estimates for algorithm comparison.</div>
          </aside>
        </div>

        <footer className="page-footer"><span><span className="footer-mark"><Route size={14} /></span> MEDIROUTE <i /> ALGORITHM FIELD STUDIO</span><span><Info size={13} /> Simulation only. Not connected to emergency services or live traffic. In an emergency, contact local emergency services.</span></footer>
      </div>
    </main>
  );
}
