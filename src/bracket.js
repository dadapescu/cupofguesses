// ─────────────────────────────────────────────────────────────
//  Logica de bracket pentru CM 2026 (48 echipe, 32 in eliminatorii)
//  Toate datele extrase din schema oficiala FIFA (10 April 2026).
//  Toate orele sunt ORA ROMANIEI (EEST, ET+7).
// ─────────────────────────────────────────────────────────────

import { SEED_MATCHES } from "./seed";

export const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

// ── Schema oficiala Round of 32 ──
// Fiecare meci: { id, slot1, slot2, date, label }
// slot poate fi: "1A" (locul 1 grupa A), "2C" (locul 2 grupa C),
// sau "W{group3-options}" pentru cei mai buni 3 (ex: "3CEFHI" = locul 3 din una dintre grupele C,E,F,H,I)
export const R32_MATCHES = [
  // Numarul meciului dupa schema FIFA + ora Romaniei
  { id: "r32_73", num: 73, slot1: "2A", slot2: "2B",        kickoff: "2026-06-28T22:00", group: "R32 · M73" },
  { id: "r32_74", num: 74, slot1: "1E", slot2: "3ABCDF",    kickoff: "2026-06-28T23:30", group: "R32 · M74" },
  { id: "r32_75", num: 75, slot1: "1C", slot2: "2F",        kickoff: "2026-06-30T00:00", group: "R32 · M75" },
  { id: "r32_76", num: 76, slot1: "2E", slot2: "2I",        kickoff: "2026-06-30T20:00", group: "R32 · M76" },
  { id: "r32_77", num: 77, slot1: "1I", slot2: "3CDFGH",    kickoff: "2026-07-01T00:00", group: "R32 · M77" },
  { id: "r32_78", num: 78, slot1: "1F", slot2: "2C",        kickoff: "2026-07-01T04:00", group: "R32 · M78" },
  { id: "r32_79", num: 79, slot1: "1A", slot2: "3CEFHI",    kickoff: "2026-07-01T04:00", group: "R32 · M79" },
  { id: "r32_80", num: 80, slot1: "1L", slot2: "3EHIJK",    kickoff: "2026-07-01T19:00", group: "R32 · M80" },
  { id: "r32_81", num: 81, slot1: "1G", slot2: "3AEHIJ",    kickoff: "2026-07-02T03:00", group: "R32 · M81" },
  { id: "r32_82", num: 82, slot1: "1D", slot2: "3BEFIJ",    kickoff: "2026-07-02T07:00", group: "R32 · M82" },
  { id: "r32_83", num: 83, slot1: "2K", slot2: "2L",        kickoff: "2026-07-03T02:00", group: "R32 · M83" },
  { id: "r32_84", num: 84, slot1: "1H", slot2: "2J",        kickoff: "2026-07-03T22:00", group: "R32 · M84" },
  { id: "r32_85", num: 85, slot1: "1B", slot2: "3EFGIJ",    kickoff: "2026-07-04T06:00", group: "R32 · M85" },
  { id: "r32_86", num: 86, slot1: "1J", slot2: "2H",        kickoff: "2026-07-04T01:00", group: "R32 · M86" },
  { id: "r32_87", num: 87, slot1: "1K", slot2: "3DEIJL",    kickoff: "2026-07-04T04:30", group: "R32 · M87" },
  { id: "r32_88", num: 88, slot1: "2D", slot2: "2G",        kickoff: "2026-07-03T21:00", group: "R32 · M88" },
];

// ── Round of 16 (optimi) — castigatorii din R32 ──
// Pe schema FIFA, etichetele sunt W{nr meci R32}
export const R16_MATCHES = [
  { id: "r16_89", num: 89, slot1: "W86", slot2: "W88",  kickoff: "2026-07-05T00:00", group: "Optime · M89" },
  { id: "r16_90", num: 90, slot1: "W74", slot2: "W77",  kickoff: "2026-07-04T20:00", group: "Optime · M90" },
  { id: "r16_91", num: 91, slot1: "W76", slot2: "W78",  kickoff: "2026-07-04T23:00", group: "Optime · M91" },
  { id: "r16_92", num: 92, slot1: "W79", slot2: "W80",  kickoff: "2026-07-05T03:00", group: "Optime · M92" },
  { id: "r16_93", num: 93, slot1: "W73", slot2: "W75",  kickoff: "2026-07-05T22:00", group: "Optime · M93" },
  { id: "r16_94", num: 94, slot1: "W85", slot2: "W87",  kickoff: "2026-07-06T03:00", group: "Optime · M94" },
  { id: "r16_95", num: 95, slot1: "W83", slot2: "W84",  kickoff: "2026-07-06T22:00", group: "Optime · M95" },
  { id: "r16_96", num: 96, slot1: "W81", slot2: "W82",  kickoff: "2026-07-07T03:00", group: "Optime · M96" },
];

// ── Sferturi ──
export const QF_MATCHES = [
  { id: "qf_97", num: 97, slot1: "W91", slot2: "W92",  kickoff: "2026-07-09T23:00", group: "Sfert · M97" },
  { id: "qf_98", num: 98, slot1: "W93", slot2: "W94",  kickoff: "2026-07-10T22:00", group: "Sfert · M98" },
  { id: "qf_99", num: 99, slot1: "W89", slot2: "W90",  kickoff: "2026-07-12T00:00", group: "Sfert · M99" },
  { id: "qf_100", num: 100, slot1: "W95", slot2: "W96",  kickoff: "2026-07-12T04:00", group: "Sfert · M100" },
];

// ── Semifinale ──
export const SF_MATCHES = [
  { id: "sf_101", num: 101, slot1: "W97", slot2: "W98",  kickoff: "2026-07-14T22:00", group: "Semifinala · M101" },
  { id: "sf_102", num: 102, slot1: "W99", slot2: "W100", kickoff: "2026-07-15T22:00", group: "Semifinala · M102" },
];

// ── Finala mica + finala ──
export const FINAL_MATCHES = [
  { id: "f_103", num: 103, slot1: "L101", slot2: "L102", kickoff: "2026-07-19T00:00", group: "Finala mica (locul 3)" },
  { id: "f_104", num: 104, slot1: "W101", slot2: "W102", kickoff: "2026-07-19T22:00", group: "FINALA" },
];

// Toate meciurile eliminatorii cu faza lor
export const ALL_KO = [
  ...R32_MATCHES.map((m) => ({ ...m, phase: "16imi" })),
  ...R16_MATCHES.map((m) => ({ ...m, phase: "optimi" })),
  ...QF_MATCHES.map((m) => ({ ...m, phase: "sferturi" })),
  ...SF_MATCHES.map((m) => ({ ...m, phase: "semi" })),
  ...FINAL_MATCHES.map((m) => ({ ...m, phase: "finala" })),
];

// ── Calculeaza clasamentul unei grupe dupa meciurile inchise ──
// Returneaza array sortat: [{ team, played, won, draw, lost, gf, ga, gd, pts }]
export function computeStandings(groupLetter, matches) {
  const teams = new Set();
  const groupMatches = matches.filter((m) => m.group === "Grupa " + groupLetter);
  groupMatches.forEach((m) => {
    teams.add(m.home);
    teams.add(m.away);
  });
  const stats = {};
  teams.forEach((t) => {
    stats[t] = { team: t, played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  });
  groupMatches.forEach((m) => {
    if (!m.result || !m.result.score) return;
    const score = parseScore(m.result.score);
    if (!score) return;
    const [hg, ag] = score;
    const s1 = stats[m.home];
    const s2 = stats[m.away];
    if (!s1 || !s2) return;
    s1.played++; s2.played++;
    s1.gf += hg; s1.ga += ag;
    s2.gf += ag; s2.ga += hg;
    if (hg > ag) { s1.won++; s1.pts += 3; s2.lost++; }
    else if (hg < ag) { s2.won++; s2.pts += 3; s1.lost++; }
    else { s1.draw++; s2.draw++; s1.pts++; s2.pts++; }
  });
  Object.values(stats).forEach((s) => { s.gd = s.gf - s.ga; });
  return Object.values(stats).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.team.localeCompare(b.team);
  });
}

function parseScore(s) {
  const m = String(s).match(/(\d+)\s*[-:]\s*(\d+)/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10)];
}

// ── Verifica daca toate meciurile dintr-o grupa sunt inchise ──
export function isGroupComplete(groupLetter, matches) {
  const groupMatches = matches.filter((m) => m.group === "Grupa " + groupLetter);
  return groupMatches.length >= 6 && groupMatches.every((m) => m.result);
}

// ── Returneaza echipa pe locul N dintr-o grupa daca grupa e completa ──
function getTeamAtPlace(groupLetter, place, matches) {
  if (!isGroupComplete(groupLetter, matches)) return null;
  const s = computeStandings(groupLetter, matches);
  if (place < 1 || place > s.length) return null;
  return s[place - 1].team;
}

// ── Ranking pentru cele 8 grupe-3 cele mai bune ──
// Returneaza array de litere de grupe in ordinea celor mai bune locuri 3.
export function rankThirdPlaces(matches) {
  const allThirds = GROUP_LETTERS
    .filter((g) => isGroupComplete(g, matches))
    .map((g) => {
      const s = computeStandings(g, matches);
      return { group: g, ...s[2] };
    })
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.group.localeCompare(b.group);
    });
  return allThirds;
}

// ── Mapping slot "3CEFHI" -> echipa specifica ──
// FIFA decide pe baza unei tabele oficiale care 4 grupe sunt eliminate (cele cu cei mai slabi 3),
// si in functie de combinatia ramasa, mapeaza fiecare slot "3..." la o grupa anume.
// In practica: avem 16 slot-uri 3X in schema, dar doar 8 grupe contribuie cu locul 3 in 16-imi.
// Logica simplificata si general acceptata: cele 8 grupe-3 calificate sunt asignate in ordine
// catre slot-urile "3..." pe baza unei tabele FIFA. Implementam tabelul oficial mai jos.
//
// Slot-urile sunt (din schema): 3ABCDF, 3BEFIJ, 3CDFGH, 3CEFHI, 3AEHIJ, 3EHIJK, 3EFGIJ, 3DEIJL
// Tabel: in functie de care 4 grupe sunt eliminate (din 12 grupe avem C(12,4)=495 combinatii),
// FIFA publica oficial mapping-ul. Pentru aplicatia noastra implementam o regula simpla:
// asignam grupele-3 calificate la slot-urile compatibile in ordinea de ranking.

export function getThirdsAssignment(matches) {
  const ranked = rankThirdPlaces(matches);
  if (ranked.length < 8) return {}; // nu toate grupele s-au incheiat
  const qualified = ranked.slice(0, 8).map((r) => r.group);
  const slots = ["3ABCDF", "3BEFIJ", "3CDFGH", "3CEFHI", "3AEHIJ", "3EHIJK", "3EFGIJ", "3DEIJL"];
  // Algoritm greedy: pentru fiecare slot in ordine, alege prima grupa calificata
  // care e in lista permisa de litere ale slotului si inca neasignata.
  const assignment = {};
  const used = new Set();
  // Iteram in ordinea slotului ales sa dam slot-urilor cu cele mai putine optiuni prioritate
  const slotsByConstraint = [...slots].sort((a, b) => a.length - b.length);
  for (const slot of slotsByConstraint) {
    const letters = slot.slice(1).split("");
    for (const g of qualified) {
      if (used.has(g)) continue;
      if (letters.includes(g)) {
        assignment[slot] = g;
        used.add(g);
        break;
      }
    }
  }
  return assignment;
}

// ── Rezolva un slot la echipa concreta ──
// Slot poate fi: "1A", "2B", "3CEFHI", "W73", "L101"
export function resolveSlot(slot, matches, overrides = {}) {
  // 1. Override manual
  if (overrides[slot]) return overrides[slot];
  // 2. Locul 1 sau 2 dintr-o grupa
  const m = slot.match(/^([12])([A-L])$/);
  if (m) {
    const place = parseInt(m[1], 10);
    return getTeamAtPlace(m[2], place, matches);
  }
  // 3. Locul 3 dintr-un set de grupe
  if (slot.startsWith("3")) {
    const assignment = getThirdsAssignment(matches);
    const g = assignment[slot];
    if (!g) return null;
    return getTeamAtPlace(g, 3, matches);
  }
  // 4. Castigator/pierzator al unui meci eliminator
  const wm = slot.match(/^([WL])(\d+)$/);
  if (wm) {
    const targetNum = parseInt(wm[2], 10);
    const m2 = matches.find((x) => x.matchNum === targetNum);
    if (!m2 || !m2.result || !m2.result.score) return null;
    const score = parseScore(m2.result.score);
    if (!score) return null;
    const [hg, ag] = score;
    if (hg === ag) {
      // Egal in eliminatorii -> "winner" e specificat de admin prin m2.result.pickKO
      if (!m2.result.pickKO) return null;
      const w = m2.result.pickKO === "1" ? m2.home : m2.away;
      return wm[1] === "W" ? w : (w === m2.home ? m2.away : m2.home);
    }
    const winner = hg > ag ? m2.home : m2.away;
    const loser = hg > ag ? m2.away : m2.home;
    return wm[1] === "W" ? winner : loser;
  }
  return null;
}

// ── Genereaza lista de meciuri eliminatorii cu echipele rezolvate ──
// Returneaza array de meciuri "concrete" ready de afisat.
export function generateKOMatches(matches, overrides = {}) {
  const groupMatches = matches.filter((m) => m.phase === "grupe");
  // Adaug matchNum la meciurile de grupa pentru a putea referi "Wn" si "Ln"
  // (in cazul nostru grupele nu au matchNum, dar le punem pe seed-ul existent)
  // Folosim ALL_KO ca sursa pentru meciurile eliminatorii
  return ALL_KO.map((ko) => {
    const home = resolveSlot(ko.slot1, [...groupMatches, ...resolvedSoFar(matches, overrides, ko.id)], overrides);
    const away = resolveSlot(ko.slot2, [...groupMatches, ...resolvedSoFar(matches, overrides, ko.id)], overrides);
    return {
      id: ko.id,
      phase: ko.phase,
      group: ko.group,
      slot1: ko.slot1,
      slot2: ko.slot2,
      home: home || `(${slotLabel(ko.slot1)})`,
      away: away || `(${slotLabel(ko.slot2)})`,
      kickoff: ko.kickoff,
      matchNum: ko.num,
      isPlaceholder: !home || !away,
    };
  });
}

// Ajutator: cand calculam un meci eliminator avem nevoie de meciurile anterioare
// deja rezolvate (cu rezultat) ca sa stim W73 etc. Reconstruim lista lor cu matchNum.
function resolvedSoFar(matches, overrides, currentId) {
  const out = [];
  for (const ko of ALL_KO) {
    if (ko.id === currentId) break;
    const existing = matches.find((x) => x.id === ko.id);
    if (existing && existing.result) {
      out.push({ ...existing, matchNum: ko.num });
    }
  }
  return out;
}

function slotLabel(slot) {
  if (/^[12][A-L]$/.test(slot)) {
    const place = slot[0] === "1" ? "locul 1" : "locul 2";
    return `${place} ${slot[1]}`;
  }
  if (slot.startsWith("3")) return `locul 3 ${slot.slice(1)}`;
  const wm = slot.match(/^W(\d+)$/);
  if (wm) return `castigator M${wm[1]}`;
  const lm = slot.match(/^L(\d+)$/);
  if (lm) return `pierzator M${lm[1]}`;
  return slot;
}

export { slotLabel };
