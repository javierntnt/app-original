// Prueba de reacción - JavaScript
const screen = document.getElementById('screen');
const mainText = document.getElementById('mainText');
const subText = document.getElementById('subText');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const bestBtn = document.getElementById('bestBtn');

const lastTimeEl = document.getElementById('lastTime');
const bestTimeEl = document.getElementById('bestTime');
const avgTimeEl = document.getElementById('avgTime');
const historyList = document.getElementById('historyList');

let state = 'idle'; // idle, waiting, go, tooSoon
let timeoutId = null;
let startTs = 0;
let rounds = JSON.parse(localStorage.getItem('reaction_rounds') || '[]');

function saveRounds() {
  localStorage.setItem('reaction_rounds', JSON.stringify(rounds));
}

function updateStats() {
  if (rounds.length === 0) {
    lastTimeEl.textContent = '— ms';
    bestTimeEl.textContent = '— ms';
    avgTimeEl.textContent = '— ms';
    historyList.innerHTML = '';
    return;
  }
  const times = rounds.map(r => r.time).filter(t => typeof t === 'number');
  const last = times[times.length - 1];
  const best = Math.min(...times);
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  lastTimeEl.textContent = last + ' ms';
  bestTimeEl.textContent = best + ' ms';
  avgTimeEl.textContent = avg + ' ms';

  historyList.innerHTML = '';
  rounds.slice().reverse().forEach(r => {
    const d = document.createElement('div'); 
    d.className = 'histItem';
    d.innerHTML = `<div>${new Date(r.t).toLocaleTimeString()}</div><div>${r.time ? r.time + ' ms' : '<em style="color:var(--muted)">Descalificado</em>'}</div>`;
    historyList.appendChild(d);
  });
}

function vibrate(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function toIdle() {
  state = 'idle';
  screen.className = 'screen ready';
  mainText.textContent = 'Toca para empezar';
  subText.textContent = 'Presiona INICIAR o toca el área';
}

function startRound() {
  if (state === 'waiting') return; // ya en espera
  state = 'waiting';
  screen.className = 'screen wait';
  mainText.textContent = 'Preparado...';
  subText.textContent = 'Espera el cambio y toca lo más rápido que puedas';

  // espera aleatoria entre 1000 y 2500 ms
  const wait = 1000 + Math.floor(Math.random() * 1500);
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    state = 'go';
    screen.className = 'screen go';
    mainText.textContent = '¡Toca!';
    subText.textContent = '¡Ahora!';
    startTs = performance.now();
    vibrate(30);
  }, wait);
}

function tooSoon() {
  clearTimeout(timeoutId);
  state = 'tooSoon';
  screen.className = 'screen tooSoon';
  mainText.textContent = 'Muy pronto';
  subText.textContent = 'Se descalifica esta ronda';
  vibrate([50, 30, 50]);
  rounds.push({ t: Date.now(), time: null });
  saveRounds(); 
  updateStats();
  // volver a idle luego de 900ms
  setTimeout(() => { toIdle(); }, 900);
}

function registerTap() {
  if (state === 'idle') {
    startRound();
    return;
  }
  if (state === 'waiting') {
    // tocó antes de tiempo
    tooSoon();
    return;
  }
  if (state === 'go') {
    const diff = Math.round(performance.now() - startTs);
    rounds.push({ t: Date.now(), time: diff });
    saveRounds(); 
    updateStats();
    mainText.textContent = diff + ' ms';
    subText.textContent = '¡Buen trabajo! Toca para otra ronda';
    vibrate(40);
    state = 'idle';
    screen.className = 'screen ready';
    return;
  }
  if (state === 'tooSoon') {
    toIdle();
  }
}

// Eventos (ahora solo pointerdown para evitar doble toque en móvil)
screen.addEventListener('pointerdown', (e) => {
  e.preventDefault(); // Evita click fantasma en móviles
  registerTap();
});

startBtn.addEventListener('click', () => startRound());
resetBtn.addEventListener('click', () => {
  if (!confirm('Borrar historial?')) return; 
  rounds = []; 
  saveRounds(); 
  updateStats();
});

bestBtn.addEventListener('click', () => {
  const times = rounds.map(r => r.time).filter(t => typeof t === 'number');
  if (times.length === 0) { 
    alert('No hay tiempos válidos todavía.'); 
    return; 
  }
  const best = Math.min(...times);
  const text = `Mi mejor tiempo de reacción: ${best} ms. ¿Puedes superarlo?`;
  if (navigator.share) { 
    navigator.share({ title: 'Prueba de Reacción', text }).catch(() => {}); 
  }
  else { 
    prompt('Copia y comparte tu mejor tiempo:', text); 
  }
});

// inicializar
updateStats();
toIdle();

// accesibilidad: iniciar con Enter o espacio
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { 
    e.preventDefault(); 
    registerTap(); 
  }
});
