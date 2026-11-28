// Calcul des horaires de rappel, dans le fuseau horaire de l'élève.
const STEP = 5 * 60 * 1000; // précision : 5 minutes

function local(ms, tz) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.weekday];
  const h = +p.hour % 24, m = +p.minute;
  return { wd, min: h * 60 + m };
}
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

function inQuiet(min, quiet) {
  const a = toMin(quiet[0]), b = toMin(quiet[1]);
  if (a === b) return false;
  return a < b ? (min >= a && min < b) : (min >= a || min < b);
}

// Prochain envoi après `from` (ms). Renvoie null si impossible.
export function nextTime(c, from) {
  const tz = safeTz(c.tz);
  const days = new Set(c.days && c.days.length ? c.days : [0, 1, 2, 3, 4, 5, 6]);
  let t = Math.ceil((from + 1) / STEP) * STEP;
  if (c.mode === 'every') {
    const base = Math.max(from, (c.sent || c.updated || from) + c.every * 3600000);
    t = Math.ceil(base / STEP) * STEP;
    for (let i = 0; i < 8 * 288; i++, t += STEP) {
      const l = local(t, tz);
      if (days.has(l.wd) && !inQuiet(l.min, c.quiet || ['22:00', '08:00'])) return t;
    }
    return null;
  }
  const want = new Set((c.times || ['18:00']).map(x => Math.floor(toMin(x) / 5) * 5));
  for (let i = 0; i < 8 * 288; i++, t += STEP) {
    const l = local(t, tz);
    if (days.has(l.wd) && want.has(l.min)) return t;
  }
  return null;
}
export function safeTz(tz) {
  try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }); return tz; } catch { return 'Europe/Paris'; }
}
