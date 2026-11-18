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
export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEY.settings, {}) });
export const saveSettings = (v: Settings) => write(KEY.settings, v);
export const loadHistory = () => read<HistoryEntry[]>(KEY.history, []);
export const saveHistory = (v: HistoryEntry[]) => write(KEY.history, v);
export const loadLastPicked = () => read<string[]>(KEY.last, []);
export const saveLastPicked = (v: string[]) => write(KEY.last, v);

export const newId = () => Math.random().toString(36).slice(2, 10);
