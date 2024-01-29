import { ReactiveMachine } from "@hop/hiphop";

const HelloWorld = hiphop module() {
   in A; in B; in R;
   out O;
   do {
      fork {
         await (A.now);
      } par {
         await (B.now);
      }
      emit O();
   } every (R.now)
}

const m = new ReactiveMachine(HelloWorld);
m.addEventListener("O", e => console.log("got: ", e));
m.react();
console.log("emit A");
m.react({ A: 1 });
console.log("emit B");
m.react({ B: 2 });
console.log("emit AB");
m.react({ A: 3, B: 4 });
console.log("emit R");
m.react({ R: true });
console.log("emit AB");
m.react({ A: 3, B: 4 });