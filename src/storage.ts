import { Counts, DEFAULT_SETTINGS, Settings } from './calc';

// 모든 데이터는 이 폰의 브라우저 안에만 저장된다 (서버 없음).

export interface Person {
  id: string;
  name: string;
  intern: boolean;
}

export interface ResultRow {
  name: string;
  intern: boolean;
  items: Counts;
}

export interface HistoryEntry {
  id: string;
  date: string; // ISO
  counts: Counts;
  mode: 'bags' | 'even';
  rows: ResultRow[];
}

const KEY = { roster: 'cc.roster', settings: 'cc.settings', history: 'cc.history', last: 'cc.lastPicked' };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 공간이 없거나 막힌 경우: 화면은 계속 동작 */
  }
}

export const loadRoster = () => read<Person[]>(KEY.roster, []);
export const saveRoster = (v: Person[]) => write(KEY.roster, v);
// 설정 판 번호. 기본값을 바꿀 때 올리고, 예전 폰에 저장된 값을 새 기본값으로 바꿔 준다.
const SETTINGS_VERSION = 2;
type StoredSettings = Partial<Settings> & { v?: number };

export const loadSettings = (): Settings => {
  const stored = read<StoredSettings>(KEY.settings, {});
  // 판 2 (2026-11-18): "1천원 담당은 1천원만" 기본값을 끔으로
  if ((stored.v ?? 1) < 2) delete stored.oneKOnly;
  const { v: _v, ...rest } = stored;
  return { ...DEFAULT_SETTINGS, ...rest };
};
export const saveSettings = (v: Settings) => write(KEY.settings, { ...v, v: SETTINGS_VERSION });
export const loadHistory = () => read<HistoryEntry[]>(KEY.history, []);
export const saveHistory = (v: HistoryEntry[]) => write(KEY.history, v);
export const loadLastPicked = () => read<string[]>(KEY.last, []);
export const saveLastPicked = (v: string[]) => write(KEY.last, v);

export const newId = () => Math.random().toString(36).slice(2, 10);
