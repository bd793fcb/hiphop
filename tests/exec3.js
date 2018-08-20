"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module O>
	<hh.exec O apply=${function() {
	   this.notifyAndReact( new Promise( function( resolve, reject ) {
	      setTimeout( () => resolve( 5 ), 1000 );
	   } ) );
	}}/>
      </hh.module>

var machine = new hh.ReactiveMachine(prg, "exec");

machine.addEventListener( "O", function( evt ) {
   console.log( "O=" + evt.signalValue.val + " emitted!" );
} );

machine.react();