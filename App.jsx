import React, { useState, useEffect, useCallback, useRef } from "react";
import { SEED_MATCHES, SEED_VERSION, FLAGS } from "./seed";
import {
  getState,
  saveState,
  joinUser,
  saveUserDoc,
  subscribeUsers,
  subscribeState,
} from "./firebase";

// Paleta CM 2026: cele trei tari gazda — SUA (albastru), Canada (rosu), Mexic (verde).
const C = {
  bg: "#F4F5FA", card: "#FFFFFF", ink: "#13182B", inkSoft: "#5B6172", line: "#DEE1EC",
  navy: "#0B1F4B", navyDark: "#071536", green: "#1D8A4E", greenPale: "#E5F3EA",
  red: "#D32638", redPale: "#FBE7E9", gold: "#D99A1B", goldPale: "#FBF1DA",
};

const flag = (t) => FLAGS[t] || "⚽";

const PHASES = [
  { id: "grupe", label: "Grupe" },
  { id: "16imi", label: "16-imi" },
  { id: "optimi", label: "Optimi" },
  { id: "sferturi", label: "Sferturi" },
  { id: "semi", label: "Semifinale" },
  { id: "finala", label: "Finala" },
];
const phaseLabel = (id) => (PHASES.find((p) => p.id === id) || {}).label || id;

// ── stocare locala (pronosticuri private pe device) ──────────
const LS = {
  get(k) {
    try {
      return JSON.parse(localStorage.getItem(k));
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
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
  const [matches, setMatches] = useState([]);
  const [myPicks, setMyPicks] = useState({}); // { matchId: '1'|'X'|'2' } — doar pe device
  const [usersData, setUsersData] = useState({}); // { name: { commits, reveals } }
  const [tab, setTab] = useState("grupe");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [now, setNow] = useState(Date.now());
  const seedingDone = useRef(false);

  const users = Object.keys(usersData).sort();
  const isAdmin = me && adminName && me === adminName;
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  // ── seed / migrare in Firestore (o singura data) ──
  const ensureSeed = useCallback(async () => {
    if (seedingDone.current) return;
    seedingDone.current = true;
    const state = await getState();
    if (!state || (state.seedVersion || 0) < SEED_VERSION) {
      const old = (state && state.matches) || [];
      const keepOther = old.filter((x) => x.phase !== "grupe");
      const oldResults = {};
      old.forEach((x) => {
        if (x.result) oldResults[`${x.home}|${x.away}`] = x.result;
      });
      const merged = SEED_MATCHES.map((x) =>
        oldResults[`${x.home}|${x.away}`] ? { ...x, result: oldResults[`${x.home}|${x.away}`] } : x
      );
      await saveState({ matches: [...merged, ...keepOther], seedVersion: SEED_VERSION });
    }
  }, []);

  // ── init: abonamente live ──
  useEffect(() => {
    const savedName = LS.get("me");
    const savedPicks = LS.get("mypicks") || {};
    setMyPicks(savedPicks);

    let unsubState, unsubUsers;
    (async () => {
      try {
        await ensureSeed();
      } catch (e) {
        console.error(e);
      }
      unsubState = subscribeState((s) => {
        if (s) {
          if (s.matches) setMatches(s.matches);
          if (s.admin) setAdminName(s.admin);
        }
      });
      unsubUsers = subscribeUsers((u) => setUsersData(u));
      if (savedName) {
        setMe(savedName);
        setScreen("main");
      } else {
        setScreen("onboard");
      }
    })();

    return () => {
      unsubState && unsubState();
      unsubUsers && unsubUsers();
    };
  }, [ensureSeed]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // ── desigilare automata dupa final ──
  useEffect(() => {
    if (!me || !usersData[me]) return;
    const mine = usersData[me].reveals || {};
    const finishedIds = matches.filter((m) => m.result).map((m) => m.id);
    const pending = finishedIds.filter((id) => myPicks[id] && !mine[id]);
    if (pending.length === 0) return;
    const next = { ...mine };
    pending.forEach((id) => {
      next[id] = myPicks[id];
    });
    saveUserDoc(me, { reveals: next }).catch(console.error);
  }, [matches, myPicks, usersData, me]);

  const register = async () => {
    const name = nameInput.trim();
    if (name.length < 2) return showToast("Alege un nume de minim 2 caractere.");
    if (/[/\\'".#$[\]]/.test(name)) return showToast("Fara ghilimele, slash sau caractere speciale in nume.");
    setBusy(true);
    try {
      await joinUser(name);
      const state = await getState();
      if (!state || !state.admin) {
        await saveState({ admin: name });
        setAdminName(name);
      }
      LS.set("me", name);
      setMe(name);
      setScreen("main");
    } catch (e) {
      console.error(e);
      showToast("Eroare de conectare. Verifica internetul.");
    }
    setBusy(false);
  };

  const placeBet = async (matchId, pick) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;
    if (new Date(match.kickoff).getTime() <= Date.now())
      return showToast("Meciul a inceput - pariurile sunt inchise.");
    const nextPicks = { ...myPicks };
    const myCommits = { ...((usersData[me] && usersData[me].commits) || {}) };
    if (nextPicks[matchId] === pick) {
      delete nextPicks[matchId];
      delete myCommits[matchId];
    } else {
      nextPicks[matchId] = pick;
      myCommits[matchId] = true; // doar marcam ca a pariat; continutul ramane pe device
    }
    setMyPicks(nextPicks);
    LS.set("mypicks", nextPicks);
    try {
      await saveUserDoc(me, { commits: myCommits });
    } catch (e) {
      showToast("Nu s-a putut salva. Incearca din nou.");
    }
  };

  const saveMatches = async (next) => {
    setMatches(next);
    try {
      await saveState({ matches: next });
      showToast("Salvat.");
    } catch {
      showToast("Eroare la salvare.");
    }
  };

  const finished = matches.filter((m) => m.result);
  const standings = users
    .map((u) => {
      const commits = (usersData[u] && usersData[u].commits) || {};
      const reveals = (usersData[u] && usersData[u].reveals) || {};
      let pts = 0, played = 0, sealed = 0;
      finished.forEach((m) => {
        const hasCommit = !!commits[m.id];
        const rev = reveals[m.id];
        if (hasCommit && !rev) sealed++;
        if (rev) {
          played++;
          if (rev === m.result.pick) pts++;
        }
      });
      return { name: u, pts, played, sealed };
    })
    .sort((a, b) => b.pts - a.pts || a.played - b.played || a.name.localeCompare(b.name));

  if (screen === "loading")
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "120px 20px", color: C.inkSoft }}>
          Se incalzeste gazonul...
        </div>
      </Shell>
    );

  if (screen === "onboard")
    return (
      <Shell>
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "64px 20px" }}>
          <div style={{ fontSize: 44, lineHeight: 1 }}>🏆</div>
          <h1 style={{ ...st.h1, color: C.navy }}>Pariul din birou</h1>
          <p style={{ color: C.inkSoft, margin: "10px 0 28px", lineHeight: 1.55 }}>
            Miza: respectul colegilor. Alegi 1 / X / 2 inainte de start, biletul ramane
            ascuns pana la fluierul final — nimeni nu trage cu ochiul. Scuzele de dupa meci
            nu puncteaza.
          </p>
          <label style={st.label}>Cum te stiu colegii</label>
          <input
            style={st.input}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && register()}
            placeholder="ex: Dada"
            maxLength={24}
          />
          <button style={{ ...st.btnPrimary, width: "100%", marginTop: 14 }} onClick={register} disabled={busy}>
            {busy ? "Intru pe teren..." : "Intra in joc"}
          </button>
          <p style={{ color: C.inkSoft, fontSize: 12, marginTop: 16, lineHeight: 1.5 }}>
            Foloseste acelasi nume pe toate dispozitivele tale. Biletele se salveaza pe
            dispozitivul de pe care le pui.
          </p>
        </div>
      </Shell>
    );

  const tabMatches = matches
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
              <h1 style={{ ...st.h1, color: "#fff", margin: "2px 0 0" }}>Pariul din birou</h1>
            </div>
            <div style={{ textAlign: "right", fontSize: 13 }}>
              <span style={{ opacity: 0.75 }}>{isAdmin ? "arbitru · " : ""}</span>
              <strong>{me}</strong>
              <button
                onClick={() => {
                  LS.set("me", null);
                  setMe(null);
                  setNameInput("");
                  setScreen("onboard");
                }}
                style={{ background: "none", border: "none", color: "#fff", opacity: 0.55, cursor: "pointer", marginLeft: 8, fontSize: 12, textDecoration: "underline" }}
              >
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
            {[...PHASES, { id: "clasament", label: "🏆 Clasament" }, ...(isAdmin ? [{ id: "admin", label: "⚙ Arbitru" }] : [])].map((p) => (
              <button
                key={p.id}
                onClick={() => setTab(p.id)}
                style={{
                  border: "none", cursor: "pointer", whiteSpace: "nowrap", padding: "9px 14px",
                  fontSize: 13, fontWeight: 600, borderRadius: "8px 8px 0 0",
                  background: tab === p.id ? C.bg : "rgba(255,255,255,0.08)",
                  color: tab === p.id ? C.navy : "rgba(255,255,255,0.85)",
                }}
              >
                {p.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px 60px" }}>
        {tab === "clasament" ? (
          <Leaderboard standings={standings} finishedCount={finished.length} me={me} />
        ) : tab === "admin" ? (
          <AdminPanel matches={matches} onSave={saveMatches} />
        ) : tabMatches.length === 0 ? (
          <div style={st.empty}>
            Niciun meci adaugat inca la {phaseLabel(tab)}.{" "}
            {isAdmin ? "Adauga-le din tabul Arbitru cand se stiu echipele." : "Arbitrul le va adauga cand se stiu echipele."}
          </div>
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
  const started = new Date(match.kickoff).getTime() <= now;
  const done = !!match.result;
  const myPick = myPicks[match.id] || null;
  const betsCount = users.filter((u) => ((usersData[u] && usersData[u].commits) || {})[match.id]).length;

  const status = done
    ? { txt: "Final", bg: "#E8EBF5", col: C.navy }
    : started
    ? { txt: "Pariuri inchise", bg: C.goldPale, col: "#8A6510" }
    : { txt: "Deschis", bg: C.greenPale, col: C.green };

  const PickBtn = ({ val, label }) => {
    const active = myPick === val;
    return (
      <button
        onClick={() => onPick(match.id, val)}
        disabled={started}
        style={{
          flex: 1, padding: "12px 0", borderRadius: 10, fontSize: 15, fontWeight: 700,
          cursor: started ? "default" : "pointer",
          border: `2px solid ${active ? C.navy : C.line}`,
          background: active ? C.navy : "#fff",
          color: active ? "#fff" : started ? C.line : C.ink, transition: "all .15s",
        }}
      >
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
          ) : (
            <span style={{ fontSize: 13, color: C.inkSoft, fontWeight: 600 }}>vs</span>
          )}
        </div>
        <TeamSide team={match.away} align="right" />
      </div>

      {!done && (
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

      {done && <Reveal match={match} users={users} usersData={usersData} me={me} />}
    </div>
  );
}

function TeamSide({ team, align }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, flexDirection: align === "right" ? "row-reverse" : "row" }}>
      <span style={{ fontSize: 26 }}>{flag(team)}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: C.ink, textAlign: align }}>{team}</span>
    </div>
  );
}

function Reveal({ match, users, usersData, me }) {
  const r = match.result;
  const winLabel = r.pick === "1" ? match.home : r.pick === "2" ? match.away : "Egal";
  const rows = users
    .map((u) => ({
      name: u,
      committed: !!((usersData[u] && usersData[u].commits) || {})[match.id],
      rev: ((usersData[u] && usersData[u].reveals) || {})[match.id],
    }))
    .filter((x) => x.committed);

  return (
    <div style={{ marginTop: 14, borderTop: `1px dashed ${C.line}`, paddingTop: 12 }}>
      <div style={{ fontSize: 13, marginBottom: 10 }}>
        Rezultat: <strong>{winLabel}</strong> ({r.pick})
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: C.inkSoft }}>Nimeni nu a pariat pe meciul asta. Lasi.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((x) => {
            if (!x.rev)
              return (
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

function AdminPanel({ matches, onSave }) {
  const [form, setForm] = useState({ phase: "16imi", group: "", home: "", away: "", kickoff: "" });
  const [resultDraft, setResultDraft] = useState({});

  const add = () => {
    if (!form.home.trim() || !form.away.trim() || !form.kickoff) return;
    onSave([...matches, { id: "m" + Date.now(), phase: form.phase, group: form.group.trim(), home: form.home.trim(), away: form.away.trim(), kickoff: form.kickoff }]);
    setForm({ phase: form.phase, group: form.group, home: "", away: "", kickoff: "" });
  };
  const setResult = (id) => {
    const d = resultDraft[id];
    if (!d || !d.pick) return;
    onSave(matches.map((m) => (m.id === id ? { ...m, result: { pick: d.pick, score: (d.score || "").trim() } } : m)));
  };
  const clearResult = (id) => onSave(matches.map((m) => (m.id === id ? { ...m, result: undefined } : m)));
  const remove = (id) => onSave(matches.filter((m) => m.id !== id));
  const setKickoff = (id, kickoff) => onSave(matches.map((m) => (m.id === id ? { ...m, kickoff } : m)));
  const sorted = [...matches].sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

  return (
    <>
      <div style={{ ...st.card, background: "#E8EBF5" }}>
        <div style={{ fontSize: 13, color: C.navy, lineHeight: 1.5 }}>
          <strong>Tu esti arbitrul.</strong> Inchizi meciurile cu 1/X/2 si scorul, si adaugi
          fazele eliminatorii cand se stabilesc echipele. Biletele colegilor nu-ti apar pana
          la final — nici tie.
        </div>
      </div>

      <div style={st.card}>
        <h2 style={st.h2}>Adauga meci</h2>
        <p style={{ fontSize: 12, color: C.inkSoft, margin: "4px 0 0" }}>
          Grupele sunt deja incarcate (program oficial, ora Romaniei). De aici adaugi fazele eliminatorii.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <div>
            <label style={st.label}>Faza</label>
            <select style={st.input} value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}>
              {PHASES.map((p) => (<option key={p.id} value={p.id}>{p.label}</option>))}
            </select>
          </div>
          <div>
            <label style={st.label}>Eticheta (optional)</label>
            <input style={st.input} value={form.group} placeholder="ex: Optimea 3" onChange={(e) => setForm({ ...form, group: e.target.value })} />
          </div>
          <div>
            <label style={st.label}>Gazde</label>
            <input style={st.input} value={form.home} placeholder="Romania 🤞" onChange={(e) => setForm({ ...form, home: e.target.value })} />
          </div>
          <div>
            <label style={st.label}>Oaspeti</label>
            <input style={st.input} value={form.away} onChange={(e) => setForm({ ...form, away: e.target.value })} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={st.label}>Data si ora startului (ora Romaniei)</label>
            <input type="datetime-local" style={st.input} value={form.kickoff} onChange={(e) => setForm({ ...form, kickoff: e.target.value })} />
          </div>
        </div>
        <button style={{ ...st.btnPrimary, marginTop: 14 }} onClick={add}>Adauga meciul</button>
      </div>

      <div style={st.card}>
        <h2 style={st.h2}>Meciuri ({sorted.length})</h2>
        {sorted.map((m) => (
          <div key={m.id} style={{ borderTop: `1px solid ${C.line}`, padding: "12px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontSize: 14 }}>
                <strong>{flag(m.home)} {m.home} – {m.away} {flag(m.away)}</strong>
                <div style={{ fontSize: 12, color: C.inkSoft }}>
                  {phaseLabel(m.phase)}{m.group ? ` · ${m.group}` : ""} · {fmtDate(m.kickoff)}
                  {m.result && <strong style={{ color: C.navy }}> · Final: {m.result.pick} {m.result.score}</strong>}
                </div>
              </div>
              <button onClick={() => remove(m.id)} style={st.btnGhostDanger}>sterge</button>
            </div>
            {!m.result ? (
              <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                {["1", "X", "2"].map((v) => (
                  <button key={v} onClick={() => setResultDraft((p) => ({ ...p, [m.id]: { ...(p[m.id] || {}), pick: v } }))} style={{ ...st.btnSmall, background: (resultDraft[m.id] || {}).pick === v ? C.navy : "#fff", color: (resultDraft[m.id] || {}).pick === v ? "#fff" : C.ink }}>{v}</button>
                ))}
                <input style={{ ...st.input, width: 90, padding: "8px 10px" }} placeholder="scor 2-1" value={(resultDraft[m.id] || {}).score || ""} onChange={(e) => setResultDraft((p) => ({ ...p, [m.id]: { ...(p[m.id] || {}), score: e.target.value } }))} />
                <button style={st.btnSmallPrimary} onClick={() => setResult(m.id)}>Inchide meciul</button>
                <input type="datetime-local" title="Corecteaza ora de start" style={{ ...st.input, width: 200, padding: "8px 10px" }} value={m.kickoff} onChange={(e) => setKickoff(m.id, e.target.value)} />
              </div>
            ) : (
              <button style={{ ...st.btnGhostDanger, marginTop: 8 }} onClick={() => clearResult(m.id)}>anuleaza rezultatul</button>
            )}
          </div>
        ))}
      </div>
    </>
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
