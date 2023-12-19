export const mach = new hh.ReactiveMachine(
   hiphop module(resolve) {
      inout A;
      T: fork {
	 loop {
	    let tmt;

	    async () {
	       tmt = setTimeout(this.notify.bind(this), 1000);
	    } kill {
	       mach.outbuf += ("killed") + "\n";
	       clearTimeout(tmt);
	    }

	    host { mach.outbuf += ('tick 10s') + "\n" }
	 }
      } par {
	 async () {
	    setTimeout(this.notify.bind(this), 50);
	 }
	 break T;
      }

      emit A();
      host { resolve(false); }
   });

mach.outbuf = "";
mach.debug_emitted_func = emitted => {
   mach.outbuf += format(emitted) + "\n";
};
mach.batchPromise = new Promise((res, rej) => mach.init(res));

mach.react();
