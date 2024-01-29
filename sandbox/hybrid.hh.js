import { ReactiveMachine } from "@hop/hiphop";

hiphop module treatmentSchedule() {
    in tick;
    in switchTreatment;
    in pendingResult;
    out givePlacebo;
    out giveSertraline;

    inout giveTreatment;

    fork {
        loop {
            emit giveTreatment("100mg");
            await count(2, tick.now);
        }
    } par {
        emit givePlacebo(giveTreatment.nowval);

        abort (switchTreatment.now) {
            loop {
                await (giveTreatment.now);
                suspend immediate (pendingResult.now) {
                    emit givePlacebo(giveTreatment.nowval);
                }
            }
        }

        loop {
            emit giveSertraline(giveTreatment.nowval);
            await (giveTreatment.now);
        }
    }
}

hiphop module generateQuestionaireResult() {
    in tick;
    out pendingResult;
    out questionnaireResult;

    fork {
        abort (questionnaireResult.now) {
            sustain pendingResult();
        }
    } par {
        async (questionnaireResult) {
            const placeboEffectProb = 5 / 10;
            setTimeout(() => {
                this.notify(true);
            }, 1600); // this will come back on next tick
            // this.notify(Math.random() < placeboEffectProb);
        }
    }
}

hiphop module questionnaireSchedule() {
    in tick; 
    out collectQuestionnaire;
    out switchTreatment;
    out treatmentUneffective;
    out pendingResult;

    fork {
        loop {
            emit collectQuestionnaire();
            await count(3, tick.now);
        }
    } par {
        do {        
            run generateQuestionaireResult() { 
                treatmentUneffective as questionnaireResult,
                pendingResult as pendingResult,
            };
        } every (collectQuestionnaire.now);
    }
}

hiphop module HelloWorld() {
    in tick; in severeAdverseEffect;
    out givePlacebo;
    out giveSertraline;
    out collectQuestionnaire;
    out pendingResult;
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
// m.addEventListener("pendingResult", logEvent);
m.addEventListener("treatmentUneffective", logEvent);
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