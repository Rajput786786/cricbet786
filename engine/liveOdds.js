// ===================== IMPORT =====================
const Match = require("../models/Match");

// ===================== MEMORY =====================
const eventState = {};

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

    const R = m.target ? (m.target - m.runs) : 120 - m.runs;
    const B = m.balls;
    const W = 10 - m.wickets;

    if (B <= 0) continue;

    const rrr = R / (B / 6);

    const rrrEffect = getRRREffect(rrr);
    const ballEffect = getBallEffect(B);
    const wicketEffect = getWicketEffect(W);

    const prev = lastState[m._id] || m;

    let impact = 0;

    const runDiff = m.runs - prev.runs;
    const wicketDiff = m.wickets - prev.wickets;
    
    let isEvent = (runDiff !== 0 || wicketDiff > 0);

    if (wicketDiff > 0) impact -= 20;

    if (runDiff === 0) impact -= 1;
    if (runDiff === 1) impact += 1;
    if (runDiff === 2) impact += 2;
    if (runDiff === 4) impact += 5;
    if (runDiff === 6) impact += 8;
    
if (isEvent && !eventState[m._id]) {
  eventState[m._id] = {
    start: Date.now()
  };
}

    let CA = 50 - (rrrEffect + ballEffect + wicketEffect) + impact;
    // 🔥 MICRO ON % (hidden)
    let micro = (Math.random() * 0.2 - 0.1);
    CA += micro;

    CA = clamp(CA, 0.1, 99.9);
    const CB = 100 - CA;

    let oddsA = (100 / CA) * 0.9;
    let oddsB = (100 / CB) * 0.9;
    
    // ================= EVENT TRAP =================
   let trap = eventState[m._id];

  if (trap) {
   let diff = (Date.now() - trap.start) / 1000;

  if (diff < 3) {
    // 🔥 FAST FLUCTUATION (3 sec)
    oddsA += (Math.random() * 0.12 - 0.06);
    oddsB += (Math.random() * 0.12 - 0.06);
                } else {
    // ✅ STABLE AFTER 3 SEC
    delete eventState[m._id];
                      }
                }

// ================= MICRO MOVEMENT =================
    
// Final clamp
oddsA = Math.max(1.01, oddsA);
oddsB = Math.max(1.01, oddsB);

const prevOdds = lastState[m._id] || {};

let finalOddsA = Number(oddsA.toFixed(2));
let finalOddsB = Number(oddsB.toFixed(2));

// 🔥 UI FILTER (0.03 threshold)
if (
  !prevOdds.oddsA ||
  Math.abs(finalOddsA - prevOdds.oddsA) >= 0.03
) {
  m.oddsA = finalOddsA;
}

if (
  !prevOdds.oddsB ||
  Math.abs(finalOddsB - prevOdds.oddsB) >= 0.03
) {
  m.oddsB = finalOddsB;
}
    await m.save();
    
    lastState[m._id] = {
  runs: m.runs,
  balls: m.balls,
  wickets: m.wickets,
  oddsA: m.oddsA,
  oddsB: m.oddsB
   };
  }
}

// ===================== LOOP =====================
function startOddsEngine() {
  setInterval(updateOdds, 2000);
}

module.exports = { startOddsEngine };
