import { ReactiveMachine } from "@hop/hiphop";

import readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';


hiphop module confirm(question) {
    out answer;

    async (answer) {
        // in practice we would flag the specified question to be actioned, then
        // poll data updates from some remote database
        const rl = readline.createInterface({ input, output });
        rl.question(question + ' ', (resp) => {
            rl.close();
            let pass = resp === "Y";  // imagine more complicated checks here
            this.notify(pass);
        });
    }
}

hiphop module prescreen() {
    in day;
    out excluded;
    signal prescreenScore;

    hop {
        console.log("send pre-screening email");  // call some external api to send email
    }
    run confirm("pre-screening passed?") { prescreenScore as answer };
    if (!prescreenScore.nowval) {
        emit excluded();
    }

    await (day.now);
}


hiphop module screenRemote() {
    in day;
    out excluded;
    signal screenRemoteScore;

    hop {
        console.log("schedule remote screening");
    }
    run confirm("remote screening passed?") { screenRemoteScore as answer };
    if (!screenRemoteScore.nowval) {
        emit excluded();
    }

    await (day.now);
}

hiphop module screenOnsite() {
    in day;
    out excluded;
    signal screenOnsiteScore;

    hop {
        console.log("schedule onsite screening");
    }
    run confirm("onsite screening passed?") { screenOnsiteScore as answer };
    if (!screenOnsiteScore.nowval) {
        emit excluded();
    }

    await (day.now);
}

hiphop module screeningSchedule() {
    in day;
    out excluded;

    run prescreen() { * };
    run screenRemote() { * };
    run screenOnsite() { * };
}

hiphop module baselineSchedule() {
    run confirm("MADRS completed?") { * };
    run confirm("C-SSRS completed?") { * };
    run confirm("Concomitant Meds?") { * };
}

hiphop module deliverDose() {
    in dosage;
    out doseDelivered;

    run confirm("dose delivered?") { doseDelivered as answer };
}

hiphop module dosingSchedule() {
    in day;
    in adverseEffect;
    out dosage, doseDelivered;
    signal endOfSchedule;
    signal weekly;

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
                await (doseDelivered.now);

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
                await (doseDelivered.now);
                emit dosage([dosage.preval[0]+1, "ug"]);
            }
        }
        emit dosage([dosage.preval[0]-1, "ug"]);
        yield;

        sustain dosage(dosage.preval);
    }
    par { // freq
        // 2 out of 7 days a week for 8 weeks with the restriction that
        // microdoses should not take place on consecutive days.
        abort (endOfSchedule.nowval) {
            do {
                run deliverDose() { * };
                await (day.now);
                run deliverDose() { * };
            } every (weekly.now)
        }
        // measure day
    }
    par { // timer
        loop {
            emit weekly();
            await count(7, day.now);
        }
    }
    par {
        await count(8, weekly.now);
        emit endOfSchedule();
    }
}

hiphop module questionnairesSchedule() {
    in day;
    out adverseEffect;
    out missingQuestionnaireResult;
    signal sendQuestionnaire, questionnaireResult;
    fork { // start daily questionnaires schedule
        loop {
            await (day.now);
            emit sendQuestionnaire();
        }
    }
    par { // send out questionnaires as scheduled
        every (sendQuestionnaire.now) {
            run confirm("daily questionnaire?") { questionnaireResult as answer };
        }
    }
    par { // monitor questionnaires completion
        do {
            if (questionnaireResult.nowval == false) {
                emit adverseEffect();
            }

            loop {
                await count(2, sendQuestionnaire.now);
                emit missingQuestionnaireResult();
            }
        } every (questionnaireResult.now)
    }
}

hiphop module followupSchedule() {
    in day;
    out followUp;

    fork {
        await count(30, day.now);
        run confirm("C-SSRS completed?") { * };
        run confirm("DESS completed?") { * };
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
            run confirm("MADRS completed?") { * };
            run confirm("Concomitant Meds?") { * };
        }
    }

}

hiphop module LSDDEP() {
    in day;
    out excluded, eligible, withdrawn;
    out missingQuestionnaireResult;
    out adverseEffect;
    out dosage, doseDelivered;
    signal followUp;

    abort (excluded.pre) {
        // screening runs in series
        // any round can exclude a prospective participant and abort further progress
        // run screeningSchedule() { * };
        emit eligible();
    }

    if (eligible.now) {
        abort (withdrawn.now) {
            // run baselineSchedule() { * };
            fork {
                // run dosingSchedule() { * };
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
m.addEventListener("adverseEffect", logEvent);

let stopped = false;
let day = 0;
const availableActions = [];
// CONFIRM_PRESCREEN, CONFIRM_REMOTE_SCREEN, CONFIRM_ONSITE_SCREEN, 
while (!stopped) {
    console.log(`========== day ${day++} ==========`)
    m.react({ day: true });
    await new Promise((resolve) => setTimeout(resolve, 1000));
}