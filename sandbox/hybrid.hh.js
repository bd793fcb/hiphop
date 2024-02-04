import { ReactiveMachine } from "@hop/hiphop";

hiphop module treatmentSchedule() {
    in tick;
    in treatmentUneffective;
    in treatmentSignificantlyEffective;
    in switchTreatment;
    in pendingResult;
    out givePlacebo;
    out giveSertraline;

    inout giveTreatment;
    inout treatmentDosage;

    fork {
        // control treatment dosage
        emit treatmentDosage([100, "mg"]);
        dosageAdjustement: loop {
            if (treatmentUneffective.now) {
                emit treatmentDosage([200, "mg"]);
            }
            else if (treatmentSignificantlyEffective.now) {
                emit treatmentDosage([50, "mg"]);
            }
            yield;
        }
    } par {
        // control treatment frequency
        loop {
            emit giveTreatment(treatmentDosage.nowval);
            await count(2, tick.now);
        }
    } par {
        // control treatment switching
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
    out treatmentUneffective;
    out treatmentSignificantlyEffective;

    fork {
        abort (questionnaireResult.now) {
            sustain pendingResult();
        }
        if (questionnaireResult.nowval <= 8) {
            emit treatmentSignificantlyEffective();
        }
        else if (questionnaireResult.nowval > 15) {
            emit treatmentUneffective();
        }
    } par {
        async (questionnaireResult) {
            setTimeout(() => {
                // this.notify(30); // uneffective
                // this.notify(5); // effective
                // this.notify(10); // maintain
                let randScore = Math.random()*25;
                // console.log(randScore);
                this.notify(randScore);
            }, 1600); // this will come back on next tick
        }
    }
}

hiphop module questionnaireSchedule() {
    in tick; 
    out collectQuestionnaire;
    out pendingResult;
    out treatmentUneffective;
    out treatmentSignificantlyEffective;

    fork {
        loop {
            emit collectQuestionnaire();
            await count(3, tick.now);
        }
    } par {
        do {        
            run generateQuestionaireResult() { * };
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
    out treatmentSignificantlyEffective;
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
m.addEventListener("treatmentUneffective", logEvent);
m.addEventListener("treatmentSignificantlyEffective", logEvent);
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