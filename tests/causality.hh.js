"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module example() {
   inout I; out O;
      
   loop {
      if( O.now ) emit I();
      yield;
      emit O();
   }
}

exports.prg = new hh.ReactiveMachine( example, "presentemit" );
