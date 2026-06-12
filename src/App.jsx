import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { SEED_MATCHES, SEED_VERSION, FLAGS } from "./seed";
import {
  ALL_KO,
  GROUP_LETTERS,
  computeStandings,
  isGroupComplete,
  generateKOMatches,
  rankThirdPlaces,
  getThirdsAssignment,
} from "./bracket";
import {
  getState,
  saveState,
  joinUser,
  saveUserDoc,
  subscribeUsers,
  subscribeState,
} from "./firebase";

const C = {
  bg: "#F4F5FA", card: "#FFFFFF", ink: "#13182B", inkSoft: "#5B6172", line: "#DEE1EC",
  navy: "#0B1F4B", navyDark: "#071536", green: "#1D8A4E", greenPale: "#E5F3EA",
  red: "#D32638", redPale: "#FBE7E9", gold: "#D99A1B", goldPale: "#FBF1DA",
};

const flag = (t) => FLAGS[t] || "⚽";

const PHASES = [
  { id: "grupe", label: "Grupe" },
  { id: "standings", label: "📊 Clasamente" },
  { id: "16imi", label: "16-imi" },
  { id: "optimi", label: "Optimi" },
  { id: "sferturi", label: "Sferturi" },
  { id: "semi", label: "Semifinale" },
  { id: "finala", label: "Finala" },
];
const phaseLabel = (id) => (PHASES.find((p) => p.id === id) || {}).label || id;

const LS = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const fmtDate = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const zile = ["dum", "lun", "mar", "mie", "joi", "vin", "sam"];
  const luni = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${zile[d.getDay()]} ${d.getDate()} ${luni[d.getMonth()]}, ${hh}:${mm}`;
};

export default function App() {
  const [screen, setScreen] = useState("loading");
  const [me, setMe] = useState(null);
  const [adminName, setAdminName] = useState(null);
  const [groupMatches, setGroupMatches] = useState([]);
  const [koResults, setKoResults] = useState({}); // { koId: { pick, score, pickKO? } }
  const [overrides, setOverrides] = useState({}); // { slot: "EchipaX" }
  const [myPicks, setMyPicks] = useState({});
  const [usersData, setUsersData] = useState({});
  const [tab, setTab] = useState("grupe");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [now, setNow] = useState(Date.now());
  const seedingDone = useRef(false);

  const users = Object.keys(usersData).sort();
  const isAdmin = me && adminName && me === adminName;
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  // Construieste lista combinata: grupe (din state) + eliminatorii (generate)
  const allMatches = useMemo(() => {
    // Eliminatorii cu echipe rezolvate
    const generated = generateKOMatches(
      [...groupMatches, ...Object.entries(koResults).map(([id, r]) => {
        const ko = ALL_KO.find((k) => k.id === id);
        if (!ko) return null;
        return { id, phase: ko.phase, home: r._home || "", away: r._away || "", result: r, matchNum: ko.num };
      }).filter(Boolean)],
      overrides
    );
    // Combinam cu rezultate inregistrate
    const koWithResults = generated.map((m) => {
      const r = koResults[m.id];
      if (r) {
        return { ...m, result: { pick: r.pick, score: r.score, pickKO: r.pickKO } };
      }
      return m;
    });
    return [...groupMatches, ...koWithResults];
  }, [groupMatches, koResults, overrides]);

  const loadShared = useCallback(async () => {
    let state = await getState();
    if (!state || (state.seedVersion || 0) < SEED_VERSION) {
      const old = (state && state.matches) || [];
      const oldResults = {};
      old.forEach((x) => { if (x.result && x.phase === "grupe") oldResults[`${x.home}|${x.away}`] = x.result; });
      const merged = SEED_MATCHES.map((x) =>
        oldResults[`${x.home}|${x.away}`] ? { ...x, result: oldResults[`${x.home}|${x.away}`] } : x
      );
      await saveState({ matches: merged, koResults: (state && state.koResults) || {}, overrides: (state && state.overrides) || {}, seedVersion: SEED_VERSION });
      state = await getState();
    }
    if (state) {
      if (state.matches) setGroupMatches(state.matches.filter((m) => m.phase === "grupe"));
      if (state.admin) setAdminName(state.admin);
      setKoResults(state.koResults || {});
      setOverrides(state.overrides || {});
    }
  }, []);

  useEffect(() => {
    const savedName = LS.get("me");
    const savedPicks = LS.get("mypicks") || {};
    setMyPicks(savedPicks);
    let unsubState, unsubUsers;
    (async () => {
      try {
        if (!seedingDone.current) { seedingDone.current = true; await loadShared(); }
      } catch (e) { console.error(e); }
      unsubState = subscribeState((s) => {
        if (s) {
          if (s.matches) setGroupMatches(s.matches.filter((m) => m.phase === "grupe"));
          if (s.admin) setAdminName(s.admin);
          setKoResults(s.koResults || {});
          setOverrides(s.overrides || {});
        }
      });
      unsubUsers = subscribeUsers((u) => setUsersData(u));
      if (savedName) { setMe(savedName); setScreen("main"); }
      else setScreen("onboard");
    })();
    return () => { unsubState && unsubState(); unsubUsers && unsubUsers(); };
  }, [loadShared]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Desigilare automata dupa final
  useEffect(() => {
    if (!me || !usersData[me]) return;
    const mine = usersData[me].reveals || {};
    const finishedIds = allMatches.filter((m) => m.result).map((m) => m.id);
    const pending = finishedIds.filter((id) => myPicks[id] && !mine[id]);
    if (pending.length === 0) return;
    const next = { ...mine };
    pending.forEach((id) => { next[id] = myPicks[id]; });
    saveUserDoc(me, { reveals: next }).catch(console.error);
  }, [allMatches, myPicks, usersData, me]);

  const register = async () => {
    const name = nameInput.trim();
    if (name.length < 2) return showToast("Alege un nume de minim 2 caractere.");
    if (/[/\\'".#$[\]]/.test(name)) return showToast("Fara ghilimele, slash sau caractere speciale.");
    setBusy(true);
    try {
      await joinUser(name);
      const state = await getState();
      if (!state || !state.admin) { await saveState({ admin: name }); setAdminName(name); }
      LS.set("me", name); setMe(name); setScreen("main");
    } catch (e) { console.error(e); showToast("Eroare de conectare."); }
    setBusy(false);
  };

  const placeBet = async (matchId, pick) => {
    const match = allMatches.find((m) => m.id === matchId);
    if (!match) return;
    if (match.isPlaceholder) return showToast("Echipele inca nu sunt stabilite.");
    if (new Date(match.kickoff).getTime() <= Date.now()) return showToast("Meciul a inceput - pariurile sunt inchise.");
    const nextPicks = { ...myPicks };
    const myCommits = { ...((usersData[me] && usersData[me].commits) || {}) };
    if (nextPicks[matchId] === pick) { delete nextPicks[matchId]; delete myCommits[matchId]; }
    else { nextPicks[matchId] = pick; myCommits[matchId] = true; }
    setMyPicks(nextPicks);
    LS.set("mypicks", nextPicks);
    try { await saveUserDoc(me, { commits: myCommits }); }
    catch (e) { showToast("Nu s-a putut salva."); }
  };

  const saveGroupMatches = async (next) => {
    setGroupMatches(next);
    try { await saveState({ matches: next }); showToast("Salvat."); }
    catch { showToast("Eroare la salvare."); }
  };

  const saveKoResult = async (koId, result) => {
    const next = { ...koResults };
    if (result === null) delete next[koId];
    else {
      const m = allMatches.find((x) => x.id === koId);
      next[koId] = { ...result, _home: m && m.home, _away: m && m.away };
    }
    setKoResults(next);
    try { await saveState({ koResults: next }); showToast("Salvat."); }
    catch { showToast("Eroare la salvare."); }
  };

  const saveOverride = async (slot, team) => {
    const next = { ...overrides };
    if (!team) delete next[slot]; else next[slot] = team;
    setOverrides(next);
    try { await saveState({ overrides: next }); showToast("Suprascris."); }
    catch { showToast("Eroare la salvare."); }
  };

  const finished = allMatches.filter((m) => m.result);
  const standings = users
    .map((u) => {
      const commits = (usersData[u] && usersData[u].commits) || {};
      const reveals = (usersData[u] && usersData[u].reveals) || {};
      let pts = 0, played = 0, sealed = 0;
      finished.forEach((m) => {
        const hasCommit = !!commits[m.id];
        const rev = reveals[m.id];
        if (hasCommit && !rev) sealed++;
        if (rev) { played++; if (rev === m.result.pick) pts++; }
      });
      return { name: u, pts, played, sealed };
    })
    .sort((a, b) => b.pts - a.pts || a.played - b.played || a.name.localeCompare(b.name));

  if (screen === "loading") return (
    <Shell><div style={{ textAlign: "center", padding: "120px 20px", color: C.inkSoft }}>Se incalzeste gazonul...</div></Shell>
  );

  if (screen === "onboard") return (
    <Shell>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "64px 20px" }}>
        <div style={{ fontSize: 44, lineHeight: 1 }}>🏆</div>
        <h1 style={{ ...st.h1, color: C.navy }}>Cup of Guesses</h1>
        <p style={{ color: C.inkSoft, margin: "10px 0 28px", lineHeight: 1.55 }}>
          Miza: respectul colegilor. Alegi 1 / X / 2 inainte de start, biletul ramane ascuns
          pana la fluierul final. Scuzele de dupa meci nu puncteaza.
        </p>
        <label style={st.label}>Cum te stiu colegii</label>
        <input style={st.input} value={nameInput} onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && register()} placeholder="ex: Dada" maxLength={24} />
        <button style={{ ...st.btnPrimary, width: "100%", marginTop: 14 }} onClick={register} disabled={busy}>
          {busy ? "Intru pe teren..." : "Intra in joc"}
        </button>
      </div>
    </Shell>
  );

  const tabMatches = allMatches
    .filter((m) => m.phase === tab)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

  return (
    <Shell>
      <header style={{ background: `linear-gradient(135deg, ${C.navyDark}, ${C.navy})`, color: "#fff", padding: "18px 16px 0" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.18em", opacity: 0.75, textTransform: "uppercase" }}>
                FIFA World Cup 26™ · neoficial 100%
              </div>
              <h1 style={{ ...st.h1, color: "#fff", margin: "2px 0 0" }}>Cup of Guesses</h1>
            </div>
            <div style={{ textAlign: "right", fontSize: 13 }}>
              <span style={{ opacity: 0.75 }}>{isAdmin ? "arbitru · " : ""}</span>
              <strong>{me}</strong>
              <button onClick={() => { LS.set("me", null); setMe(null); setNameInput(""); setScreen("onboard"); }}
                style={{ background: "none", border: "none", color: "#fff", opacity: 0.55, cursor: "pointer", marginLeft: 8, fontSize: 12, textDecoration: "underline" }}>
                iesi
              </button>
            </div>
          </div>
          <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", marginTop: 12 }}>
            <div style={{ flex: 1, background: C.red }} />
            <div style={{ flex: 1, background: "#fff" }} />
            <div style={{ flex: 1, background: C.green }} />
          </div>
          <nav style={{ display: "flex", gap: 4, marginTop: 10, overflowX: "auto" }}>
            {[...PHASES, { id: "clasament", label: "🏆 Punctaje" }, ...(isAdmin ? [{ id: "admin", label: "⚙ Arbitru" }] : [])].map((p) => (
              <button key={p.id} onClick={() => setTab(p.id)}
                style={{ border: "none", cursor: "pointer", whiteSpace: "nowrap", padding: "9px 14px", fontSize: 13, fontWeight: 600, borderRadius: "8px 8px 0 0", background: tab === p.id ? C.bg : "rgba(255,255,255,0.08)", color: tab === p.id ? C.navy : "rgba(255,255,255,0.85)" }}>
                {p.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px 60px" }}>
        {tab === "clasament" ? (
          <Leaderboard standings={standings} finishedCount={finished.length} me={me} />
        ) : tab === "standings" ? (
          <GroupStandings groupMatches={groupMatches} />
        ) : tab === "admin" ? (
          <AdminPanel
            groupMatches={groupMatches}
            onSaveGroups={saveGroupMatches}
            allMatches={allMatches}
            koResults={koResults}
            onSaveKo={saveKoResult}
            overrides={overrides}
            onOverride={saveOverride}
          />
        ) : tabMatches.length === 0 ? (
          <div style={st.empty}>Niciun meci la {phaseLabel(tab)} inca.</div>
        ) : (
          tabMatches.map((m) => (
            <MatchCard key={m.id} match={m} me={me} myPicks={myPicks} usersData={usersData} users={users} now={now} onPick={placeBet} />
          ))
        )}
      </main>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: C.navy, color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 14, boxShadow: "0 6px 20px rgba(0,0,0,0.25)", zIndex: 50 }}>
          {toast}
        </div>
      )}
    </Shell>
  );
}

function MatchCard({ match, me, myPicks, usersData, users, now, onPick }) {
  const placeholder = match.isPlaceholder;
  const started = !placeholder && new Date(match.kickoff).getTime() <= now;
  const done = !!match.result;
  const myPick = myPicks[match.id] || null;
  const betsCount = users.filter((u) => ((usersData[u] && usersData[u].commits) || {})[match.id]).length;

  const status = placeholder
    ? { txt: "Asteapta echipele", bg: "#EFF1F7", col: C.inkSoft }
    : done ? { txt: "Final", bg: "#E8EBF5", col: C.navy }
    : started ? { txt: "Pariuri inchise", bg: C.goldPale, col: "#8A6510" }
    : { txt: "Deschis", bg: C.greenPale, col: C.green };

  const PickBtn = ({ val, label }) => {
    const active = myPick === val;
    const disabled = started || placeholder;
    return (
      <button onClick={() => onPick(match.id, val)} disabled={disabled}
        style={{ flex: 1, padding: "12px 0", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: disabled ? "default" : "pointer", border: `2px solid ${active ? C.navy : C.line}`, background: active ? C.navy : "#fff", color: active ? "#fff" : disabled ? C.line : C.ink, transition: "all .15s" }}>
        <div>{val}</div>
        <div style={{ fontSize: 10, fontWeight: 500, opacity: 0.8 }}>{label}</div>
      </button>
    );
  };

  return (
    <div style={st.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, letterSpacing: "0.04em" }}>
          {match.group || phaseLabel(match.phase)} · {fmtDate(match.kickoff)}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: status.bg, color: status.col, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {status.txt}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <TeamSide team={match.home} align="left" />
        <div style={{ textAlign: "center", minWidth: 64 }}>
          {done && match.result.score ? (
            <span style={{ fontSize: 24, fontWeight: 800, color: C.navy }}>{match.result.score}</span>
          ) : (<span style={{ fontSize: 13, color: C.inkSoft, fontWeight: 600 }}>vs</span>)}
        </div>
        <TeamSide team={match.away} align="right" />
      </div>
      {!done && !placeholder && (
        <>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <PickBtn val="1" label={match.home} />
            <PickBtn val="X" label="egal" />
            <PickBtn val="2" label={match.away} />
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: C.inkSoft, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <span>{betsCount === 0 ? "Niciun bilet inca" : `${betsCount} ${betsCount === 1 ? "coleg a pariat" : "colegi au pariat"} 🔒`}</span>
            {myPick && <span style={{ color: started ? C.ink : C.green, fontWeight: 700 }}>Biletul tau: {myPick}</span>}
          </div>
        </>
      )}
      {placeholder && (
        <div style={{ marginTop: 12, fontSize: 13, color: C.inkSoft, fontStyle: "italic", textAlign: "center" }}>
          Echipele se vor stabili dupa meciurile anterioare.
        </div>
      )}
      {done && <Reveal match={match} users={users} usersData={usersData} me={me} />}
    </div>
  );
}

function TeamSide({ team, align }) {
  const isPlaceholder = String(team || "").startsWith("(");
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, flexDirection: align === "right" ? "row-reverse" : "row" }}>
      <span style={{ fontSize: 26 }}>{isPlaceholder ? "❔" : flag(team)}</span>
      <span style={{ fontSize: isPlaceholder ? 13 : 15, fontWeight: 700, color: isPlaceholder ? C.inkSoft : C.ink, textAlign: align, fontStyle: isPlaceholder ? "italic" : "normal" }}>{team}</span>
    </div>
  );
}

function Reveal({ match, users, usersData, me }) {
  const r = match.result;
  const winLabel = r.pick === "1" ? match.home : r.pick === "2" ? match.away : "Egal";
  const rows = users
    .map((u) => ({ name: u, committed: !!((usersData[u] && usersData[u].commits) || {})[match.id], rev: ((usersData[u] && usersData[u].reveals) || {})[match.id] }))
    .filter((x) => x.committed);
  return (
    <div style={{ marginTop: 14, borderTop: `1px dashed ${C.line}`, paddingTop: 12 }}>
      <div style={{ fontSize: 13, marginBottom: 10 }}>Rezultat: <strong>{winLabel}</strong> ({r.pick}{r.score ? ` · ${r.score}` : ""})</div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: C.inkSoft }}>Nimeni nu a pariat pe meciul asta. Lasi.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((x) => {
            if (!x.rev) return (
              <div key={x.name} style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", borderRadius: 8, fontSize: 13, background: "#EFF1F7", color: C.inkSoft }}>
                <span style={{ fontWeight: 600 }}>{x.name === me ? `${x.name} (tu)` : x.name}</span>
                <span>🔒 se deschide cand intra in aplicatie</span>
              </div>
            );
            const hit = x.rev === r.pick;
            return (
              <div key={x.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 12px", borderRadius: 8, fontSize: 13, background: hit ? C.greenPale : C.redPale, border: x.name === me ? `1.5px solid ${hit ? C.green : C.red}` : "1.5px solid transparent" }}>
                <span style={{ fontWeight: x.name === me ? 800 : 600 }}>{x.name === me ? `${x.name} (tu)` : x.name}</span>
                <span style={{ fontWeight: 700, color: hit ? C.green : C.red }}>{x.rev} {hit ? "✓ +1p" : "✗"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Leaderboard({ standings, finishedCount, me }) {
  return (
    <div style={st.card}>
      <h2 style={st.h2}>Clasamentul biroului</h2>
      <p style={{ color: C.inkSoft, fontSize: 13, margin: "4px 0 16px" }}>
        1 punct per pronostic corect · {finishedCount} {finishedCount === 1 ? "meci jucat" : "meciuri jucate"}
      </p>
      {standings.length === 0 ? (
        <div style={st.empty}>Inca nu s-a inscris nimeni.</div>
      ) : (
        standings.map((s, i) => (
          <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 10, marginBottom: 6, background: i === 0 && s.pts > 0 ? C.goldPale : s.name === me ? "#E8EBF5" : "transparent", border: `1px solid ${i === 0 && s.pts > 0 ? "#EAD9AC" : s.name === me ? C.line : "transparent"}` }}>
            <span style={{ width: 26, fontWeight: 800, color: i === 0 ? C.gold : C.inkSoft, fontSize: 15 }}>{i === 0 && s.pts > 0 ? "🏆" : i + 1}</span>
            <span style={{ flex: 1, fontWeight: s.name === me ? 800 : 600, fontSize: 14 }}>
              {s.name === me ? `${s.name} (tu)` : s.name}
              {s.sealed > 0 && <span style={{ fontSize: 11, color: C.inkSoft, fontWeight: 500 }}> · {s.sealed} 🔒 nedeschise</span>}
            </span>
            <span style={{ fontSize: 12, color: C.inkSoft }}>{s.played} bilete</span>
            <span style={{ fontWeight: 800, fontSize: 16, minWidth: 44, textAlign: "right" }}>{s.pts} p</span>
          </div>
        ))
      )}
    </div>
  );
}

function GroupStandings({ groupMatches }) {
  return (
    <>
      <div style={{ ...st.card, background: "#E8EBF5" }}>
        <div style={{ fontSize: 13, color: C.navy, lineHeight: 1.5 }}>
          📊 <strong>Clasamentele celor 12 grupe</strong>, actualizate dupa fiecare meci inchis.
          Top 2 si cei mai buni 8 de pe locul 3 trec mai departe (32 echipe).
        </div>
      </div>
      {GROUP_LETTERS.map((g) => (
        <GroupTable key={g} letter={g} groupMatches={groupMatches} />
      ))}
    </>
  );
}

function GroupTable({ letter, groupMatches }) {
  const standings = computeStandings(letter, groupMatches);
  const complete = isGroupComplete(letter, groupMatches);
  return (
    <div style={st.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <h3 style={{ ...st.h2, fontSize: 18 }}>Grupa {letter}</h3>
        <span style={{ fontSize: 11, color: complete ? C.green : C.inkSoft, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {complete ? "Final" : "In desfasurare"}
        </span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ color: C.inkSoft, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            <th style={{ textAlign: "left", padding: "6px 4px" }}>#</th>
            <th style={{ textAlign: "left", padding: "6px 4px" }}>Echipa</th>
            <th style={{ textAlign: "center", padding: "6px 4px" }}>J</th>
            <th style={{ textAlign: "center", padding: "6px 4px" }}>V-E-I</th>
            <th style={{ textAlign: "center", padding: "6px 4px" }}>GD</th>
            <th style={{ textAlign: "center", padding: "6px 4px", fontWeight: 800 }}>P</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.team} style={{ borderTop: `1px solid ${C.line}`, background: i < 2 ? C.greenPale : i === 2 ? C.goldPale : "transparent" }}>
              <td style={{ padding: "8px 4px", color: C.inkSoft, fontWeight: 700 }}>{i + 1}</td>
              <td style={{ padding: "8px 4px", fontWeight: 600 }}>{flag(s.team)} {s.team}</td>
              <td style={{ padding: "8px 4px", textAlign: "center" }}>{s.played}</td>
              <td style={{ padding: "8px 4px", textAlign: "center" }}>{s.won}-{s.draw}-{s.lost}</td>
              <td style={{ padding: "8px 4px", textAlign: "center", color: s.gd > 0 ? C.green : s.gd < 0 ? C.red : C.ink }}>{s.gd > 0 ? "+" : ""}{s.gd}</td>
              <td style={{ padding: "8px 4px", textAlign: "center", fontWeight: 800, fontSize: 14 }}>{s.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminPanel({ groupMatches, onSaveGroups, allMatches, koResults, onSaveKo, overrides, onOverride }) {
  const [resultDraft, setResultDraft] = useState({});

  // ── grupare meciuri pe faze ──
  const phases = [
    { id: "grupe", label: "Faza grupelor", list: groupMatches },
    ...["16imi", "optimi", "sferturi", "semi", "finala"].map((p) => ({
      id: p,
      label: phaseLabel(p),
      list: allMatches.filter((m) => m.phase === p).sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)),
    })),
  ];

  const setResultGroup = (id) => {
    const d = resultDraft[id];
    if (!d || !d.pick) return;
    onSaveGroups(groupMatches.map((m) => (m.id === id ? { ...m, result: { pick: d.pick, score: (d.score || "").trim() } } : m)));
  };
  const clearResultGroup = (id) => onSaveGroups(groupMatches.map((m) => (m.id === id ? { ...m, result: undefined } : m)));
  const setKickoff = (id, kickoff) => onSaveGroups(groupMatches.map((m) => (m.id === id ? { ...m, kickoff } : m)));

  const setResultKO = (id) => {
    const d = resultDraft[id];
    if (!d || !d.pick) return;
    onSaveKo(id, { pick: d.pick, score: (d.score || "").trim(), pickKO: d.pick });
  };
  const clearResultKO = (id) => onSaveKo(id, null);

  return (
    <>
      <div style={{ ...st.card, background: "#E8EBF5" }}>
        <div style={{ fontSize: 13, color: C.navy, lineHeight: 1.5 }}>
          <strong>Tu esti arbitrul.</strong> Inchizi meciurile cu 1/X/2 + scor.
          Brackets-ul eliminatoriilor se construieste singur dupa fiecare meci.
          Daca FIFA descalifica/inlocuieste o echipa, foloseste sectiunea <em>"Suprascriere manuala"</em>.
        </div>
      </div>

      {phases.map((p) => (
        <div key={p.id} style={st.card}>
          <h2 style={st.h2}>{p.label} ({p.list.length})</h2>
          {p.list.length === 0 && <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 10 }}>Inca nu sunt meciuri la {p.label.toLowerCase()}.</div>}
          {p.list.map((m) => {
            const isGroup = m.phase === "grupe";
            const placeholder = m.isPlaceholder;
            return (
              <div key={m.id} style={{ borderTop: `1px solid ${C.line}`, padding: "12px 0" }}>
                <div style={{ fontSize: 14 }}>
                  <strong>{flag(m.home)} {m.home} – {m.away} {flag(m.away)}</strong>
                  <div style={{ fontSize: 12, color: C.inkSoft }}>
                    {m.group || phaseLabel(m.phase)} · {fmtDate(m.kickoff)}
                    {m.result && <strong style={{ color: C.navy }}> · Final: {m.result.pick} {m.result.score}</strong>}
                  </div>
                </div>
                {placeholder ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: C.inkSoft, fontStyle: "italic" }}>
                    Asteapta meciurile anterioare sa se incheie pentru a se stabili echipele.
                  </div>
                ) : !m.result ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                    {(isGroup ? ["1", "X", "2"] : ["1", "2"]).map((v) => (
                      <button key={v} onClick={() => setResultDraft((p) => ({ ...p, [m.id]: { ...(p[m.id] || {}), pick: v } }))}
                        style={{ ...st.btnSmall, background: (resultDraft[m.id] || {}).pick === v ? C.navy : "#fff", color: (resultDraft[m.id] || {}).pick === v ? "#fff" : C.ink }}>{v}</button>
                    ))}
                    <input style={{ ...st.input, width: 90, padding: "8px 10px" }} placeholder="scor 2-1"
                      value={(resultDraft[m.id] || {}).score || ""}
                      onChange={(e) => setResultDraft((p) => ({ ...p, [m.id]: { ...(p[m.id] || {}), score: e.target.value } }))} />
                    <button style={st.btnSmallPrimary} onClick={() => isGroup ? setResultGroup(m.id) : setResultKO(m.id)}>
                      Inchide meciul
                    </button>
                    {isGroup && (
                      <input type="datetime-local" title="Corecteaza ora" style={{ ...st.input, width: 200, padding: "8px 10px" }} value={m.kickoff}
                        onChange={(e) => setKickoff(m.id, e.target.value)} />
                    )}
                  </div>
                ) : (
                  <button style={{ ...st.btnGhostDanger, marginTop: 8 }} onClick={() => isGroup ? clearResultGroup(m.id) : clearResultKO(m.id)}>
                    anuleaza rezultatul
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <ManualOverride overrides={overrides} onOverride={onOverride} />
    </>
  );
}

function ManualOverride({ overrides, onOverride }) {
  const [slotInput, setSlotInput] = useState("");
  const [teamInput, setTeamInput] = useState("");
  return (
    <div style={st.card}>
      <h2 style={st.h2}>Suprascriere manuala</h2>
      <p style={{ fontSize: 12, color: C.inkSoft, margin: "4px 0 12px" }}>
        Daca FIFA descalifica o echipa sau ai nevoie sa inlocuiesti manual pe cineva intr-un slot,
        completeaza aici. Slot poate fi: "1A" (locul 1 grupa A), "2C", "3CEFHI", "W73" (castigator meci 73).
      </p>
      {Object.entries(overrides).length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {Object.entries(overrides).map(([slot, team]) => (
            <div key={slot} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: C.goldPale, borderRadius: 8, marginBottom: 4, fontSize: 13 }}>
              <span><strong>{slot}</strong> → {team}</span>
              <button onClick={() => onOverride(slot, null)} style={st.btnGhostDanger}>sterge</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
        <input style={st.input} placeholder="Slot (ex: 1A, W73)" value={slotInput} onChange={(e) => setSlotInput(e.target.value)} />
        <input style={st.input} placeholder="Echipa" value={teamInput} onChange={(e) => setTeamInput(e.target.value)} />
        <button style={st.btnSmallPrimary} onClick={() => {
          if (slotInput.trim() && teamInput.trim()) {
            onOverride(slotInput.trim(), teamInput.trim());
            setSlotInput(""); setTeamInput("");
          }
        }}>Adauga</button>
      </div>
    </div>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'Inter', -apple-system, 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@700;800&family=Inter:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; }
        body { margin: 0; }
        input:focus, select:focus { outline: 2px solid ${C.navy}; outline-offset: 1px; }
        button:focus-visible { outline: 2px solid ${C.navy}; outline-offset: 2px; }
      `}</style>
      {children}
    </div>
  );
}

const st = {
  h1: { fontFamily: "'Saira Condensed', 'Arial Narrow', sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: "0.01em", margin: "14px 0 0", textTransform: "uppercase" },
  h2: { fontFamily: "'Saira Condensed', 'Arial Narrow', sans-serif", fontSize: 22, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em", margin: 0, color: C.navy },
  card: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: "0 1px 3px rgba(11,31,75,0.06)" },
  label: { display: "block", fontSize: 12, fontWeight: 700, color: C.inkSoft, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" },
  input: { width: "100%", padding: "11px 12px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 15, background: "#fff", color: C.ink },
  btnPrimary: { padding: "12px 22px", borderRadius: 10, border: "none", background: C.red, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  btnSmall: { padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  btnSmallPrimary: { padding: "8px 16px", borderRadius: 8, border: "none", background: C.navy, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnGhostDanger: { padding: "6px 10px", borderRadius: 8, border: "none", background: "transparent", color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "underline" },
  empty: { background: C.card, border: `1px dashed ${C.line}`, borderRadius: 14, padding: "36px 20px", textAlign: "center", color: C.inkSoft, fontSize: 14 },
};
