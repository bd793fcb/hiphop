"use hopscript"

var rjs = require("reactive-js");

var prg = <rjs.ReactiveMachine debug name="valuepre1">
  <rjs.outputsignal name="I" type="number"/>
  <rjs.outputsignal name="O" type="number" init_value=5 combine_with="+"/>
  <rjs.outputsignal name="U" type="number"/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.emit signal_name="I" exprs=3 />
      <rjs.emit signal_name="O" exprs=${rjs.Value("I")}/>
      <rjs.emit signal_name="U" exprs=${rjs.PreValue("O")}/>
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = prg;
