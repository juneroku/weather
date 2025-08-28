/* Fixed app.js with Chart.js date adapter */
const API_BASE = window.WEATHER_API_BASE;
const $ = (id) => document.getElementById(id);
let chart;

const setStatus = (text, ok=true) => {
  const pill = $('status-pill');
  pill.textContent = text;
  pill.className = 'ml-2 text-xs px-2 py-1 rounded-full ' + (ok ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200');
};

async function fetchJSON(path) {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadLatest() {
  const data = await fetchJSON('/latest');
  if (!data) return;
  $('temp').textContent  = Number(data.temperature_2m).toFixed(1);
  $('humid').textContent = Number(data.relative_humidity_2m).toFixed(0);
  $('wind').textContent  = Number(data.wind_speed_10m).toFixed(1);
  $('last-updated').textContent = `อัปเดตล่าสุด: ${new Date(data.timestamp).toLocaleString()}`;
}

async function loadSeries(hours = 24) {
  $('loading').style.display = 'grid';
  try {
    const payload = await fetchJSON(`/hourly?hours=${hours}`);
    const series = Array.isArray(payload.series) ? payload.series : [];
    if (series.length === 0) {
      setStatus('No data yet', false);
      if (chart) chart.destroy();
      $('loading').style.display = 'none';
      return;
    }
    const labels = series.map(s => new Date(s.time));
    const temps  = series.map(s => s.temperature_2m);
    const humids = series.map(s => s.relative_humidity_2m);
    const winds  = series.map(s => s.wind_speed_10m);
    const ctx = document.getElementById('chart').getContext('2d');
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Temp °C', data: temps, tension: .35 },
          { label: 'Humidity %', data: humids, tension: .35 },
          { label: 'Wind m/s', data: winds, tension: .35 }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        scales: { x: { type: 'time', time: { unit: 'hour' } } },
        plugins: { legend: { display: true } }
      }
    });
    setStatus('Online', true);
  } catch (e) {
    console.error(e);
    setStatus('API Error', false);
  } finally {
    $('loading').style.display = 'none';
  }
}

function wireThemeToggle() {
  const btn = $('toggle-theme');
  btn.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  });
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }
}

async function boot() {
  wireThemeToggle();
  try {
    await loadLatest();
    await loadSeries(24);
  } catch (e) {
    console.error(e);
  }
  $('range').addEventListener('change', (e) => {
    loadSeries(parseInt(e.target.value, 10));
  });
}

boot();
