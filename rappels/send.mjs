// Envoi des rappels Code Facile (lancé automatiquement par GitHub toutes les 15 minutes).
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { traiter } from './traiter.mjs';

const SA = process.env.FIREBASE_SA;
if (!SA) { console.log('Secret FIREBASE_SA absent : rien à faire.'); process.exit(0); }
initializeApp({ credential: cert(JSON.parse(SA)) });
const db = getFirestore(), fcm = getMessaging();

const snap = await db.collection('rappels').where('on', '==', true).get();
const r = await traiter(snap.docs, {
  envoyer: m => fcm.send(m),
  maj: (doc, v) => doc.ref.update(v),
  suppr: doc => doc.ref.delete(),
});
console.log(`Appareils : ${snap.size} · envoyés : ${r.envoyes} · sautés (élève déjà actif) : ${r.sautes} · jetons périmés supprimés : ${r.supprimes}`);
