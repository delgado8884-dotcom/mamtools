/* MAM TOOLS | Cylinder Selector — 계산 로직 (화면과 분리, node 테스트 가능) */
(function (root) {
  'use strict';

  var G = 9.80665;                 // m/s²
  var ETA = 0.85;                  // 유효 추력 보정계수(가정값)
  var BORES = [6, 8, 10, 12, 16, 20, 25, 32, 40, 50, 63, 80, 100];
  var DEFAULTS = { pressure: 0.5, safety: 2.0, mu: 0.2, orientation: 'horizontal' };

  // 문자열/숫자 → 양수 검사. 반환: {value} 또는 {error}
  function parsePositive(raw, label) {
    if (raw === null || raw === undefined) return { error: label + ' 값을 입력하세요.' };
    var s = String(raw).trim().replace(/,/g, '');
    if (s === '') return { error: label + ' 값을 입력하세요.' };
    if (!/^[+]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return { error: '숫자만 입력하세요.' };
    var v = Number(s);
    if (!isFinite(v)) return { error: '숫자만 입력하세요.' };
    if (v <= 0) return { error: '0보다 큰 값을 입력하세요.' };
    return { value: v };
  }

  function compute(input) {
    var orientation = input.orientation === 'vertical' ? 'vertical' : 'horizontal';
    var errors = {};
    var m = parsePositive(input.mass, '이동 하중');
    var p = parsePositive(input.pressure, '사용 압력');
    var s = parsePositive(input.safety, '안전율');
    var mu = orientation === 'horizontal' ? parsePositive(input.mu, '수평 저항계수') : { value: null };
    if (m.error) errors.mass = m.error;
    if (p.error) errors.pressure = p.error;
    if (s.error) errors.safety = s.error;
    if (mu.error) errors.mu = mu.error;

    var base = { orientation: orientation, eta: ETA, g: G };
    if (Object.keys(errors).length) {
      base.status = 'error';
      base.errors = errors;
      return base;
    }

    var mass = m.value, P = p.value, S = s.value, MU = mu.value;
    // 4.2 필요 추력 [N]
    var F_required = orientation === 'vertical' ? mass * G * S : mass * G * MU * S;
    // 4.3 필요 내경 [mm]  (P: MPa = N/mm²)
    var A_required = F_required / (P * ETA);
    var D_required = Math.sqrt(4 * A_required / Math.PI);

    // 계산 내경 이상인 표준 내경 중 최소 (부동소수 오차 1e-9 허용)
    var bore = null;
    for (var i = 0; i < BORES.length; i++) {
      if (BORES[i] >= D_required - 1e-9) { bore = BORES[i]; break; }
    }

    base.errors = {};
    base.mass = mass; base.pressure = P; base.safety = S; base.mu = MU;
    base.F_required = F_required;
    base.A_required = A_required;
    base.D_required = D_required;
    base.bore = bore;

    if (bore === null) {
      base.status = 'over';      // 4.5 표준 내경 범위 초과 — 억지 추천 없음
      return base;
    }
    var A_selected = Math.PI * bore * bore / 4;
    var F_available = P * A_selected * ETA;
    base.A_selected = A_selected;
    base.F_available = F_available;
    base.margin = (F_available / F_required - 1) * 100;
    base.status = 'ok';
    return base;
  }

  var api = { G: G, ETA: ETA, BORES: BORES, DEFAULTS: DEFAULTS, parsePositive: parsePositive, compute: compute };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CylCalc = api;
})(this);
