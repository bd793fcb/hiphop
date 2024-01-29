
let tickCounter = 0;
let withdrawn = false;
let nonrespondentCounter = 0;

function generateQuestionaireResult() {
    const placeboEffectProb = 0.5;
    return Math.random() < placeboEffectProb;
}

function react(signal) {
    if (signal.severeAdverseEffect) {
        console.log("withdraw!");
        withdrawn = true;
    }

    if (!withdrawn) {
        if (tickCounter % 2 == 0) {
            if (nonrespondentCounter > 2) {
                console.log("giveMinocycline 100mg")
            } else {
                console.log("givePlacebo 100mg")
            }
        }
    }
    if (tickCounter % 3 == 0) {
        console.log("collectQuestionnaire")
        if (generateQuestionaireResult()) {
            if (nonrespondentCounter > 2) {
                console.log("not responding to minocycline");
            } else {
                console.log("not responding to placebo");
            }

            if (++nonrespondentCounter > 2 && !withdrawn) {
                console.log("switching to minocycline");
            }
        }
    }
}


const severeAdverseEffectProb = 1 / 10;
for (let i = 0; i <= 10; ++i) {
    let signal = {tick: true};
    if (Math.random() < severeAdverseEffectProb) {
        signal.severeAdverseEffect = true;
    }
    console.log(i, signal);
    react(signal);
}