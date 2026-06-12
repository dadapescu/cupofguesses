import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";
import { firebaseConfig, ROOM_ID } from "./firebaseConfig";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Structura in Firestore:
//   rooms/{ROOM_ID}/meta/state      -> { matches, admin }
//   rooms/{ROOM_ID}/users/{name}    -> { joined, commits, reveals }
//
// "commits" = amprente ale biletelor (1/X/2) — vizibile, dar nu spun ce a pariat.
// "reveals" = biletele desigilate dupa final.
// Pronosticurile inainte de meci raman doar pe device-ul fiecaruia (localStorage),
// deci nimeni nu le vede pana nu se termina meciul.

const roomRef = () => doc(db, "rooms", ROOM_ID, "meta", "state");
const usersCol = () => collection(db, "rooms", ROOM_ID, "users");
const userRef = (name) => doc(db, "rooms", ROOM_ID, "users", name);

export async function getState() {
  const snap = await getDoc(roomRef());
  return snap.exists() ? snap.data() : null;
}

export async function saveState(state) {
  await setDoc(roomRef(), state, { merge: true });
}

export async function joinUser(name) {
  const snap = await getDoc(userRef(name));
  if (!snap.exists()) {
    await setDoc(userRef(name), { joined: new Date().toISOString(), commits: {}, reveals: {} });
    return false; // utilizator nou
  }
  return true; // exista deja
}

export async function saveUserDoc(name, partial) {
  await setDoc(userRef(name), partial, { merge: true });
}

// Asculta in timp real toti utilizatorii (commits + reveals).
export function subscribeUsers(cb) {
  return onSnapshot(usersCol(), (snap) => {
    const out = {};
    snap.forEach((d) => {
      out[d.id] = d.data();
    });
    cb(out);
  });
}

// Asculta in timp real starea camerei (meciuri + admin).
export function subscribeState(cb) {
  return onSnapshot(roomRef(), (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });
}
