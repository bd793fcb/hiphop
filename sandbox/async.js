
let tickCounter = 0;
let withdrawn = false;
let nonrespondentCounter = 0;

async function generateQuestionaireResult() {
    const placeboEffectProb = 0.5;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return Math.random() < placeboEffectProb;
}

async function react(signal) {
    if (signal.severeAdverseEffect) {
        console.log("withdraw!");
        withdrawn = true;
    }

    if (!withdrawn) {
        if (tickCounter % 2 == 0) {
            if (nonrespondentCounter >= 2) {
                console.log("giveMinocycline 100mg")
            } else {
                console.log("givePlacebo 100mg")
            }
        }
    }
    if (tickCounter % 3 == 0) {
        console.log("collectQuestionnaire")
        if (await generateQuestionaireResult()) {
            if (nonrespondentCounter > 2) {
                console.log("not responding to minocycline");
            } else {
                console.log("not responding to placebo");
                if (++nonrespondentCounter == 2 && !withdrawn) {
                    console.log("switching to minocycline");
                }
            }
        }
    }
    tickCounter++;
}


const severeAdverseEffectProb = 1 / 20;
for (let i = 0; i <= 10; ++i) {
    let signal = {tick: true};
    if (Math.random() < severeAdverseEffectProb) {
        signal.severeAdverseEffect = true;
    }
    console.log(i, signal);
    // react(signal);
    await react(signal);
}