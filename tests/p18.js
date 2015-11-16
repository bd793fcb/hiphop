"use hopscript"

var rjs = require("../lib/reactive-js.js");

var S1_and_S2 = new rjs.Signal("S1_and_S2");
var S1_and_not_S2 = new rjs.Signal("S1_and_not_S2");
var not_S1_and_S2 = new rjs.Signal("not_S1_and_S2");
var not_S1_and_not_S2 = new rjs.Signal("not_S1_and_not_S2");

var prg = <rjs.reactivemachine debug name="P18">
  <rjs.outputsignal ref=${S1_and_S2}/>
  <rjs.outputsignal ref=${S1_and_not_S2}/>
  <rjs.outputsignal ref=${not_S1_and_S2}/>
  <rjs.outputsignal ref=${not_S1_and_not_S2}/>
  <rjs.loop>
    <rjs.trap trap_name="T1">
      <rjs.localsignal signal_name="S1">
	<rjs.parallel>
	  <rjs.sequence>
	    <rjs.pause/>
	    <rjs.emit signal_name="S1"/>
	    <rjs.exit trap_name="T1"/>
	  </rjs.sequence>
	  <rjs.loop>
	    <rjs.trap trap_name="T2">
	      <rjs.localsignal signal_name="S2">
		<rjs.parallel>
		  <rjs.sequence>
		    <rjs.pause/>
		    <rjs.emit signal_name="S2"/>
		    <rjs.exit trap_name="T2"/>
		  </rjs.sequence>
		  <rjs.loop>
		    <rjs.sequence>
		      <rjs.present signal_name="S1">
			<rjs.present signal_name="S2">
			  <rjs.emit signal_name="S1_and_S2"/>
			  <rjs.emit signal_name="S1_and_not_S2"/>
			</rjs.present>
			<rjs.present signal_name="S2">
			  <rjs.emit signal_name="not_S1_and_S2"/>
			  <rjs.emit signal_name="not_S1_and_not_S2"/>
			</rjs.present>
		      </rjs.present>
		      <rjs.pause/>
		    </rjs.sequence>
		  </rjs.loop>
		</rjs.parallel>
	      </rjs.localsignal>
	    </rjs.trap>
	  </rjs.loop>
	</rjs.parallel>
      </rjs.localsignal>
    </rjs.trap>
  </rjs.loop>
</rjs.reactivemachine>;

exports.prg = prg;
