// Shared caption queue. The photographic host is fixed in the HTML shell so
// camera motion never distorts or moves it.

const say = document.getElementById("say");
const trayProp = document.getElementById("tray-prop");
let timer = null;
let queue = [];
let trayTimer = null;

export function presentTool(kind, label, duration = 1100){
  if (!trayProp) return;
  clearTimeout(trayTimer);
  trayProp.className = "tray-prop " + kind;
  trayProp.dataset.label = label || "";
  requestAnimationFrame(() => trayProp.classList.add("show"));
  trayTimer = setTimeout(() => trayProp.classList.remove("show"), duration);
}

export function speak(lines, delay = 0){
  queue = Array.isArray(lines) ? lines.slice() : [lines];
  clearTimeout(timer);
  const next = () => {
    if (!queue.length || !say) return;
    const line = queue.shift();
    say.textContent = line;
    if (queue.length) {
      timer = setTimeout(next, Math.max(2600, line.length * 55));
    }
  };
  timer = setTimeout(next, delay);
}

export function stopSpeaking(){
  clearTimeout(timer);
  queue = [];
}
