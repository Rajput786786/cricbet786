// ================= ODDS ENGINE =================

// Calculate chance based on match situation
function calculateChance({ runs, balls, wickets }) {
    let baseChance = 50;

    let rrr = runs / (balls / 6);

    let rrrEffect = 0;
    if (rrr >= 9 && rrr <= 10) rrrEffect = 5;
    else if (rrr <= 12) rrrEffect = 10;
    else if (rrr <= 14) rrrEffect = 15;
    else if (rrr <= 16) rrrEffect = 20;
    else if (rrr <= 18) rrrEffect = 30;
    else if (rrr > 18) rrrEffect = 50;

    let ballEffect = 0;
    if (balls <= 36 && balls > 24) ballEffect = 5;
    else if (balls <= 24 && balls > 12) ballEffect = 10;
    else if (balls <= 12 && balls > 6) ballEffect = 15;
    else if (balls <= 6) ballEffect = 30;

    let wicketEffect = 0;
    if (wickets <= 7 && wickets > 5) wicketEffect = 5;
    else if (wickets <= 5 && wickets > 3) wicketEffect = 10;
    else if (wickets <= 3 && wickets > 1) wicketEffect = 20;
    else if (wickets === 1) wicketEffect = 40;

    let totalDrop = rrrEffect + ballEffect + wicketEffect;

    let chanceA = baseChance - totalDrop;

    if (chanceA < 0.1) chanceA = 0.1;
    if (chanceA > 99.9) chanceA = 99.9;

    let chanceB = 100 - chanceA;

    return { chanceA, chanceB };
}

// Convert chance to odds
function calculateOdds(chanceA, chanceB) {
    let oddsA = 100 / chanceA;
    let oddsB = 100 / chanceB;

    // Margin
    oddsA = oddsA * 0.9;
    oddsB = oddsB * 0.9;

    // Round
    oddsA = Number(oddsA.toFixed(2));
    oddsB = Number(oddsB.toFixed(2));

    return { oddsA, oddsB };
}

// MAIN FUNCTION
function getOdds(matchData) {
    const { runs, balls, wickets } = matchData;

    const { chanceA, chanceB } = calculateChance({ runs, balls, wickets });

    const { oddsA, oddsB } = calculateOdds(chanceA, chanceB);

    return {
        chanceA,
        chanceB,
        oddsA,
        oddsB
    };
}

module.exports = { getOdds };
