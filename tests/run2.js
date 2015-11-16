"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigT = new rjs.Signal("T");
var sigW = new rjs.Signal("W");
var sigV = new rjs.Signal("V");
var sigZ = new rjs.Signal("Z");

var m1 = <rjs.reactivemachine debug name="m1">
  <rjs.inputsignal ref=${sigT}/>
  <rjs.inputsignal ref=${sigW}/>
  <rjs.outputsignal ref=${sigV}/>
  <rjs.outputsignal ref=${sigZ}/>
  <rjs.parallel>
    <rjs.present signal_name="T">
      <rjs.localsignal signal_name="L">
	<rjs.sequence>
	  <rjs.emit signal_name="L"/>
	  <rjs.emit signal_name="V"/>
	</rjs.sequence>
      </rjs.localsignal>
    </rjs.present>
    <rjs.present signal_name="W">
      <rjs.emit signal_name="Z"/>
    </rjs.present>
  </rjs.parallel>
</rjs.reactivemachine>;

var sigS = new rjs.Signal("S");
var sigU = new rjs.Signal("U");
var sigA = new rjs.Signal("A");
var sigB = new rjs.Signal("B");

var m2 = <rjs.reactivemachine debug name="run22">
  <rjs.inputsignal ref=${sigS}/>
  <rjs.inputsignal ref=${sigU}/>
  <rjs.outputsignal ref=${sigA}/>
  <rjs.outputsignal ref=${sigB}/>
  <rjs.sequence>
    <rjs.localsignal signal_name="L">
      <rjs.emit signal_name="L"/>
    </rjs.localsignal>
    <rjs.run machine=${m1} sigs_assoc=${{"T":"S",
					 "W":"U",
					 "V":"A",
					 "Z":"B"}}/>
    <rjs.run machine=${m1} sigs_assoc=${{"T":"S",
					 "W":"U",
					 "V":"A",
					 "Z":"B"}}/>
  </rjs.sequence>
</rjs.reactivemachine>;

exports.prg = m2;
