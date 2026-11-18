import { Counts, DENOM_LABEL, DENOMS, sumCounts } from './calc';
import { ResultRow } from './storage';

const FONT = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

/** 배분 결과 표를 그림(PNG)으로 그린다. */
export function drawResult(rows: ResultRow[], counts: Counts, date: Date): HTMLCanvasElement {
  const scale = 2;
  const W = 720, pad = 32, rowH = 64, headH = 40;
  const titleH = 110;
  const H = titleH + headH + (rows.length + 1) * (rowH + 8) + pad;
  const c = document.createElement('canvas');
  c.width = W * scale; c.height = H * scale;
  const g = c.getContext('2d')!;
  g.scale(scale, scale);
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);

  const w = '일월화수목금토'[date.getDay()];
  g.fillStyle = '#1b1f2a'; g.font = `700 30px ${FONT}`; g.textBaseline = 'middle';
  g.fillText(`${date.getMonth() + 1}월 ${date.getDate()}일 (${w}) 배분 결과`, pad, 48);
  g.fillStyle = '#5b6270'; g.font = `400 20px ${FONT}`;
  g.fillText(`${rows.length}명 · 전체 ${sumCounts(counts)}개`, pad, 86);

  // 열 위치: 이름 | 5만 | 1만 | 5천 | 1천 | 합계 (숫자는 오른쪽 정렬)
  const inner = W - pad * 2;
  const nameW = inner * 0.3;
  const colW = (inner - nameW) / 5;
  const right = (i: number) => pad + nameW + colW * (i + 1) - 12;

  let y = titleH;
  g.fillStyle = '#5b6270'; g.font = `500 18px ${FONT}`; g.textAlign = 'left';
  g.fillText('이름', pad + 14, y + headH / 2);
  g.textAlign = 'right';
  DENOMS.forEach((d, i) => g.fillText(DENOM_LABEL[d], right(i), y + headH / 2));
  g.fillText('합계', right(4), y + headH / 2);
  y += headH;

  const box = (fill: string) => {
    g.fillStyle = fill;
    g.beginPath(); g.roundRect(pad, y, inner, rowH, 14); g.fill();
  };
  const cy = () => y + rowH / 2;

  for (const r of rows) {
    box(r.items.k5 || r.items.k1 ? '#fff4e8' : '#f6f7f9');
    g.textAlign = 'left'; g.fillStyle = '#1b1f2a'; g.font = `700 24px ${FONT}`;
    g.fillText(r.name, pad + 14, cy(), nameW - (r.intern ? 70 : 20));
    if (r.intern) {
      const nw = Math.min(g.measureText(r.name).width, nameW - 70);
      const tx = pad + 14 + nw + 8;
      g.fillStyle = '#ffe8b3'; g.beginPath(); g.roundRect(tx, cy() - 13, 50, 26, 13); g.fill();
      g.fillStyle = '#7a5200'; g.font = `700 15px ${FONT}`; g.textAlign = 'center';
      g.fillText('인턴', tx + 25, cy());
    }
    g.textAlign = 'right';
    DENOMS.forEach((d, i) => {
      g.fillStyle = r.items[d] ? '#1b1f2a' : '#b6bcc6'; g.font = `400 24px ${FONT}`;
      g.fillText(String(r.items[d]), right(i), cy());
    });
    g.fillStyle = '#1b1f2a'; g.font = `700 28px ${FONT}`;
    g.fillText(String(sumCounts(r.items)), right(4), cy());
    y += rowH + 8;
  }

  box('#1b1f2a');
  g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = `700 24px ${FONT}`;
  g.fillText('합계', pad + 14, cy());
  g.textAlign = 'right';
  DENOMS.forEach((d, i) => { g.font = `400 24px ${FONT}`; g.fillText(String(rows.reduce((a, r) => a + r.items[d], 0)), right(i), cy()); });
  g.font = `700 28px ${FONT}`;
  g.fillText(String(rows.reduce((a, r) => a + sumCounts(r.items), 0)), right(4), cy());
  return c;
}

/** 화면 아래에 잠깐 안내 문구를 띄운다. */
function toast(msg: string) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.setAttribute('role', 'status');
  el.style.cssText = 'position:fixed;left:50%;bottom:110px;transform:translateX(-50%);background:#1b1f2a;color:#fff;padding:14px 20px;border-radius:14px;font-size:17px;font-weight:700;z-index:99;width:max-content;max-width:calc(100% - 32px);text-align:center;box-shadow:0 4px 14px rgba(0,0,0,.2)';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

/**
 * 그림을 휴대폰에 저장한다.
 * 안드로이드(갤럭시)·컴퓨터: 바로 내려받기 → 갤러리의 Download 앨범에 들어간다.
 * 아이폰: 바로 저장하면 사진첩이 아니라 '파일' 앱으로 가서, 공유 창(이미지 저장)을 연다.
 */
export async function saveResultImage(rows: ResultRow[], counts: Counts, date = new Date()): Promise<void> {
  const canvas = drawResult(rows, counts, date);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return;
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const name = `cash-result-${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-${pad2(date.getHours())}${pad2(date.getMinutes())}.png`;
  const file = new File([blob], name, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (ios && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file] }); return; } catch (e) { if ((e as Error).name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('갤러리에 저장했어요');
}
