"use hopscript"

import * as hh from "@hop/hiphop";

const inSig = {accessibility: hh.IN};
const outSig = {accessibility: hh.OUT};

const prg =
    <hh.module A=${inSig} B=${inSig} R=${inSig} O=${outSig}>
      <hh.loop>
	<hh.abort R>
	  <hh.parallel>
	    <hh.await A/>
	    <hh.await B/>
	  </hh.parallel>
	  <hh.emit O/>
	  <hh.halt/>
	</hh.abort>
      </hh.loop>
    </hh.module>

exports.prg = new hh.ReactiveMachine(prg, "ABRO");


