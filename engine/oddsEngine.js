function getOdds(data) {
  let { runs, balls, wickets, target } = data;

  if (!target || balls <= 0) {
    return { oddsA: 2, oddsB: 2 };
  }

  let R = target - runs;
  let B = balls;
  let W = 10 - wickets;

  // 🧠 RRR
  let rrr = R / (B / 6);

  // 🎯 BASE CHANCE
  let CA = 50;

  // ================= RRR IMPACT =================
  if (rrr >= 9 && rrr <= 10) CA -= 5;
  else if (rrr <= 12) CA -= 10;
  else if (rrr <= 14) CA -= 15;
  else if (rrr <= 16) CA -= 20;
  else if (rrr <= 18) CA -= 30;
  else if (rrr <= 20) CA -= 40;
  else if (rrr > 20) CA -= 60;

  // ================= BALL IMPACT =================
  if (B <= 60 && B > 36) CA -= 5;
  else if (B <= 36 && B > 24) CA -= 10;
  else if (B <= 24 && B > 12) CA -= 15;
  else if (B <= 12 && B > 6) CA -= 20;
  else if (B <= 6) CA -= 30;

  // ================= WICKET IMPACT =================
  if (W <= 7 && W >= 6) CA -= 5;
  else if (W <= 5 && W >= 4) CA -= 10;
  else if (W <= 3 && W >= 2) CA -= 20;
  else if (W === 1) CA -= 40;

  // ================= CLAMP =================
  if (CA < 0.1) CA = 0.1;
  if (CA > 99.9) CA = 99.9;

  let CB = 100 - CA;

  // ================= ODDS =================
  let oddsA = (100 / CA) * 0.9;
  let oddsB = (100 / CB) * 0.9;

  return {
    oddsA: parseFloat(oddsA.toFixed(2)),
    oddsB: parseFloat(oddsB.toFixed(2))
  };
}

module.exports = { getOdds };
