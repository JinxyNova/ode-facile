// Logique d'envoi, séparée pour pouvoir la tester.
import { nextTime } from './horaires.mjs';
const GENERIQUES = [
  ['C\'est l\'heure de réviser 🚗', '10 minutes de Code aujourd\'hui, et tu te rapproches du permis !'],
  ['Ta série t\'attend 🔥', 'Fais quelques questions pour garder ton rythme.'],
  ['Prêt pour un petit quiz ? 🎯', 'Quelques questions maintenant, et l\'examen sera plus facile.'],
  ['Ne lâche rien 💪', 'Chaque question compte : viens continuer ta préparation.'],
  ['Un panneau par jour… 🚸', 'Viens réviser tes panneaux en quelques minutes.'],
];

export function message(c, now) {
  const prenom = c.name ? c.name.split(' ')[0] + ', ' : '';
  const recent = c.last && now - c.last < 4 * 86400000;
  if (recent && c.resume && c.resume.t) {
    return { title: 'On reprend ? 🚗', body: `${prenom}reprends là où tu t'es arrêté : ${c.resume.t}`, url: c.resume.u || './' };
  }
  let i = Math.floor(Math.random() * GENERIQUES.length);
  if (i === c.msg) i = (i + 1) % GENERIQUES.length;
  const [t, b] = GENERIQUES[i];
  return { title: t, body: prenom ? prenom + b.charAt(0).toLowerCase() + b.slice(1) : b, url: './', i };
}


export async function traiter(docs, { envoyer, maj, suppr }, now = Date.now()) {
let envoyes = 0, sautes = 0, supprimes = 0;
for (const doc of docs) {
  const c = doc.data();
  try {
    // réglages modifiés depuis le dernier calcul : on recalcule le prochain envoi
    if (!c.next || (c.calc || 0) < (c.updated || 0)) {
      const n = nextTime(c, now);
      await maj(doc, { next: n, calc: now });
      if (!n || n > now) continue;
      c.next = n;
    }
    if (c.next > now) continue;
    const fenetre = c.mode === 'every' ? c.every * 3600000 : 3 * 3600000;
    if (c.skip && c.last && now - c.last < fenetre) {
      sautes++;
    } else {
      const m = message(c, now);
      if (m.i !== undefined) { c.msg = m.i; delete m.i; }
      await envoyer({ token: c.token, data: m, webpush: { headers: { TTL: '3600', Urgency: 'normal' } } });
      envoyes++;
    }
    const sent = now;
    await maj(doc, { sent, next: nextTime({ ...c, sent }, now), calc: now, msg: c.msg ?? null });
  } catch (e) {
    const code = e && (e.code || e.errorInfo && e.errorInfo.code) || '';
    if (/registration-token-not-registered|invalid-registration-token|invalid-argument/.test(code)) {
      await suppr(doc); supprimes++;
    } else {
      console.log('Erreur pour un appareil :', code || e.message);
    }
  }
}
  return { envoyes, sautes, supprimes };
}
