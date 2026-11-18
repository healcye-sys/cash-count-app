// 배분 계산 규칙. 화면과 분리해 두어 테스트로 고정한다.
// 규칙 출처: 엄마 녹음(2026-11-06)과 실제 사례 1~5 (요구사항/실제-사례.md).

export type Denom = 'm50' | 'm10' | 'k5' | 'k1';
export const DENOMS: Denom[] = ['m50', 'm10', 'k5', 'k1'];
export const DENOM_LABEL: Record<Denom, string> = { m50: '5만', m10: '1만', k5: '5천', k1: '1천' };

export type Counts = Record<Denom, number>;

export interface Settings {
  internLess: number; // 인턴은 다른 사람보다 몇 개 적게 (기본 3)
  fiveKThreshold: number; // 5천원이 이 개수를 넘으면 두 명이 나눔 (기본 10)
  fiveKLessSmall: number; // 5천원이 기준 이하일 때 담당자 감소량 (기본 5)
  fiveKLessLarge: number; // 5천원이 기준 초과일 때 담당자 감소량 (기본 10)
  oneKLess: number; // 1천원 담당자 감소량 (기본 5)
  oneKOnly: boolean; // true: 1천원 담당은 1천원만 한다. false(기본, 2026-11-18): 기준−5까지 다른 권종으로 채운다
}

export const DEFAULT_SETTINGS: Settings = {
  internLess: 3,
  fiveKThreshold: 10,
  fiveKLessSmall: 5,
  fiveKLessLarge: 10,
  oneKLess: 5,
  oneKOnly: false,
};

export type BagKind = 'big' | 'intern' | 'k5' | 'k1';

export interface Bag {
  id: string;
  kind: BagKind;
  less: number; // 기준보다 몇 개 적게
  items: Counts;
  total: number;
}

export interface BagPlan {
  base: number; // 기준 B (5만·1만 담당이 받는 개수)
  bags: Bag[];
  k1Bags: number; // 1천원 주머니 개수
  k5Bags: number;
}

export const emptyCounts = (): Counts => ({ m50: 0, m10: 0, k5: 0, k1: 0 });
export const sumCounts = (c: Counts) => c.m50 + c.m10 + c.k5 + c.k1;

/** n개를 k명에게 최대한 고르게 (앞사람이 1개 더). */
export function splitEven(n: number, k: number): number[] {
  if (k <= 0) return [];
  const q = Math.floor(n / k);
  const r = n - q * k;
  return Array.from({ length: k }, (_, i) => q + (i < r ? 1 : 0));
}

/** 5천원 주머니 수: 0개면 0, 기준 이하면 1, 넘으면 2. */
export function fiveKBagCount(k5: number, s: Settings): number {
  if (k5 <= 0) return 0;
  return k5 > s.fiveKThreshold ? 2 : 1;
}

interface Spec {
  kind: BagKind;
  less: number;
  fixedK1?: number; // oneKOnly일 때 1천원 주머니의 고정 크기
}

function buildSpecs(counts: Counts, people: number, interns: number, k1Bags: number, s: Settings): Spec[] {
  const specs: Spec[] = [];
  const k5n = Math.min(fiveKBagCount(counts.k5, s), people);
  const k5Less = counts.k5 > s.fiveKThreshold ? s.fiveKLessLarge : s.fiveKLessSmall;
  for (let i = 0; i < k5n; i++) specs.push({ kind: 'k5', less: k5Less });
  const k1n = Math.max(0, Math.min(k1Bags, people - specs.length));
  const k1Split = splitEven(counts.k1, k1n);
  for (let i = 0; i < k1n; i++) {
    specs.push(s.oneKOnly ? { kind: 'k1', less: 0, fixedK1: k1Split[i] } : { kind: 'k1', less: s.oneKLess });
  }
  const bigN = people - specs.length;
  const internN = Math.min(interns, bigN);
  // 인턴 주머니는 5만·1만 주머니 뒤에 둔다 (권종이 섞이는 경계가 인턴 쪽에 덜 오도록 아래에서 순서를 정함)
  const big: Spec[] = [];
  for (let i = 0; i < bigN - internN; i++) big.push({ kind: 'big', less: 0 });
  for (let i = 0; i < internN; i++) big.push({ kind: 'intern', less: s.internLess });
  return [...big, ...specs];
}

/** 정원(각자 받을 총 개수)을 구한다. 나머지는 정원이 제일 적은 사람부터 1개씩. */
export function quotas(total: number, lesses: number[]): { base: number; q: number[] } {
  const n = lesses.length;
  if (n === 0) return { base: 0, q: [] };
  const lessSum = lesses.reduce((a, b) => a + b, 0);
  const base = Math.floor((total + lessSum) / n);
  const q = lesses.map((l) => Math.max(0, base - l));
  let rem = total - q.reduce((a, b) => a + b, 0);
  // rem은 보통 0..n-1. 음수가 되는 극단적인 경우(감소량이 기준보다 큼)는 많은 사람부터 뺀다.
  const order = q.map((_, i) => i).sort((a, b) => q[a] - q[b] || a - b);
  let guard = 0;
  while (rem > 0 && guard++ < 100000) {
    for (const i of order) { if (rem <= 0) break; q[i]++; rem--; }
  }
  const desc = [...order].reverse();
  while (rem < 0 && guard++ < 100000) {
    for (const i of desc) { if (rem >= 0) break; if (q[i] > 0) { q[i]--; rem++; } }
  }
  return { base, q };
}

/**
 * 권종별 주머니 방식.
 * - 5천원: 1~2개의 주머니에 고르게, 담당은 기준보다 5/10개 적게, 모자란 양은 다른 권종으로 채움.
 * - 1천원: oneKOnly면 1천원만 담은 주머니(기준 계산에서 빠짐), 아니면 기준−5까지 채움.
 * - 인턴: 5만·1만 주머니, 기준보다 internLess개 적게.
 * - 남은 5만·1만은 5만 → 1만 순서로 주머니에 차례로 부어 넣어 권종이 섞이는 주머니를 최소화.
 */
export function planBags(counts: Counts, people: number, interns: number, k1Bags: number, s: Settings): BagPlan {
  const specs = buildSpecs(counts, people, interns, k1Bags, s);
  const n = specs.length;
  const items: Counts[] = specs.map(() => emptyCounts());

  // 고정된 1천원 주머니
  const fixedIdx = specs.map((sp, i) => (sp.fixedK1 !== undefined ? i : -1)).filter((i) => i >= 0);
  let fixedTotal = 0;
  for (const i of fixedIdx) { items[i].k1 = specs[i].fixedK1!; fixedTotal += specs[i].fixedK1!; }

  const flexIdx = specs.map((_, i) => i).filter((i) => !fixedIdx.includes(i));
  const flexTotal = sumCounts(counts) - fixedTotal;
  const { base, q } = quotas(flexTotal, flexIdx.map((i) => specs[i].less));
  const quota = new Array<number>(n).fill(0);
  flexIdx.forEach((i, j) => (quota[i] = q[j]));
  for (const i of fixedIdx) quota[i] = items[i].k1;

  const pool: Counts = { ...counts, k1: counts.k1 - fixedTotal };
  const room = (i: number) => quota[i] - sumCounts(items[i]);

  // 5천원을 5천원 주머니에 고르게 (정원 안에서)
  const k5Idx = specs.map((sp, i) => (sp.kind === 'k5' ? i : -1)).filter((i) => i >= 0);
  splitEven(pool.k5, k5Idx.length).forEach((v, j) => {
    const i = k5Idx[j];
    const take = Math.min(v, room(i));
    items[i].k5 += take; pool.k5 -= take;
  });
  // 1천원(채우기 모드)을 1천원 주머니에 고르게
  const k1Idx = specs.map((sp, i) => (sp.kind === 'k1' && sp.fixedK1 === undefined ? i : -1)).filter((i) => i >= 0);
  splitEven(pool.k1, k1Idx.length).forEach((v, j) => {
    const i = k1Idx[j];
    const take = Math.min(v, room(i));
    items[i].k1 += take; pool.k1 -= take;
  });

  // 나머지를 차례로 부어 넣기: 5만·1만 담당 → 인턴 → 5천 담당 → 1천 담당
  const fillOrder = [
    ...specs.map((sp, i) => (sp.kind === 'big' ? i : -1)),
    ...specs.map((sp, i) => (sp.kind === 'intern' ? i : -1)),
    ...k5Idx,
    ...k1Idx,
  ].filter((i) => i >= 0);
  for (const d of DENOMS) {
    for (const i of fillOrder) {
      if (pool[d] <= 0) break;
      const take = Math.min(pool[d], room(i));
      if (take > 0) { items[i][d] += take; pool[d] -= take; }
    }
  }

  const bags: Bag[] = specs.map((sp, i) => ({ id: `b${i}`, kind: sp.kind, less: sp.less, items: items[i], total: sumCounts(items[i]) }));
  return { base, bags, k1Bags: specs.filter((s) => s.kind === 'k1').length, k5Bags: k5Idx.length };
}

/**
 * 1천원 주머니 기본 개수.
 * oneKOnly: 1천원 담당 1인분이 (기준−5)에 가장 가까워지는 인원 (사례 2: 3명, 사례 3: 1명).
 * 채우기 모드: 1천원이 담당 정원 안에 다 들어가는 가장 적은 인원.
 */
export function suggestK1Bags(counts: Counts, people: number, interns: number, s: Settings): number {
  if (counts.k1 <= 0) return 0;
  const maxK = Math.max(1, people - fiveKBagCount(counts.k5, s) - 1);
  let best = 1;
  let bestScore = Infinity;
  for (let k = 1; k <= maxK; k++) {
    const plan = planBags(counts, people, interns, k, s);
    const share = counts.k1 / k;
    if (s.oneKOnly) {
      const score = Math.abs(share - (plan.base - s.oneKLess));
      if (score < bestScore - 1e-9) { bestScore = score; best = k; }
    } else if (share <= plan.base - s.oneKLess) {
      return k;
    } else {
      best = k;
    }
  }
  return best;
}

/** 다 같이 나누기: 모든 권종을 전원이 고르게. 인턴만 internLess개 적게. */
export function planEven(counts: Counts, internFlags: boolean[], s: Settings): Counts[] {
  const n = internFlags.length;
  const total = sumCounts(counts);
  const { q } = quotas(total, internFlags.map((f) => (f ? s.internLess : 0)));
  const res: Counts[] = internFlags.map(() => emptyCounts());
  const room = (i: number) => q[i] - sumCounts(res[i]);
  // 가장 많은 권종이 마지막에 남는 칸을 채운다
  const order = [...DENOMS].sort((a, b) => counts[a] - counts[b]);
  order.forEach((d, idx) => {
    if (idx === order.length - 1) {
      let left = counts[d];
      for (let i = 0; i < n && left > 0; i++) { const t = Math.min(left, room(i)); res[i][d] += t; left -= t; }
      return;
    }
    // 정원 비율대로, 큰 나머지 순으로 1개씩
    const ideal = q.map((qi) => (total ? (counts[d] * qi) / total : 0));
    const floor = ideal.map((v, i) => Math.min(Math.floor(v), room(i)));
    floor.forEach((v, i) => (res[i][d] += v));
    let left = counts[d] - floor.reduce((a, b) => a + b, 0);
    const byFrac = ideal.map((_, i) => i).sort((a, b) => (ideal[b] - Math.floor(ideal[b])) - (ideal[a] - Math.floor(ideal[a])) || a - b);
    let guard = 0;
    while (left > 0 && guard++ < 1000) {
      for (const i of byFrac) { if (left <= 0) break; if (room(i) > 0) { res[i][d]++; left--; } }
    }
  });
  return res;
}

/**
 * 결과 표 손 수정: 한 사람의 한 권종을 delta(+1/−1)만큼 바꾸고,
 * 같은 권종을 가진 다른 사람에게서 반대로 1개 보정해 권종 합계를 유지한다.
 * +1: 그 권종을 가진 사람 중 총 개수가 가장 많은 사람에게서 뺀다.
 * −1: 그 권종을 가진 사람 중 총 개수가 가장 적은 사람에게 더한다 (아무도 없으면 전체에서 가장 적은 사람).
 */
export function adjust(rows: Counts[], person: number, d: Denom, delta: 1 | -1, other?: number): Counts[] | null {
  const next = rows.map((r) => ({ ...r }));
  if (other !== undefined) {
    // 엄마가 상대를 직접 고른 경우: 그 사람과 1개를 주고받는다
    if (other === person || !next[other]) return null;
    const from = delta === 1 ? other : person;
    const to = delta === 1 ? person : other;
    if (next[from][d] <= 0) return null;
    next[from][d]--; next[to][d]++;
    return next;
  }
  const others = next.map((_, i) => i).filter((i) => i !== person);
  if (delta === 1) {
    const donors = others.filter((i) => next[i][d] > 0);
    if (!donors.length) return null;
    donors.sort((a, b) => sumCounts(next[b]) - sumCounts(next[a]) || a - b);
    next[donors[0]][d]--;
    next[person][d]++;
  } else {
    if (next[person][d] <= 0) return null;
    let takers = others.filter((i) => next[i][d] > 0);
    if (!takers.length) takers = others;
    if (!takers.length) return null;
    takers.sort((a, b) => sumCounts(next[a]) - sumCounts(next[b]) || a - b);
    next[takers[0]][d]++;
    next[person][d]--;
  }
  return next;
}
