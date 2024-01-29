import { ReactiveMachine } from "@hop/hiphop";

hiphop module generateQuestionaireResult() {
    out questionnaireResult;

    async (questionnaireResult) {
        const placeboEffectProb = 5 / 10;
        setTimeout(() => {
            this.notify(true);
        }, 1600); // this will come back on next tick
        // this.notify(Math.random() < placeboEffectProb);
    }
}

hiphop module treatmentSchedule() {
    in tick;
    in switchTreatment;
    out givePlacebo;
    out giveSertraline;

    out giveTreatment;

    fork {
        loop {
            emit giveTreatment("100mg");
            await count(2, tick.now);
        }
    } par {
        abort (switchTreatment.now) {
            loop {
                emit givePlacebo(giveTreatment.nowval);
                await (giveTreatment.now);
            }
        }

        loop {
            await (giveTreatment.now);
            emit giveSertraline(giveTreatment.nowval);
        }
    }
}

hiphop module questionnaireSchedule() {
    in tick; 
    out collectQuestionnaire;
    out switchTreatment;
    out treatmentUneffective;

    fork {
        loop {
            emit collectQuestionnaire();
            await count(3, tick.now);
        }
    } par {
        do {        
            run generateQuestionaireResult() { 
                treatmentUneffective as questionnaireResult 
            };
        } every (collectQuestionnaire.now);
    }
}

hiphop module HelloWorld() {
    in tick; in severeAdverseEffect;
    out givePlacebo;
    out giveSertraline;
    out collectQuestionnaire;
    out treatmentUneffective;
    out switchTreatment;

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
    } par {
        await count(2, treatmentUneffective.now);
        emit switchTreatment();
    }
}

const m = new ReactiveMachine(HelloWorld);
function logEvent(e) { console.log("got: ", e); }
m.addEventListener("givePlacebo", logEvent);
m.addEventListener("giveSertraline", logEvent);
m.addEventListener("collectQuestionnaire", logEvent);
m.addEventListener("switchTreatment", logEvent);
// m.react();

const severeAdverseEffectProb = 1 / 20;
for (let i = 0; i <= 10; ++i) {
    let signal = {tick: true};
    if (Math.random() < severeAdverseEffectProb) {
        signal.severeAdverseEffect = true;
    }
    console.log("-------", i, signal, "-------");
    m.react(signal);
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("--------  500ms  -------")
    await new Promise((resolve) => setTimeout(resolve, 500));
}