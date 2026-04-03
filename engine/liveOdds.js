// ================= LIVE ODDS ENGINE =================
const { getOdds } = require("./oddsEngine");
const Match = require("../models/Match"); // (we will adjust later if needed)

async function updateOdds() {
    try {
        const matches = await Match.find({ status: "live" });

        for (let m of matches) {

            // 🧠 Example dummy data (replace later with real score API)
            let matchData = {
                runs: m.runs || 100,
                balls: m.balls || 60,
                wickets: m.wickets || 5
            };

            const { oddsA, oddsB } = getOdds(matchData);

            // 🔥 Update DB
            m.oddsA = oddsA;
            m.oddsB = oddsB;

            await m.save();
        }

        console.log("Odds Updated 🔄");

    } catch (err) {
        console.error("Odds Error:", err);
    }
}

// 🔁 Run every 2 sec
function startOddsEngine() {
    setInterval(updateOdds, 2000);
}

module.exports = { startOddsEngine };
