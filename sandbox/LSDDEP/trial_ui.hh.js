import { ReactiveMachine } from "@hop/hiphop";

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

hiphop module simpleMachIO(q) {
    in sigIN;
    out sigOUT;

    abort (sigIN.now) {
        sustain sigOUT(q);
    }
}

hiphop module simpleScreen(q) {
    in screenIN;
    out screenOUT, excluded;

    run simpleMachIO(q) { screenIN as sigIN, screenOUT as sigOUT };
    if (screenIN.nowval != "Y") {
        emit excluded();
    }
}

hiphop module prescreen() {
    in prescreenIN;
    out prescreenOUT, excluded;

    run simpleScreen("pre-screening passed?") {
        prescreenIN as screenIN,
        prescreenOUT as screenOUT,
        excluded as excluded
    };
}

hiphop module screenRemote() {
    in screenRemoteIN;
    out screenRemoteOUT, excluded;

    run simpleScreen("remote screening passed?") {
        screenRemoteIN as screenIN,
        screenRemoteOUT as screenOUT,
        excluded as excluded
    };
}

hiphop module screenOnsite() {
    in screenOnsiteIN;
    out screenOnsiteOUT, excluded;

    run simpleScreen("onsite screening passed?") {
        screenOnsiteIN as screenIN,
        screenOnsiteOUT as screenOUT,
        excluded as excluded
    };
}

hiphop module screeningSchedule() {
    out excluded;
    in prescreenIN, screenRemoteIN, screenOnsiteIN;
    out prescreenOUT, screenRemoteOUT, screenOnsiteOUT;

    run prescreen() { * };
    run screenRemote() { * };
    run screenOnsite() { * };
}

hiphop module baselineSchedule() {
    in madrsIN, cssrsIN, concomitantIN;
    out madrsOUT, cssrsOUT, concomitantOUT;
    fork {
        run simpleMachIO("MADRS completed?") { madrsIN as sigIN, madrsOUT as sigOUT };
    }
    par {
        run simpleMachIO("C-SSRS completed?") { cssrsIN as sigIN, cssrsOUT as sigOUT };
    }
    par {
        run simpleMachIO("Concomitant Meds?") { concomitantIN as sigIN, concomitantOUT as sigOUT };
    }
}

hiphop module deliverDose() {
    in dosage;
    out doseDelivered;
    in doseIN;
    out doseOUT;

    run simpleMachIO(`dose ${dosage.nowval[0]} ${dosage.nowval[1]} delivered?`) { doseIN as sigIN, doseOUT as sigOUT };
    emit doseDelivered(dosage.preval);
}

hiphop module dosingSchedule() {
    in day;
    in adverseEffect;

    in doseIN;
    out doseOUT;

    out dosage;
    out doseDelivered, missingDose;
    out weekly, endOfSchedule;

    fork {
        // MDLSD titration: If a participant expressed concern about non‐severe but poorly tolerated effects, dose
        // titration would be offered. Their dose was then halved to 5 μg, and then increased in 1 μg increments
        // at each subsequent dose until a noticeable, but tolerable effect was found.

        // dosage titration in LSDDEP1:
        // the initial dose has been reduced to 8 μg, increasing at
        // a rate of 1 μg per dose to a maximum dose of 15 μg. 
        emit dosage([8, "ug"]);
        abort (adverseEffect.now) {
            loop {
                await (doseIN.now);

                if (dosage.preval[0] < 15) {
                    emit dosage([dosage.preval[0]+1, "ug"]);
                } else {
                    sustain dosage([15, "ug"]);
                }
            }
        }
        // If participants experience any uncomfortable effects, their
        // dose will be reduced by 3 μg for their next dose, with this
        // increasing by 1 μg per dose to a level where they are com-
        // fortable.
        emit dosage([dosage.preval[0]-3, "ug"]);  // reduce by 3 μg
        abort (adverseEffect.now) { // increase until last comfortable
            loop {
                await (doseIN.now);
                emit dosage([dosage.preval[0]+1, "ug"]);
            }
        }
        emit dosage([dosage.preval[0]-1, "ug"]);
        yield;

        sustain dosage(dosage.preval);
    }
    par { // freq
        abort (endOfSchedule.nowval) {
            signal fulfilled;
            fork {
                // 2 out of 7 days a week for 8 weeks with the restriction that
                // microdoses should not take place on consecutive days.
                do {
                    run deliverDose() { * };
                    await (day.now);
                    run deliverDose() { * };
                } every (weekly.now)
            }
            par {
                // exactly two doses should be given per week
                every (weekly.now) {
                    await count(2, doseDelivered.now);
                    emit fulfilled();
                }
            }
            par {
                every (weekly.now) {
                    if (!fulfilled.pre) {
                        emit missingDose();
                    }
                }
            }
        }
        // measure day
    }
    par { // timer
        loop {
            await count(7, day.now);
            emit weekly();
        }
    }
    par {
        await count(8, weekly.now);
        emit endOfSchedule();
    }
}

hiphop module questionnairesSchedule() {
    in day;
    in questionnaireIN;
    out questionnaireOUT;

    out adverseEffect;
    out missingQuestionnaireResult;
    signal sendQuestionnaire;
    fork { // start daily questionnaires schedule
        every (day.now) {
            run simpleMachIO("daily questionnaire?") { questionnaireOUT as sigOUT, questionnaireIN as sigIN };
        };
    }
    par { // monitor questionnaires completion
        do {
            if (questionnaireIN.nowval == "ae") {
                emit adverseEffect();
            }

            loop {
                await count(2, day.now);
                emit missingQuestionnaireResult();
            }
        } every (questionnaireIN.now)
    }
}

hiphop module followupSchedule() {
    in day;
    out followUp;
    in madrsIN, cssrsIN, concomitantIN, dessIN;
    out madrsOUT, cssrsOUT, concomitantOUT, dessOUT;

    fork {
        await count(30, day.now);
        run simpleMachIO("C-SSRS completed?") { cssrsIN as sigIN, cssrsOUT as sigOUT };
        run simpleMachIO("DESS completed?") { dessIN as sigIN, dessOUT as sigOUT };
        emit followUp();
    }
    par {
        await count(3*30, day.now);
        emit followUp();
    }
    par {
        await count(6*30, day.now);
        emit followUp();
    }
    par {
        every (followUp.now) {
            run simpleMachIO("MADRS completed?") { madrsIN as sigIN, madrsOUT as sigOUT };
            run simpleMachIO("Concomitant Meds?") { concomitantIN as sigIN, concomitantOUT as sigOUT };
        }
    }

}

hiphop module LSDDEP() {
    in day;
    out excluded, eligible, withdrawn;
    out missingQuestionnaireResult, adverseEffect, dosage, doseDelivered, missingDose;
    out weekly;

    in prescreenIN, screenRemoteIN, screenOnsiteIN;
    out prescreenOUT, screenRemoteOUT, screenOnsiteOUT;

    in madrsIN, cssrsIN, concomitantIN;
    out madrsOUT, cssrsOUT, concomitantOUT;

    in doseIN;
    out doseOUT;

    in questionnaireIN;
    out questionnaireOUT;

    signal followUp;

    abort (excluded.pre) {
        // screening runs in series
        // any round can exclude a prospective participant and abort further progress
        run screeningSchedule() { * };
        emit eligible();
    }

    if (eligible.now) {
        abort (withdrawn.now) {
            run baselineSchedule() { * };
            fork {
                run dosingSchedule() { * };
                run followupSchedule() { * };
            }
            par {
                // run questionnaires until the first follow up
                abort (followUp.now) {
                    run questionnairesSchedule() { * };
                }
            }
        }
    }
}

const m = new ReactiveMachine(LSDDEP);
function logEvent(e) { console.log("got: ", e); }
m.addEventListener("excluded", logEvent);
m.addEventListener("eligible", logEvent);
m.addEventListener("missingQuestionnaireResult", logEvent);
m.addEventListener("dosage", logEvent);
m.addEventListener("doseDelivered", logEvent);
m.addEventListener("missingDose", logEvent);
m.addEventListener("adverseEffect", logEvent);
m.addEventListener("weekly", logEvent);

const pending = {};
function registerPendingQuestions(e) {
    let activity = e.signame.replace("OUT", "");
    pending[activity] = e.nowval;
}
m.addEventListener("prescreenOUT", registerPendingQuestions);
m.addEventListener("screenRemoteOUT", registerPendingQuestions);
m.addEventListener("screenOnsiteOUT", registerPendingQuestions);
m.addEventListener("madrsOUT", registerPendingQuestions);
m.addEventListener("cssrsOUT", registerPendingQuestions);
m.addEventListener("concomitantOUT", registerPendingQuestions);
m.addEventListener("doseOUT", registerPendingQuestions);
m.addEventListener("questionnaireOUT", registerPendingQuestions);

async function confirm(question) {
    const rl = readline.createInterface({ input, output });
    const answer = await rl.question(question + ' ');
    rl.close()
    return answer.trim();
}

let stopped = false;
let day = 0;
while (!stopped) {
    console.log(`========== day ${day++} ==========`)
    const sig = { day: true }

    console.log(pending);
    let choice = await confirm("choice:");
    while (choice != "n") {
        const chosenQuestion = pending[choice];
        if (chosenQuestion) {
            sig[`${choice}IN`] = await confirm(chosenQuestion);
            delete pending[choice];
        }
        else if (sig.hasOwnProperty(`${choice}IN`)) {
            sig[`${choice}IN`] = await confirm("overwrite sig: ");
        }

        console.log(pending);
        choice = await confirm("choice:");
    }

    // clear current pending obj
    for (const prop of Object.getOwnPropertyNames(pending)) {
        delete pending[prop];
    }

    // next tick
    console.log("react(", sig);
    m.react(sig);
    
}
