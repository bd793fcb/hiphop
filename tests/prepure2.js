"use hopscript"

var rjs = require("../lib/reactive-js.js");

var o1 = new rjs.Signal("O1");
var o2 = new rjs.Signal("O2");

var prg = <rjs.ReactiveMachine debug name="prepure2">
  <rjs.outputsignal ref=${o1}/>
  <rjs.outputsignal ref=${o2}/>
  <rjs.localsignal signal_name="S">
    <rjs.loop>
      <rjs.sequence>
	<rjs.present test_pre signal_name="S">
	  <rjs.emit signal_name="O1"/>
	  <rjs.emit signal_name="O2"/>
	</rjs.present>
	<rjs.pause/>
	<rjs.emit signal_name="S"/>
      </rjs.sequence>
    </rjs.loop>
  </rjs.localsignal>
</rjs.ReactiveMachine>;

exports.prg = prg;
