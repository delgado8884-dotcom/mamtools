/* MAM TOOLS | Fit Calculator — 끼워맞춤 공차 계산 (ISO 286-1/-2, KS B ISO 286 과 같은 값)
   구멍 기준식: 구멍 H5~H11 + 축 e·f·g·h·js·k·m·n·p·r·s (자주 쓰는 것만)
   단위: 입력 mm, 표·결과 µm. 호칭 치수 1~500 mm (구간은 '초과 ~ 이하')
   화면과 분리: 브라우저 window.FitCalc / node require */
(function (root) {
  'use strict';
  // 치수 구간 상한 (mm): 3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500
  var R = [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500];
  // 기본 공차 IT (µm)
  var IT = {
    5:  [4, 5, 6, 8, 9, 11, 13, 15, 18, 20, 23, 25, 27],
    6:  [6, 8, 9, 11, 13, 16, 19, 22, 25, 29, 32, 36, 40],
    7:  [10, 12, 15, 18, 21, 25, 30, 35, 40, 46, 52, 57, 63],
    8:  [14, 18, 22, 27, 33, 39, 46, 54, 63, 72, 81, 89, 97],
    9:  [25, 30, 36, 43, 52, 62, 74, 87, 100, 115, 130, 140, 155],
    10: [40, 48, 58, 70, 84, 100, 120, 140, 160, 185, 210, 230, 250],
    11: [60, 75, 90, 110, 130, 160, 190, 220, 250, 290, 320, 360, 400]
  };
  // 축 기초 치수 허용차 (µm). e·f·g: 위 치수 허용차 es / k·m·n·p: 아래 치수 허용차 ei
  var ES = {
    e: [-14, -20, -25, -32, -40, -50, -60, -72, -85, -100, -110, -125, -135],
    f: [-6, -10, -13, -16, -20, -25, -30, -36, -43, -50, -56, -62, -68],
    g: [-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20],
    h: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };
  var EI = {
    k: [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5],          // IT4~IT7. 그 밖 등급은 0
    m: [2, 4, 6, 7, 8, 9, 11, 13, 15, 17, 20, 21, 23],
    n: [4, 8, 10, 12, 15, 17, 20, 23, 27, 31, 34, 37, 40],
    p: [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68]
  };
  // r·s 는 50 mm 넘으면 구간이 더 잘게 나뉨: [상한 mm, µm]
  var EI_FINE = {
    r: [[3, 10], [6, 15], [10, 19], [18, 23], [30, 28], [50, 34], [65, 41], [80, 43], [100, 51], [120, 54], [140, 63], [160, 65], [180, 68],
        [200, 77], [225, 80], [250, 84], [280, 94], [315, 98], [355, 108], [400, 114], [450, 126], [500, 132]],
    s: [[3, 14], [6, 19], [10, 23], [18, 28], [30, 35], [50, 43], [65, 53], [80, 59], [100, 71], [120, 79], [140, 92], [160, 100], [180, 108],
        [200, 122], [225, 130], [250, 140], [280, 158], [315, 170], [355, 190], [400, 208], [450, 232], [500, 252]]
  };
  var HOLES = ['H6', 'H7', 'H8', 'H9', 'H10', 'H11'];
  var SHAFTS = ['e7', 'e8', 'e9', 'f6', 'f7', 'f8', 'g5', 'g6', 'h5', 'h6', 'h7', 'h8', 'h9', 'js5', 'js6', 'js7', 'k5', 'k6', 'm5', 'm6', 'n6', 'p6', 'r6', 's6'];
  // 자주 쓰는 조합의 쓰임 (참고)
  var USE = {
    'H7/e8': '넉넉한 회전. 윤활하는 축, 온도 변화가 큰 곳',
    'H8/e8': '넉넉한 회전. 정밀도가 덜 필요한 축받이',
    'H7/f7': '일반 회전·미끄럼. 윤활하는 축과 부시',
    'H8/f7': '일반 회전. 덜 정밀한 축받이',
    'H7/g6': '정밀 미끄럼. 손으로 밀어 넣고 빠지는 가이드 핀·슬라이드 축',
    'H6/g5': '아주 정밀한 미끄럼. 정밀 기기 축',
    'H7/h6': '위치 맞춤. 손이나 가볍게 두드려 조립, 틈이 거의 없음',
    'H8/h7': '위치 맞춤. 덜 정밀한 조립',
    'H7/js6': '중간 끼워맞춤. 가볍게 두드려 조립, 분해 가능',
    'H7/k6': '중간 끼워맞춤. 가벼운 압입, 기어·풀리 위치 고정(키와 함께)',
    'H7/m6': '중간 끼워맞춤. 망치로 조립, 잘 안 빠짐',
    'H7/n6': '중간~억지. 프레스로 조립',
    'H7/p6': '억지 끼워맞춤. 프레스 압입, 부시·핀 고정',
    'H7/r6': '억지 끼워맞춤. 강한 압입',
    'H7/s6': '강한 억지. 가열·냉각 끼움, 큰 힘 전달'
  };

  function idx(d) { for (var i = 0; i < R.length; i++) if (d <= R[i] + 1e-9) return i; return -1; }
  function fine(tab, d) { for (var i = 0; i < tab.length; i++) if (d <= tab[i][0] + 1e-9) return tab[i][1]; return null; }
  function parse(code) {
    var m = /^([a-zA-Z]{1,2})(\d{1,2})$/.exec(String(code || '').trim());
    if (!m) return null;
    return { letter: m[1], grade: +m[2] };
  }

  // 구멍 (H만): EI = 0, ES = IT
  function hole(code, d) {
    var p = parse(code), i = idx(d);
    if (!p || p.letter !== 'H' || !IT[p.grade]) throw new Error('지원하지 않는 구멍 공차: ' + code);
    var t = IT[p.grade][i];
    return { code: 'H' + p.grade, upper: t, lower: 0, it: t };
  }
  // 축
  function shaft(code, d) {
    var p = parse(code), i = idx(d);
    if (!p || !IT[p.grade]) throw new Error('지원하지 않는 축 공차: ' + code);
    var L = p.letter, t = IT[p.grade][i], up, lo;
    if (ES[L]) { up = ES[L][i]; lo = up - t; }
    else if (L === 'js') {
      // 7~11급에서 IT가 홀수면 바로 아래 짝수로 맞춰 반으로 나눔(ISO 286). 6급 이하는 0.5 µm 단위 그대로
      var h = p.grade >= 7 && t % 2 ? (t - 1) / 2 : t / 2;
      up = h; lo = -h;
    }
    else if (L === 'k') { lo = (p.grade >= 4 && p.grade <= 7) ? EI.k[i] : 0; up = lo + t; }
    else if (EI[L]) { lo = EI[L][i]; up = lo + t; }
    else if (EI_FINE[L]) { lo = fine(EI_FINE[L], d); up = lo + t; }
    else throw new Error('지원하지 않는 축 공차: ' + code);
    return { code: L + p.grade, upper: up, lower: lo, it: t };
  }

  function compute(input) {
    var d = Number(input.size);
    if (!isFinite(d) || d <= 0) return { ok: false, error: '호칭 치수를 0보다 큰 숫자로 넣어 주세요.' };
    if (d > 500) return { ok: false, error: '500 mm까지 계산합니다.' };
    if (d < 1) return { ok: false, error: '1 mm 이상으로 넣어 주세요.' };
    var H = hole(input.hole, d), S = shaft(input.shaft, d);
    var maxClr = H.upper - S.lower, minClr = H.lower - S.upper;   // µm, +틈 / -죔
    var type = minClr >= 0 ? 'clearance' : (maxClr <= 0 ? 'interference' : 'transition');
    var r3 = function (x) { return Math.round(x * 1000) / 1000; };
    return {
      ok: true, size: d, range: [idx(d) ? R[idx(d) - 1] : 0, R[idx(d)]],
      hole: H, shaft: S,
      holeMax: r3(d + H.upper / 1000), holeMin: r3(d + H.lower / 1000),
      shaftMax: r3(d + S.upper / 1000), shaftMin: r3(d + S.lower / 1000),
      maxClr: maxClr, minClr: minClr, type: type,
      use: USE[H.code + '/' + S.code] || ''
    };
  }

  var api = { R: R, IT: IT, HOLES: HOLES, SHAFTS: SHAFTS, USE: USE, hole: hole, shaft: shaft, compute: compute };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FitCalc = api;
})(typeof window !== 'undefined' ? window : this);
