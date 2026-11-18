import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  adjust, Bag, Counts, Denom, DENOM_LABEL, DENOMS, emptyCounts, fiveKBagCount, planBags, planEven, Settings,
  suggestK1Bags, sumCounts,
} from './calc';
import {
  HistoryEntry, loadHistory, loadLastPicked, loadRoster, loadSettings, newId, Person, ResultRow, saveHistory,
  saveLastPicked, saveRoster, saveSettings,
} from './storage';
import { saveResultImage } from './resultImage';

type Screen = 'input' | 'people' | 'assign' | 'result' | 'roster' | 'settings' | 'history' | 'historyDetail';
type Mode = 'bags' | 'even';

export default function App() {
  const [screen, setScreen] = useState<Screen>('input');
  const [roster, setRoster] = useState<Person[]>(loadRoster);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [headcount, setHeadcount] = useState(6);
  const [picked, setPicked] = useState<string[]>(loadLastPicked);
  const [mode, setMode] = useState<Mode>('bags');
  const [k1Bags, setK1Bags] = useState(0);
  const [owners, setOwners] = useState<Record<string, string>>({}); // bagId -> personId
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [openHistory, setOpenHistory] = useState<HistoryEntry | null>(null);

  useEffect(() => { saveRoster(roster); }, [roster]);
  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { saveHistory(history); }, [history]);
  useEffect(() => { saveLastPicked(picked); }, [picked]);
  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  const team = useMemo(() => roster.filter((p) => picked.includes(p.id)), [roster, picked]);
  const interns = team.filter((p) => p.intern).length;

  const goAssign = () => {
    const n = team.length;
    setK1Bags(suggestK1Bags(counts, n, interns, settings));
    setOwners({});
    setMode(counts.k5 > 0 || counts.k1 === 0 ? 'bags' : 'even');
    setScreen('assign');
  };

  const finishBags = (bags: Bag[]) => {
    const byPerson = Object.fromEntries(Object.entries(owners).map(([b, p]) => [p, b]));
    setRows(team.map((p) => ({ name: p.name, intern: p.intern, items: { ...bags.find((b) => b.id === byPerson[p.id])!.items } })));
    setScreen('result');
  };

  const finishEven = () => {
    const res = planEven(counts, team.map((p) => p.intern), settings);
    setRows(team.map((p, i) => ({ name: p.name, intern: p.intern, items: res[i] })));
    setScreen('result');
  };

  const save = () => {
    setHistory([{ id: newId(), date: new Date().toISOString(), counts, mode, rows }, ...history].slice(0, 200));
    setCounts(emptyCounts());
    setRows([]);
    setScreen('history');
  };

  switch (screen) {
    case 'input':
      return <InputScreen counts={counts} setCounts={setCounts} settings={settings} onNext={() => setScreen('people')}
        onRoster={() => setScreen('roster')} onHistory={() => setScreen('history')} onSettings={() => setScreen('settings')} />;
    case 'people':
      return <PeopleScreen roster={roster} headcount={headcount} setHeadcount={setHeadcount} picked={picked} setPicked={setPicked}
        onBack={() => setScreen('input')} onNext={goAssign} onRoster={() => setScreen('roster')} />;
    case 'assign':
      return <AssignScreen counts={counts} team={team} interns={interns} settings={settings} mode={mode} setMode={setMode}
        k1Bags={k1Bags} setK1Bags={(k) => { setK1Bags(k); setOwners({}); }} owners={owners} setOwners={setOwners}
        onBack={() => setScreen('people')} onBags={finishBags} onEven={finishEven} />;
    case 'result':
      return <ResultScreen counts={counts} rows={rows} setRows={setRows} onBack={() => setScreen('assign')} onSave={save} />;
    case 'roster':
      return <RosterScreen roster={roster} setRoster={setRoster} settings={settings} onBack={() => setScreen('input')} />;
    case 'settings':
      return <SettingsScreen settings={settings} setSettings={setSettings} onBack={() => setScreen('input')} />;
    case 'history':
      return <HistoryScreen history={history} onBack={() => setScreen('input')}
        onOpen={(h) => { setOpenHistory(h); setScreen('historyDetail'); }} />;
    case 'historyDetail':
      return openHistory ? <HistoryDetail entry={openHistory} onBack={() => setScreen('history')}
        onDelete={() => { setHistory(history.filter((h) => h.id !== openHistory.id)); setScreen('history'); }} /> : null;
  }
}

/* ---------- 공통 ---------- */

function Top({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="top">
      {onBack && (
        <button className="icon-btn plain" aria-label="뒤로" onClick={onBack}>
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      )}
      <h1>{title}</h1>
      {right}
    </div>
  );
}

function BagIcon({ size = 24, fill = '#C98A3B', stroke = '#8A5A1E' }: { size?: number; fill?: string; stroke?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round">
      <path d="M9 3h6l-1 3h-4z" /><path d="M8 6h8c3 3 5 6 5 10a7 7 0 0 1-7 7h-4a7 7 0 0 1-7-7c0-4 2-7 5-10z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v11" /><path d="M7 10.5l5 5 5-5" /><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
    </svg>
  );
}

const itemsText = (c: Counts) => DENOMS.filter((d) => c[d] > 0).map((d) => `${DENOM_LABEL[d]} ${c[d]}`).join(' · ') || '없음';
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const w = '일월화수목금토'[d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${w}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function Stepper({ value, onChange, min = 0, max = 999, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="stepper">
      <button aria-label={`${label} 줄이기`} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <strong>{value}</strong>
      <button aria-label={`${label} 늘리기`} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}

/* ---------- 1. 오늘 입력 ---------- */

function InputScreen({ counts, setCounts, settings, onNext, onRoster, onHistory, onSettings }: {
  counts: Counts; setCounts: (c: Counts) => void; settings: Settings; onNext: () => void; onRoster: () => void; onHistory: () => void; onSettings: () => void;
}) {
  const total = sumCounts(counts);
  const set = (d: Denom, v: number) => setCounts({ ...counts, [d]: Math.max(0, Math.min(9999, Math.floor(v) || 0)) });
  const k5Bags = fiveKBagCount(counts.k5, settings);
  return (
    <div className="screen">
      <Top title="오늘 들어온 돈" right={
        <>
          <button className="icon-btn" aria-label="사람 목록" onClick={onRoster}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.6c2.6.2 4.6 1.9 5.3 4.9" /></svg>
          </button>
          <button className="icon-btn" aria-label="설정" onClick={onSettings}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
          </button>
        </>
      } />
      <p className="lead">권종별로 묶음 개수를 넣어 주세요. 안 들어온 권종은 0으로 두면 돼요.</p>
      {DENOMS.map((d) => (
        <div key={d} className={`row-input ${d === 'k5' || d === 'k1' ? 'warm' : ''}`}>
          <label htmlFor={`in-${d}`}>{DENOM_LABEL[d]}원</label>
          <div className="stepper">
            <button aria-label={`${DENOM_LABEL[d]}원 하나 줄이기`} onClick={() => set(d, counts[d] - 1)}>−</button>
            <input id={`in-${d}`} type="text" inputMode="numeric" pattern="[0-9]*" value={counts[d] || ''} placeholder="0"
              onFocus={(e) => e.target.select()} onChange={(e) => set(d, Number(e.target.value.replace(/\D/g, '')))} />
            <button aria-label={`${DENOM_LABEL[d]}원 하나 늘리기`} onClick={() => set(d, counts[d] + 1)}>+</button>
          </div>
        </div>
      ))}
      <div className="total-bar"><span className="label">전체</span><span className="num">{total}<span className="unit">개</span></span></div>
      {counts.k5 > 0 && (
        <p className="note warm">
          5천원이 {counts.k5}개라 {k5Bags === 2 ? `${settings.fiveKThreshold}개를 넘어서 두 명이 나누고, 각자 ${settings.fiveKLessLarge}개 적게` : `한 명이 다 맡고 ${settings.fiveKLessSmall}개 적게`} 받아요.
        </p>
      )}
      <div className="grow" />
      <div className="actions">
        <button className="btn secondary" onClick={onHistory}>지난 기록</button>
        <button className="btn primary" disabled={total === 0} onClick={onNext}>다음</button>
      </div>
    </div>
  );
}

/* ---------- 2. 사람 고르기 ---------- */

function PeopleScreen({ roster, headcount, setHeadcount, picked, setPicked, onBack, onNext, onRoster }: {
  roster: Person[]; headcount: number; setHeadcount: (n: number) => void; picked: string[]; setPicked: (p: string[]) => void;
  onBack: () => void; onNext: () => void; onRoster: () => void;
}) {
  const valid = picked.filter((id) => roster.some((p) => p.id === id));
  const n = valid.length;
  const toggle = (id: string) => setPicked(valid.includes(id) ? valid.filter((x) => x !== id) : [...valid, id]);
  let status: ReactNode;
  if (n === headcount) status = <div className="status ok">{n}명 골랐어요. 인원수와 맞습니다.</div>;
  else if (n < headcount) status = <div className="status warn">{headcount}명 중 {n}명 골랐어요. {headcount - n}명 더 눌러 주세요.</div>;
  else status = <div className="status bad">{headcount}명인데 {n}명을 골랐어요. {n - headcount}명을 빼 주세요.</div>;
  return (
    <div className="screen">
      <Top title="오늘 몇 명이 하나요?" onBack={onBack} />
      <div className="count-pick">
        <button aria-label="인원 줄이기" onClick={() => setHeadcount(Math.max(1, headcount - 1))}>−</button>
        <span className="num">{headcount}<span className="unit">명</span></span>
        <button aria-label="인원 늘리기" onClick={() => setHeadcount(Math.min(30, headcount + 1))}>+</button>
      </div>
      <p className="lead">누가 나왔는지 눌러 주세요.</p>
      {roster.length === 0 ? (
        <div className="empty">아직 등록된 사람이 없어요.<br /><button className="btn small primary" style={{ marginTop: 12 }} onClick={onRoster}>사람 등록하러 가기</button></div>
      ) : (
        <div className="grid2">
          {roster.map((p) => (
            <button key={p.id} className={`person ${valid.includes(p.id) ? 'on' : ''}`} aria-pressed={valid.includes(p.id)} onClick={() => toggle(p.id)}>
              <span>{p.name}</span>{p.intern && <span className="tag intern">인턴</span>}
            </button>
          ))}
        </div>
      )}
      <div className="grow" />
      {roster.length > 0 && status}
      <div className="actions">
        <button className="btn secondary" onClick={onRoster}>사람 목록</button>
        <button className="btn primary" disabled={n !== headcount || n === 0} onClick={onNext}>주머니 만들기</button>
      </div>
    </div>
  );
}

/* ---------- 3. 주머니 연결 ---------- */

function AssignScreen({ counts, team, interns, settings, mode, setMode, k1Bags, setK1Bags, owners, setOwners, onBack, onBags, onEven }: {
  counts: Counts; team: Person[]; interns: number; settings: Settings; mode: Mode; setMode: (m: Mode) => void;
  k1Bags: number; setK1Bags: (k: number) => void; owners: Record<string, string>; setOwners: (o: Record<string, string>) => void;
  onBack: () => void; onBags: (bags: Bag[]) => void; onEven: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const plan = useMemo(() => planBags(counts, team.length, interns, k1Bags, settings), [counts, team.length, interns, k1Bags, settings]);
  const bagOf = (pid: string) => plan.bags.find((b) => owners[b.id] === pid);
  const done = plan.bags.every((b) => owners[b.id]);
  const maxK1 = Math.max(1, team.length - plan.k5Bags - 1);

  const pickBag = (b: Bag) => {
    if (owners[b.id]) {
      const next = { ...owners }; delete next[b.id]; setOwners(next); return;
    }
    if (!selected) return;
    const next = { ...owners };
    for (const k of Object.keys(next)) if (next[k] === selected) delete next[k];
    next[b.id] = selected;
    setOwners(next);
    setSelected(null);
  };

  const autoFill = () => {
    const next = { ...owners };
    const free = team.filter((p) => !Object.values(next).includes(p.id));
    const openBags = plan.bags.filter((b) => !next[b.id]);
    const take = (pred: (p: Person) => boolean) => { const i = free.findIndex(pred); return i >= 0 ? free.splice(i, 1)[0] : undefined; };
    for (const b of openBags.filter((x) => x.kind === 'intern')) { const p = take((x) => x.intern) ?? take(() => true); if (p) next[b.id] = p.id; }
    for (const b of openBags.filter((x) => x.kind !== 'intern')) { const p = take((x) => !x.intern) ?? take(() => true); if (p) next[b.id] = p.id; }
    setOwners(next);
    setSelected(null);
  };

  const mismatch = plan.bags.some((b) => owners[b.id] && b.kind === 'intern' && !team.find((p) => p.id === owners[b.id])?.intern);
  const hint = selected ? `${team.find((p) => p.id === selected)?.name} 님에게 줄 주머니를 눌러 주세요.`
    : '사람을 누른 다음 주머니를 누르면 연결돼요. 연결된 주머니를 다시 누르면 풀려요.';

  return (
    <div className="screen">
      <Top title={mode === 'bags' ? '주머니를 이어 주세요' : '다 같이 나누기'} onBack={onBack} />
      <div className="mode" role="group" aria-label="나누는 방식">
        <button className={mode === 'bags' ? 'on' : ''} aria-pressed={mode === 'bags'} onClick={() => setMode('bags')}>권종별 주머니</button>
        <button className={mode === 'even' ? 'on' : ''} aria-pressed={mode === 'even'} onClick={() => setMode('even')}>다 같이 나누기</button>
      </div>

      {mode === 'even' ? (
        <>
          <p className="lead">모든 권종을 {team.length}명이 고르게 나눠요.{interns > 0 && ` 인턴은 ${settings.internLess}개 적게 받아요.`} 1천원이 많은 날 주머니로 나누면 몇 사람만 잔돈을 떠안을 때 쓰세요.</p>
          <div className="grow" />
          <div className="actions"><button className="btn primary" onClick={onEven}>다음</button></div>
        </>
      ) : (
        <>
          {counts.k1 > 0 && (
            <div className="k1-ctl">
              <span>1천원 맡을 사람</span>
              <div className="stepper">
                <button aria-label="1천원 담당 줄이기" onClick={() => setK1Bags(Math.max(1, k1Bags - 1))}>−</button>
                <strong>{k1Bags}</strong>
                <button aria-label="1천원 담당 늘리기" onClick={() => setK1Bags(Math.min(maxK1, k1Bags + 1))}>+</button>
              </div>
            </div>
          )}
          <p className="lead" style={{ marginTop: 0 }}>{hint}</p>
          <div className="cols">
            <div className="col">
              {team.map((p) => {
                const bag = bagOf(p.id);
                const isSel = selected === p.id;
                return (
                  <button key={p.id} className={`slot ${bag ? 'has' : ''} ${isSel ? 'sel' : ''}`} aria-pressed={isSel} onClick={() => setSelected(isSel ? null : p.id)}>
                    <span className="name">{p.name}{p.intern && <span className="tag intern">인턴</span>}</span>
                    {bag ? <span className="got"><BagIcon size={18} fill="#D9DDE3" stroke="#9AA1AD" />{bag.total}개</span> : <span className="sub">{isSel ? '주머니를 눌러 주세요' : '비어 있음'}</span>}
                  </button>
                );
              })}
            </div>
            <div className="col">
              {plan.bags.map((b) => {
                const owner = team.find((p) => p.id === owners[b.id]);
                return (
                  <button key={b.id} className={`bag ${b.kind} ${owner ? 'taken' : ''}`} onClick={() => pickBag(b)}
                    aria-label={`${b.total}개 주머니, ${itemsText(b.items)}${owner ? `, ${owner.name} 연결됨` : ''}`}>
                    <span className="head">
                      <BagIcon size={26} fill={owner ? '#D9DDE3' : b.kind === 'k5' || b.kind === 'k1' ? '#E9B36A' : '#C98A3B'} stroke={owner ? '#9AA1AD' : '#8A5A1E'} />
                      <span className="num">{b.total}<small>개</small></span>
                      <span className="tags">
                        {b.kind === 'intern' && <span className="tag intern">인턴</span>}
                        {owner && <span className="tag owner">{owner.name}</span>}
                      </span>
                    </span>
                    <span className="detail">
                      {DENOMS.filter((d) => b.items[d] > 0).map((d) => <span key={d}>{DENOM_LABEL[d]} {b.items[d]}</span>)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {mismatch && <div className="status warn">인턴 주머니가 인턴이 아닌 분에게 연결돼 있어요. 괜찮으면 그대로 두셔도 돼요.</div>}
          <div className="grow" />
          <p className="note" style={{ textAlign: 'center', color: 'var(--sub)' }}>
            주머니 {plan.bags.length}개 중 {Object.keys(owners).filter((k) => plan.bags.some((b) => b.id === k)).length}개 연결됨 · 기준 {plan.base}개
          </p>
          <div className="actions">
            {!done && <button className="btn secondary" onClick={autoFill}>나머지 자동 연결</button>}
            <button className="btn primary" disabled={!done} onClick={() => onBags(plan.bags)}>다음</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- 4. 결과 ---------- */

function ResultTable({ rows, sel, onCell }: { rows: ResultRow[]; sel?: { r: number; d: Denom } | null; onCell?: (r: number, d: Denom) => void }) {
  const col = (d: Denom) => rows.reduce((a, r) => a + r.items[d], 0);
  return (
    <div className="table">
      <div className="tr head"><span>이름</span>{DENOMS.map((d) => <span key={d} className="r">{DENOM_LABEL[d]}</span>)}<span className="r">합계</span></div>
      {rows.map((row, i) => (
        <div key={i} className={`tr ${row.items.k5 || row.items.k1 ? 'warm' : ''}`}>
          <span className="nm"><span>{row.name}</span>{row.intern && <span className="tag intern">인턴</span>}</span>
          {DENOMS.map((d) => onCell ? (
            <button key={d} className={`cell ${row.items[d] ? '' : 'zero'} ${sel && sel.r === i && sel.d === d ? 'sel' : ''}`}
              aria-label={`${row.name} ${DENOM_LABEL[d]} ${row.items[d]}개, 눌러서 고치기`} onClick={() => onCell(i, d)}>{row.items[d]}</button>
          ) : <span key={d} className={`r ${row.items[d] ? '' : 'cell zero'}`}>{row.items[d]}</span>)}
          <span className="t">{sumCounts(row.items)}</span>
        </div>
      ))}
      <div className="tr sum"><span className="nm">합계</span>{DENOMS.map((d) => <span key={d} className="r">{col(d)}</span>)}<span className="t">{rows.reduce((a, r) => a + sumCounts(r.items), 0)}</span></div>
    </div>
  );
}

function ResultScreen({ counts, rows, setRows, onBack, onSave }: {
  counts: Counts; rows: ResultRow[]; setRows: (r: ResultRow[]) => void; onBack: () => void; onSave: () => void;
}) {
  const [sel, setSel] = useState<{ r: number; d: Denom } | null>(null);
  const [dir, setDir] = useState<1 | -1 | null>(null);
  const ok = DENOMS.every((d) => rows.reduce((a, r) => a + r.items[d], 0) === counts[d]);
  const move = (other: number) => {
    if (!sel || !dir) return;
    const next = adjust(rows.map((r) => r.items), sel.r, sel.d, dir, other);
    if (next) setRows(rows.map((r, i) => ({ ...r, items: next[i] })));
  };
  const pickCell = (r: number, d: Denom) => {
    setSel(sel && sel.r === r && sel.d === d ? null : { r, d });
    setDir(null);
  };
  // +면 그 권종을 가진 사람에게서 빼 오고, −면 아무에게나 줄 수 있다
  const partners = sel && dir ? rows.map((row, i) => ({ row, i })).filter(({ row, i }) => i !== sel.r && (dir === -1 || row.items[sel.d] > 0)) : [];
  const now = new Date();
  return (
    <div className="screen">
      <Top title="오늘 배분 결과" onBack={onBack} />
      <p className="lead">{now.getMonth() + 1}월 {now.getDate()}일 · {rows.length}명 · 전체 {sumCounts(counts)}개. 숫자를 누르면 고칠 수 있어요.</p>
      <ResultTable rows={rows} sel={sel} onCell={pickCell} />
      {sel && (
        <div className="editbar">
          <div className="editrow">
            <span className="what">{rows[sel.r].name} · {DENOM_LABEL[sel.d]} <strong>{rows[sel.r].items[sel.d]}</strong>개</span>
            <div className="stepper">
              <button aria-label="하나 줄이기" aria-pressed={dir === -1} className={dir === -1 ? 'on' : ''} disabled={rows[sel.r].items[sel.d] <= 0} onClick={() => setDir(dir === -1 ? null : -1)}>−</button>
              <button aria-label="하나 늘리기" aria-pressed={dir === 1} className={dir === 1 ? 'on' : ''} onClick={() => setDir(dir === 1 ? null : 1)}>+</button>
            </div>
          </div>
          {dir && (
            <>
              <p className="ask">{dir === 1 ? `누구의 ${DENOM_LABEL[sel.d]}에서 1개 가져올까요?` : `누구에게 ${DENOM_LABEL[sel.d]} 1개를 줄까요?`}</p>
              {partners.length === 0 ? <p className="ask">{DENOM_LABEL[sel.d]}을 가진 다른 사람이 없어요.</p> : (
                <div className="partners">
                  {partners.map(({ row, i }) => (
                    <button key={i} onClick={() => move(i)}>
                      <span className="pn">{row.name}</span><span className="pc">{DENOM_LABEL[sel.d]} {row.items[sel.d]} · 합계 {sumCounts(row.items)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
      <div className={`status ${ok ? 'ok' : 'bad'}`}>{ok ? '권종별 합계가 입력한 개수와 모두 맞아요.' : '권종별 합계가 입력한 개수와 달라요. 숫자를 확인해 주세요.'}</div>
      <div className="grow" />
      <div className="actions">
        <button className="btn secondary" onClick={onBack}>이전</button>
        <button className="btn primary" disabled={!ok} onClick={onSave}>저장하기</button>
        <button className="btn square" aria-label="결과를 그림으로 내려받기" title="그림으로 내려받기" onClick={() => saveResultImage(rows, counts)}>
          <DownloadIcon />
        </button>
      </div>
    </div>
  );
}

/* ---------- 사람 목록 ---------- */

function RosterScreen({ roster, setRoster, settings, onBack }: { roster: Person[]; setRoster: (r: Person[]) => void; settings: Settings; onBack: () => void }) {
  const [name, setName] = useState('');
  const add = () => {
    const n = name.trim();
    if (!n) return;
    setRoster([...roster, { id: newId(), name: n, intern: false }]);
    setName('');
  };
  return (
    <div className="screen">
      <Top title="함께 일하는 사람" onBack={onBack} />
      <p className="lead">인턴은 다른 사람보다 {settings.internLess}개 적게 받아요. 사람이 바뀌면 여기서만 고치면 됩니다.</p>
      <div className="list">
        {roster.length === 0 && <div className="empty">아래에 이름을 넣고 추가를 눌러 주세요.</div>}
        {roster.map((p) => (
          <div key={p.id} className="item">
            <span className="main">{p.name}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className={`toggle ${p.intern ? 'on' : ''}`} aria-pressed={p.intern} aria-label={`${p.name} 인턴`}
                onClick={() => setRoster(roster.map((x) => (x.id === p.id ? { ...x, intern: !x.intern } : x)))}>
                <span className="knob" />인턴
              </button>
              <button className="icon-btn plain" aria-label={`${p.name} 삭제`}
                onClick={() => { if (confirm(`${p.name} 님을 목록에서 뺄까요?`)) setRoster(roster.filter((x) => x.id !== p.id)); }}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A93A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
              </button>
            </span>
          </div>
        ))}
      </div>
      <form className="add" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <label htmlFor="new-name" className="sr">새 이름</label>
        <input id="new-name" type="text" placeholder="새 이름" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn small primary" style={{ flex: '0 0 auto', minHeight: 56 }}>추가</button>
      </form>
      <div className="grow" />
      <div className="actions"><button className="btn secondary" style={{ flex: 1 }} onClick={onBack}>완료</button></div>
    </div>
  );
}

/* ---------- 설정 ---------- */

function SettingsScreen({ settings, setSettings, onBack }: { settings: Settings; setSettings: (s: Settings) => void; onBack: () => void }) {
  const num = (key: keyof Settings, title: string, sub: string, max = 30) => (
    <div className="setting">
      <span className="txt">{title}<small>{sub}</small></span>
      <Stepper label={title} value={settings[key] as number} max={max} onChange={(v) => setSettings({ ...settings, [key]: v })} />
    </div>
  );
  return (
    <div className="screen">
      <Top title="나누는 규칙" onBack={onBack} />
      <p className="lead">기본값은 엄마 규칙이에요. 현장에서 숫자가 바뀔 때만 고치세요.</p>
      <div className="section">5천원</div>
      {num('fiveKThreshold', '두 명이 나누는 기준', '5천원이 이 개수를 넘으면 두 명이 나눠요')}
      {num('fiveKLessSmall', '기준 이하일 때', '5천원 담당이 몇 개 적게 받을지')}
      {num('fiveKLessLarge', '기준을 넘을 때', '5천원 담당이 몇 개 적게 받을지')}
      <div className="section">1천원</div>
      <div className="setting">
        <span className="txt">1천원 담당은 1천원만<small>끄면 기준보다 {settings.oneKLess}개 적게까지 다른 권종으로 채워요</small></span>
        <button className={`toggle blue ${settings.oneKOnly ? 'on' : ''}`} aria-pressed={settings.oneKOnly} onClick={() => setSettings({ ...settings, oneKOnly: !settings.oneKOnly })}>
          <span className="knob" />{settings.oneKOnly ? '켬' : '끔'}
        </button>
      </div>
      {num('oneKLess', '1천원 담당', '몇 개 적게 받을지')}
      <div className="section">인턴</div>
      {num('internLess', '인턴', '다른 사람보다 몇 개 적게 받을지', 10)}
      <div className="grow" />
      <div className="actions"><button className="btn secondary" style={{ flex: 1 }} onClick={onBack}>완료</button></div>
    </div>
  );
}

/* ---------- 지난 기록 ---------- */

function HistoryScreen({ history, onBack, onOpen }: { history: HistoryEntry[]; onBack: () => void; onOpen: (h: HistoryEntry) => void }) {
  return (
    <div className="screen">
      <Top title="지난 기록" onBack={onBack} />
      <div className="list" style={{ marginTop: 8 }}>
        {history.length === 0 && <div className="empty">저장한 배분이 아직 없어요.</div>}
        {history.map((h) => (
          <button key={h.id} className="item" onClick={() => onOpen(h)}>
            <span><span className="main" style={{ display: 'block' }}>{fmtDate(h.date)}</span><span className="meta">{h.rows.length}명 · 전체 {sumCounts(h.counts)}개 · {itemsText(h.counts)}</span></span>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8A93A3" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        ))}
      </div>
      <div className="grow" />
      <div className="actions"><button className="btn primary" onClick={onBack}>새로 나누기</button></div>
    </div>
  );
}

function HistoryDetail({ entry, onBack, onDelete }: { entry: HistoryEntry; onBack: () => void; onDelete: () => void }) {
  return (
    <div className="screen">
      <Top title={fmtDate(entry.date)} onBack={onBack} />
      <p className="lead">{entry.rows.length}명 · 전체 {sumCounts(entry.counts)}개 · {entry.mode === 'even' ? '다 같이 나누기' : '권종별 주머니'}</p>
      <ResultTable rows={entry.rows} />
      <div className="grow" />
      <div className="actions">
        <button className="btn secondary" onClick={() => { if (confirm('이 기록을 지울까요?')) onDelete(); }}>지우기</button>
        <button className="btn primary" onClick={onBack}>목록으로</button>
      </div>
    </div>
  );
}
