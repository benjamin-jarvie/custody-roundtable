import { SCRIPTS } from "./script.js?v=5";

const STORAGE_KEY = "bitcoin-butlers.journey.v1";
const MNEMONIC_KEY = "bitcoin-butlers.demo-mnemonic";
const ALLOWED = {
  format: ["bip39", "bip32", "codex32"],
  signers: ["single", "multi"],
  vendors: ["one", "multi"],
  platform: ["desktop", "phone"],
  script: ["segwit", "nested", "taproot", "legacy"]
};

export const STATIONS = [
  { id: 1, page: "generation", href: "generation.html", slug: "entropy" },
  { id: 2, page: "generation", href: "generation.html", slug: "encode" },
  { id: 3, page: "generation", href: "generation.html", slug: "paper" },
  { id: 4, page: "in-use", href: "in-use.html", slug: "load" },
  { id: 5, page: "in-use", href: "in-use.html", slug: "watch" },
  { id: 6, page: "in-use", href: "in-use.html", slug: "deposit" },
  { id: 7, page: "in-use", href: "in-use.html", slug: "drill" },
  { id: 8, page: "at-rest", href: "at-rest.html", slug: "steel" },
  { id: 9, page: "at-rest", href: "at-rest.html", slug: "retire" },
  { id: 10, page: "at-rest", href: "at-rest.html", slug: "vault" }
];

const DEFAULT_STATE = {
  version: 1,
  currentStation: 1,
  unlockedThrough: 1,
  completed: [],
  format: "bip39",
  signers: "single",
  vendors: "one",
  platform: "desktop",
  passphraseSet: false,
  script: "segwit",
  path: "m/84'/0'/0'",
  drillPassed: false,
  ceremoniesComplete: 0,
  descriptorReady: false
};

let memoryState = { ...DEFAULT_STATE };

function safeRead(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved && typeof saved === "object" ? saved : {};
  } catch (error){
    return {};
  }
}

function normalize(input){
  const state = { ...DEFAULT_STATE, ...input };
  Object.entries(ALLOWED).forEach(([key, values]) => {
    if (!values.includes(state[key])) state[key] = DEFAULT_STATE[key];
  });
  state.currentStation = Math.min(10, Math.max(1, Number(state.currentStation) || 1));
  state.unlockedThrough = Math.min(10, Math.max(1, Number(state.unlockedThrough) || 1));
  state.completed = Array.isArray(state.completed)
    ? [...new Set(state.completed.map(Number).filter(id => id >= 1 && id <= 10))]
    : [];
  state.ceremoniesComplete = Math.min(3, Math.max(0, Number(state.ceremoniesComplete) || 0));
  if (state.signers === "single"){
    state.vendors = "one";
    state.ceremoniesComplete = Math.min(1, state.ceremoniesComplete);
  }
  return state;
}

function safeWrite(state){
  memoryState = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error){
    // The in-memory journey still works when storage is unavailable.
  }
}

export function getJourneyState(){
  memoryState = normalize({ ...memoryState, ...safeRead() });
  return { ...memoryState, completed: [...memoryState.completed] };
}

export function updateJourney(patch){
  const next = normalize({ ...getJourneyState(), ...patch });
  safeWrite(next);
  dispatchEvent(new CustomEvent("journeychange", { detail: next }));
  return next;
}

export function enterStation(id){
  const station = STATIONS.find(item => item.id === Number(id));
  if (!station) return getJourneyState();
  const state = getJourneyState();
  return updateJourney({
    currentStation: station.id,
    unlockedThrough: Math.max(state.unlockedThrough, station.id)
  });
}

export function completeStation(id){
  const state = getJourneyState();
  const stationId = Math.min(10, Math.max(1, Number(id) || state.currentStation));
  return updateJourney({
    completed: [...new Set([...state.completed, stationId])],
    unlockedThrough: Math.max(state.unlockedThrough, Math.min(10, stationId + 1))
  });
}

export function resetJourney(){
  safeWrite({ ...DEFAULT_STATE });
  return updateJourney({ ...DEFAULT_STATE });
}

export function setSessionMnemonic(words){
  const value = Array.isArray(words) ? words.join(" ") : "";
  if (!value) return;
  try { sessionStorage.setItem(MNEMONIC_KEY, value); } catch (error) { /* session memory is optional */ }
}

export function getSessionMnemonic(fallback = []){
  try {
    const words = (sessionStorage.getItem(MNEMONIC_KEY) || "").trim().split(/\s+/).filter(Boolean);
    return words.length === 12 ? words : [...fallback];
  } catch (error){
    return [...fallback];
  }
}

export function journeyChoicePatch(sceneKey, value){
  const keys = { fmt: "format", sig: "signers", ven: "vendors", platform: "platform", scr: "script" };
  const key = keys[sceneKey];
  return key ? { [key]: value } : {};
}

export function syncChoiceControls(sceneState){
  const controls = { fmt: "fmt", sig: "sig", ven: "ven", platform: "platform", scr: "scr" };
  Object.entries(controls).forEach(([stateKey, id]) => {
    const group = document.getElementById(id);
    if (!group || sceneState[stateKey] === undefined) return;
    group.querySelectorAll(".chip").forEach(button => {
      button.classList.toggle("on", button.dataset.v === sceneState[stateKey]);
    });
  });
}

export function mountJourneyStations(page, onSelect = () => {}){
  const pageStations = STATIONS.filter(station => station.page === page);
  const pageStart = pageStations[0].id;
  const requested = Number(new URLSearchParams(location.search).get("station"));
  let state = getJourneyState();
  let active = pageStations.some(station => station.id === requested)
    ? requested
    : pageStations.some(station => station.id === state.currentStation)
      ? state.currentStation
      : pageStart;
  state = enterStation(active);
  document.body.dataset.station = String(active);

  const nav = document.createElement("nav");
  nav.className = "station-strip";
  nav.setAttribute("aria-label", SCRIPTS.journey.label);
  document.body.appendChild(nav);

  function render(nextState = getJourneyState()){
    state = nextState;
    active = Number(document.body.dataset.station) || active;
    nav.replaceChildren(...pageStations.map(station => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.station = String(station.id);
      button.disabled = station.id > state.unlockedThrough;
      button.className = "station-step";
      button.classList.toggle("on", station.id === active);
      button.classList.toggle("done", state.completed.includes(station.id));
      button.textContent = "S" + station.id + "  " + SCRIPTS.journey.stations[station.id];
      button.addEventListener("click", () => select(station.id));
      return button;
    }));
  }

  function select(id){
    const station = pageStations.find(item => item.id === Number(id));
    if (!station) return;
    active = station.id;
    document.body.dataset.station = String(active);
    enterStation(active);
    render();
    onSelect(active);
  }

  const onChange = event => render(event.detail);
  addEventListener("journeychange", onChange);
  render(state);
  queueMicrotask(() => onSelect(active));
  return {
    get station(){ return active; },
    select,
    refresh: render,
    destroy(){ removeEventListener("journeychange", onChange); nav.remove(); }
  };
}
