import { ReactiveMachine } from "@hop/hiphop";

function generateQuestionaireResult() {
    const placeboEffectProb = 5 / 10;
    return true;
    return Math.random() < placeboEffectProb;
}

hiphop module treatmentSchedule() {
    in tick;
    in switchTreatment;
    out givePlacebo;
    out giveSertraline;

    abort (switchTreatment.now) {
        loop {
            emit givePlacebo("100mg");
            await count(2, tick.now);
        }
    }

    loop {
        emit giveSertraline("100mg");
        await count(2, tick.now);
    }
}

hiphop module questionnaireSchedule() {
    in tick; 
    out collectQuestionnaire;
    out switchTreatment;
    out nonresponse;

    fork {
        loop {
            emit collectQuestionnaire();
            if (generateQuestionaireResult()) {
                emit nonresponse();
            }

            await count(3, tick.now);
        }
    } par {
        loop {
            await count(2, nonresponse.now);
            emit switchTreatment();
        }
    }
}

hiphop module HelloWorld() {
    in tick; in severeAdverseEffect;
    out givePlacebo;
    out giveSertraline;
    out collectQuestionnaire;
    out switchTreatment;

    // run Sertraline schedule
    fork {
        await (severeAdverseEffect.now);
        hop {
            console.log("withdraw!");
        }
    } par {
        abort (severeAdverseEffect.now) {
            run treatmentSchedule() { * };
        }
    } par {
        run questionnaireSchedule() { * };
    }
}

const m = new ReactiveMachine(HelloWorld);
function logEvent(e) { console.log("got: ", e); }
m.addEventListener("givePlacebo", logEvent);
m.addEventListener("giveSertraline", logEvent);
m.addEventListener("collectQuestionnaire", logEvent);
m.addEventListener("switchTreatment", logEvent);
// m.react();

const severeAdverseEffectProb = 1 / 10;
for (let i = 0; i <= 10; ++i) {
    let signal = {tick: true};
    if (Math.random() < severeAdverseEffectProb) {
        signal.severeAdverseEffect = true;
    }
    console.log(i, signal);
    m.react(signal);
}