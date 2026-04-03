// ===================== IMPORT =====================
const Match = require("../server").models?.Match || require("mongoose").model("Match");

// ===================== MEMORY =====================
// 🧠 Store last state for ball-by-ball impact
const lastState = {};

// ===================== UTILS =====================
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// ===================== RRR EFFECT =====================
function getRRREffect(rrr) {
  if (rrr <= 8) return 0;
  if (rrr <= 10) return 5;
  if (rrr <= 12) return 10;
  if (rrr <= 14) return 15;
  if (rrr <= 16) return 20;
  if (rrr <= 18) return 30;
  if (rrr <= 20) return 40;
  return 60;
}

// ===================== BALL EFFECT =====================
function getBallEffect(balls) {
  if (balls > 60) return 0;
  if (balls > 36) return 5;
  if (balls > 24) return 10;
  if (balls > 12) return 15;
  if (balls > 6) return 20;
  return 30;
}

// ===================== WICKET EFFECT =====================
function getWicketEffect(w) {
  if (w >= 8) return 0;
  if (w >= 6) return 5;
  if (w >= 4) return 10;
  if (w >= 2) return 20;
  return 40;
}

// ===================== MAIN ENGINE =====================
async function updateOdds() {
  const matches = await Match.find({ status: "live" });

  for (let m of matches) {

    // ===================== BASIC DATA =====================
    const R = m.target ? (m.target - m.runs) : 120 - m.runs;
    const B = m.balls;
    const W = 10 - m.wickets;

    if (B <= 0) continue;

    const rrr = R / (B / 6);

    // ===================== BASE EFFECT =====================
    const rrrEffect = getRRREffect(rrr);
    const ballEffect = getBallEffect(B);
    const wicketEffect = getWicketEffect(W);

    // ===================== PREVIOUS STATE =====================
    const prev = lastState[m._id] || {
      runs: m.runs,
      balls: m.balls,
      wickets: m.wickets
    };

    // ===================== BALL IMPACT =====================
    let impact = 0;

    const runDiff = m.runs - prev.runs;
    const wicketDiff = m.wickets - prev.wickets;

    // 🎯 WICKET IMPACT
    if (wicketDiff > 0) {
      impact -= 20;
    }

    // 🎯 RUN IMPACT
    if (runDiff === 0) impact -= 1;
    if (runDiff === 1) impact += 1;
    if (runDiff === 2) impact += 2;
    if (runDiff === 4) impact += 5;
    if (runDiff === 6) impact += 8;

    // ===================== FINAL CHANCE =====================
    let CA = 50 - (rrrEffect + ballEffect + wicketEffect) + impact;

    CA = clamp(CA, 0.1, 99.9);
    const CB = 100 - CA;

    // ===================== ODDS =====================
    let oddsA = 100 / CA;
    let oddsB = 100 / CB;

    // 🎯 Margin
    oddsA *= 0.9;
    oddsB *= 0.9;

    // 🎯 Rounding
    oddsA = Number(oddsA.toFixed(2));
    oddsB = Number(oddsB.toFixed(2));

    // ===================== SAVE =====================
    m.oddsA = oddsA;
    m.oddsB = oddsB;

    await m.save();

    // ===================== UPDATE MEMORY =====================
    lastState[m._id] = {
      runs: m.runs,
      balls: m.balls,
      wickets: m.wickets
    };
  }
}

// ===================== LOOP =====================
function startOddsEngine() {
  setInterval(() => {
    updateOdds();
  }, 2000);
}

module.exports = { startOddsEngine };
