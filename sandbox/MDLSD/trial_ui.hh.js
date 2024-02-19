import { ReactiveMachine } from "@hop/hiphop";

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

hiphop module simpleMachIO(q) {
    // communicate to some external systems subscribed to signals on the reactive machine

    // a pair of signals for each action to be taken
    // OUT indicates that an action is now available for selection
    // IN receives confirmation from an external system that the action has been taken
    in sigIN;
    out sigOUT;

    // in this simple IO helper, once an action is made active,
    // the action will be kept available until it is done by an external system
    abort (sigIN.now) {
        sustain sigOUT(q);
    }
}

hiphop module simpleScreen(q) {
    // confirmation wrapper for questions during the screening process
    // emit a given question through the reactive machine, then escalate
    // for exclusion if a negative response is received
    in screenIN;
    out screenOUT, excluded;

    run simpleMachIO(q) { screenIN as sigIN, screenOUT as sigOUT };
    if (screenIN.nowval != "Y") {
        emit excluded();
    }
}

// trivial modules to condense the schedule module, but can be expanded
// to include more detailed questionnaires / testing during the screening
hiphop module screenEligibility() {
    in screenIN;
    out screenOUT, excluded;

    run simpleScreen("screening passed?") {
        screenIN as screenIN,
        screenOUT as screenOUT,
        excluded as excluded
    };
}

hiphop module randomisation() {
    in randomisedLabelIN, randomisedInterventionIN;
    out randomisedLabelOUT, randomisedInterventionOUT;

    in emergencyUnmaskIN;
    out emergencyUnmaskOUT;

    in severeAdverseEffect, endOfSchedule;

    out labelName;
    out startIntervention;
    signal secretInterventionType;


    fork { // get inputs
        fork {
            run simpleMachIO("initialise intervention:") {
                randomisedInterventionIN as sigIN, randomisedInterventionOUT as sigOUT
            };
        }
        par {
            run simpleMachIO("initialise label assignment:") {
                randomisedLabelIN as sigIN, randomisedLabelOUT as sigOUT
            };
        }
    }
    par { // wait for init
        await (randomisedLabelIN.now && randomisedInterventionIN.now);
        emit secretInterventionType(randomisedInterventionIN.nowval);
        emit labelName(randomisedLabelIN.nowval);
        emit startIntervention();
    }
    par {  // persist the assigned random label name internally
        await (labelName.pre)
        sustain labelName(labelName.preval);
    }
    par {  // persist the assigned random intervention type internally
        await (secretInterventionType.pre);
        sustain secretInterventionType(secretInterventionType.preval);
    }
    par {  // monitor & react to potential unmasking
        abort (endOfSchedule.now) {
            await (severeAdverseEffect.now);  // assume triggered by some sae
            run simpleMachIO("unmasking required?") { emergencyUnmaskIN as sigIN, emergencyUnmaskOUT as sigOUT };
            if (emergencyUnmaskIN.nowval == "Y") {
                emit emergencyUnmaskOUT(secretInterventionType.nowval);
            }
        }
    }


}

hiphop module baselineSchedule() {
    in cssrsIN, modtasIN, dassIN, pssIN, bfi2IN, dflexIN, ffmqIN, mihEmoIN;
    out cssrsOUT, modtasOUT, dassOUT, pssOUT, bfi2OUT, dflexOUT, ffmqOUT, mihEmoOUT;
    fork {
        run simpleMachIO("C-SSRS completed?") { cssrsIN as sigIN, cssrsOUT as sigOUT };
    }
    par {
        run simpleMachIO("MODTAS completed?") { modtasIN as sigIN, modtasOUT as sigOUT };
    }
    par {
        run simpleMachIO("DASS completed?") { dassIN as sigIN, dassOUT as sigOUT };
    }
}

hiphop module deliverDose() {
    in dosage;
    out doseDelivered;
    in doseIN;
    out doseOUT;
    in labelName;

    run simpleMachIO(`dose ${labelName.nowval} ${dosage.nowval[0]} ${dosage.nowval[1]} delivered?`) { doseIN as sigIN, doseOUT as sigOUT };
    emit doseDelivered(dosage.preval);
}

hiphop module dosingSchedule() {
    in day;
    in adverseEffect;

    in doseIN;
    out doseOUT;

    in labelName;
    out dosage;
    out doseDelivered, missingDose;
    out weekly, endOfSchedule;

    fork {
        abort (adverseEffect.now) {
            sustain dosage([10, "ug"]);
        }

        // MDLSD titration: If a participant expressed concern about non‐severe but poorly tolerated effects, dose
        // titration would be offered. Their dose was then halved to 5 μg, and then increased in 1 μg increments
        // at each subsequent dose until a noticeable, but tolerable effect was found.
        emit dosage([5, "ug"]);
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
                loop {
                    run deliverDose() { * };
                    await count(2, day.now); // one dose every 3 days, so wait for 2 days in between
                }
            }
            par {
                do {
                    await (doseDelivered.now);
                    sustain fulfilled();
                } every (doseOUT.now)
            }
            par {
                every (doseOUT.now) {
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
        await count(6, weekly.now);
        emit endOfSchedule();
    }
}

hiphop module questionnairesSchedule() {
    in day;
    in questionnaireIN;
    out questionnaireOUT;

    out adverseEffect, severeAdverseEffect;
    out missingQuestionnaireResult;
    signal sendQuestionnaire;
    fork { // start daily questionnaires schedule
        do {
            run simpleMachIO("daily questionnaire?") { questionnaireOUT as sigOUT, questionnaireIN as sigIN };
        } every (day.now);
    }
    par { // monitor questionnaires completion
        every (questionnaireIN.now) {
            if (questionnaireIN.nowval == "ae") {
                emit adverseEffect();
            }
            if (questionnaireIN.nowval == "sae") {
                emit severeAdverseEffect();
            }

            loop { // warn if not preempted upon receiving result
                await (day.now);
                emit missingQuestionnaireResult();
            }
        } 
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
            run simpleMachIO("Concomitant Meds checked?") { concomitantIN as sigIN, concomitantOUT as sigOUT };
        }
    }

}

hiphop module MDLSD() {
    // timing
    in day;
    out weekly;
    // dynamic next tick time unit
    out nextWakeUp;

    // actions
    in randomisedLabelIN, randomisedInterventionIN;
    out randomisedLabelOUT, randomisedInterventionOUT;
    in emergencyUnmaskIN;
    out emergencyUnmaskOUT;
    in screenIN;
    out screenOUT;
    in doseIN;
    out doseOUT;
    in questionnaireIN;
    out questionnaireOUT;

    // baseline assessments
    in cssrsIN, modtasIN, dassIN, pssIN, bfi2IN, dflexIN, ffmqIN, mihEmoIN;
    out cssrsOUT, modtasOUT, dassOUT, pssOUT, bfi2OUT, dflexOUT, ffmqOUT, mihEmoOUT;
    // first dose monitoring
    in drugEffectVasIN, samIN, pomsIN, _5dascIN;
    out drugEffectVasOUT, samOUT, pomsOUT, _5dascOUT;

    // control signals
    out excluded, eligible, withdrawn, endOfSchedule;
    out dosage, doseDelivered, missingDose;
    out missingQuestionnaireResult, adverseEffect, severeAdverseEffect;
    signal labelName;
    signal secretInterventionType;
    signal startIntervention, followUp;

    fork {
        abort (excluded.pre) {
            run screenEligibility() { * };
            run randomisation() { * };
        }
    }
    par {
        await (startIntervention.now);

        fork {
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
        par {
            await (severeAdverseEffect.pre);
            emit withdrawn();
        }

    }
}

const m = new ReactiveMachine(MDLSD);
function logEvent(e) { console.log("got: ", e); }
m.addEventListener("excluded", logEvent);
m.addEventListener("eligible", logEvent);
m.addEventListener("missingQuestionnaireResult", logEvent);
m.addEventListener("dosage", logEvent);
m.addEventListener("doseDelivered", logEvent);
m.addEventListener("missingDose", logEvent);
m.addEventListener("adverseEffect", logEvent);
m.addEventListener("severeAdverseEffect", logEvent);
m.addEventListener("withdrawn", logEvent);
m.addEventListener("weekly", logEvent);

const pending = {};
function registerPendingQuestions(e) {
    let activity = e.signame.replace("OUT", "");
    pending[activity] = e.nowval;
}
m.addEventListener("screenOUT", registerPendingQuestions);
m.addEventListener("randomisedLabelOUT", registerPendingQuestions);
m.addEventListener("randomisedInterventionOUT", registerPendingQuestions);
m.addEventListener("cssrsOUT", registerPendingQuestions);
m.addEventListener("modtasOUT", registerPendingQuestions);
m.addEventListener("dassOUT", registerPendingQuestions);
m.addEventListener("doseOUT", registerPendingQuestions);
m.addEventListener("questionnaireOUT", registerPendingQuestions);
m.addEventListener("emergencyUnmaskOUT", registerPendingQuestions);

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
            sig[`${choice}IN`] = await confirm("ACTION: " + chosenQuestion);
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
    console.log("react(", sig, ")");
    m.react(sig);
    
}
