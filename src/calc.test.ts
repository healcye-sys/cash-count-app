import { describe, expect, it } from 'vitest';
import { adjust, Counts, DEFAULT_SETTINGS as S, DENOMS, planBags, planEven, suggestK1Bags, sumCounts } from './calc';
// 사례 2·3은 "1천원 담당은 1천원만" 설정을 켠 경우의 결과 (기본값은 2026-11-18부터 끔)
const ONLY = { ...S, oneKOnly: true };

const c = (m50: number, m10: number, k5: number, k1: number): Counts => ({ m50, m10, k5, k1 });
const totals = (p: ReturnType<typeof planBags>) => p.bags.map((b) => b.total).sort((a, b) => b - a);
const denomSum = (rows: Counts[]) => Object.fromEntries(DENOMS.map((d) => [d, rows.reduce((a, r) => a + r[d], 0)]));

describe('실제 사례 (요구사항/실제-사례.md)', () => {
  it('사례 1: 294개, 6명, 5천원 16개 → 52·52·52·52·43·43', () => {
    const counts = c(200, 78, 16, 0);
    const p = planBags(counts, 6, 0, suggestK1Bags(counts, 6, 0, S), S);
    expect(p.base).toBe(52);
    expect(totals(p)).toEqual([52, 52, 52, 52, 43, 43]);
    expect(p.bags.filter((b) => b.kind === 'k5').map((b) => b.items.k5)).toEqual([8, 8]);
    expect(denomSum(p.bags.map((b) => b.items))).toEqual(counts);
  });

  it('사례 1 + 인턴 1명 → 인턴 주머니는 3개 적음', () => {
    const p = planBags(c(200, 78, 16, 0), 6, 1, 0, S);
    const intern = p.bags.find((b) => b.kind === 'intern')!;
    const big = p.bags.filter((b) => b.kind === 'big').map((b) => b.total);
    expect(Math.min(...big) - intern.total).toBeGreaterThanOrEqual(2);
    expect(sumCounts(p.bags.reduce((a, b) => ({ m50: a.m50 + b.items.m50, m10: a.m10 + b.items.m10, k5: a.k5 + b.items.k5, k1: a.k1 + b.items.k1 }), c(0, 0, 0, 0)))).toBe(294);
  });

  it('사례 2: 5만 140, 1천 78, 8명, 인턴 1 → 1천원 3명이 26씩만', () => {
    const counts = c(140, 0, 0, 78);
    const k = suggestK1Bags(counts, 8, 1, ONLY);
    expect(k).toBe(3);
    const p = planBags(counts, 8, 1, k, ONLY);
    expect(p.bags.filter((b) => b.kind === 'k1').map((b) => b.items)).toEqual([c(0, 0, 0, 26), c(0, 0, 0, 26), c(0, 0, 0, 26)]);
    expect(p.base).toBe(28);
    expect(totals(p).reduce((a, b) => a + b, 0)).toBe(218);
    // 5만원 담당은 권종이 섞이지 않음
    expect(p.bags.filter((b) => b.kind !== 'k1').every((b) => b.items.k1 === 0)).toBe(true);
  });

  it('사례 2 다 같이 나누기: 8명이 고르게, 인턴이 제일 적음', () => {
    const counts = c(140, 0, 0, 78);
    const flags = [false, false, false, false, false, false, false, true];
    const rows = planEven(counts, flags, S);
    expect(denomSum(rows)).toEqual(counts);
    const t = rows.map(sumCounts);
    expect(Math.max(...t.slice(0, 7)) - Math.min(...t.slice(0, 7))).toBeLessThanOrEqual(1);
    expect(t[7]).toBeLessThan(Math.min(...t.slice(0, 7)));
    // 1천원도 모두가 나눠 가짐 (9~10개)
    expect(rows.every((r) => r.k1 >= 9 && r.k1 <= 10)).toBe(true);
  });

  it('사례 3: 7명, 인턴 1, 1천원 33개는 한 명이 1천원만 → 47·47·47·44·37·37·33', () => {
    const counts = c(125, 120, 14, 33);
    const k = suggestK1Bags(counts, 7, 1, ONLY);
    expect(k).toBe(1);
    const p = planBags(counts, 7, 1, k, ONLY);
    expect(p.base).toBe(47);
    expect(totals(p)).toEqual([47, 47, 47, 44, 37, 37, 33]);
    expect(p.bags.find((b) => b.kind === 'k1')!.items).toEqual(c(0, 0, 0, 33));
    expect(denomSum(p.bags.map((b) => b.items))).toEqual(counts);
  });

  it('사례 3 채우기 모드: 1천원 담당도 기준−5까지 채움 → 41', () => {
    const s = { ...S, oneKOnly: false };
    const counts = c(125, 120, 14, 33);
    const p = planBags(counts, 7, 1, suggestK1Bags(counts, 7, 1, s), s);
    expect(p.base).toBe(45);
    expect(p.bags.find((b) => b.kind === 'k1')!.total).toBe(41);
    expect(totals(p).reduce((a, b) => a + b, 0)).toBe(292);
  });

  it('사례 4: 5만 178, 5천 12, 7명 → 30×5, 5천 담당 20·20', () => {
    const p = planBags(c(178, 0, 12, 0), 7, 0, 0, S);
    expect(p.base).toBe(30);
    expect(totals(p)).toEqual([30, 30, 30, 30, 30, 20, 20]);
    expect(p.bags.filter((b) => b.kind === 'k5').map((b) => b.items)).toEqual([c(14, 0, 6, 0), c(14, 0, 6, 0)]);
  });

  it('사례 5: 5만 240, 5천 25, 6명, 인턴 1 → 48·48·48·45·38·38', () => {
    const p = planBags(c(240, 0, 25, 0), 6, 1, 0, S);
    expect(p.base).toBe(48);
    expect(totals(p)).toEqual([48, 48, 48, 45, 38, 38]);
    expect(p.bags.filter((b) => b.kind === 'k5').map((b) => b.items.k5)).toEqual([13, 12]);
  });
});

describe('규칙 세부', () => {
  it('5천원 10개 이하면 한 명이 다 맡고 5개 적게', () => {
    const p = planBags(c(100, 0, 8, 0), 4, 0, 0, S);
    const k5 = p.bags.filter((b) => b.kind === 'k5');
    expect(k5).toHaveLength(1);
    expect(k5[0].items.k5).toBe(8);
    expect(p.base - k5[0].total).toBeGreaterThanOrEqual(4);
  });

  it('권종이 하나도 없는 날도 깨지지 않음', () => {
    const p = planBags(c(0, 0, 0, 0), 3, 0, 0, S);
    expect(totals(p)).toEqual([0, 0, 0]);
  });

  it('손 수정은 권종 합계를 유지', () => {
    const rows = planBags(c(240, 0, 25, 0), 6, 1, 0, S).bags.map((b) => b.items);
    const internIdx = 3;
    const up = adjust(rows, internIdx, 'm50', 1)!;
    expect(denomSum(up)).toEqual(denomSum(rows));
    expect(sumCounts(up[internIdx])).toBe(sumCounts(rows[internIdx]) + 1);
    const down = adjust(rows, 0, 'm50', -1)!;
    expect(denomSum(down)).toEqual(denomSum(rows));
  });
});

describe('손 수정: 상대를 직접 고르기', () => {
  it('올리면 고른 사람에게서 1개 가져오고, 내리면 고른 사람에게 1개 준다', () => {
    const rows = [c(57, 0, 0, 0), c(63, 0, 0, 0), c(0, 25, 27, 0), c(9, 16, 27, 0), c(0, 37, 0, 20)];
    const up = adjust(rows, 0, 'm50', 1, 3)!;
    expect(up[0].m50).toBe(58);
    expect(up[3].m50).toBe(8);
    expect(up[1].m50).toBe(63);
    const down = adjust(rows, 0, 'm50', -1, 2)!;
    expect(down[0].m50).toBe(56);
    expect(down[2].m50).toBe(1);
    expect(adjust(rows, 0, 'm50', 1, 2)).toBeNull(); // 5만이 없는 사람에게서는 못 가져옴
  });
});
