'use strict';

var current = typeof document == 'object' && document.currentScript ? document.currentScript.src : 'https://e9x.github.io/jsc.js-bridge/dist/',
	Host = require('./Host');

class Server extends Host {
	constructor(){
		super((...data) => this.reval(`JSC.ipc.emit(...${JSON.stringify(data)})`));
		
		this.ipc.on('log', console.log.bind(console, '[WASM]'));
		
		this.create_module();
		
		this.ready.then(() => {
			this.reval(this.client_script);
			this.ipc.send('ready');
		});
		
		this.bytecode = {
			compile: src => {
				return this.bytecode_compile(src);
			},
			load: src => {
				this.bytecode_eval(src);
			},
		};
	}
	create_module(){
		var Module = {
			preRun: [
				async () => {
					// this.reval = this.Module.cwrap('jsc_eval', 'string', ['string']);
					
					var run = this.reval = Module.cwrap('jsc_eval', 'string', ['string']);
					
					this.reval = x => {
						var ret = run(x);
						
						if(ret.startsWith('Exception'))console.log(ret);
						
						return ret;
					};
					
					this.bytecode_compile = Module.cwrap('jsc_compile', 'string', ['string']);
					
					this.bytecode_eval = Module.cwrap('jsc_eval_bytecode', 'string', ['string']);
					
					this.client_script = await(await fetch(new URL(client_file, current))).text();
					
					setTimeout(() => this.ready.resolve(), 10);
				},
			],
			postRun: [],
			print(text){
				console.log('[JSC LOG]', text);
			},
			printErr(...text){
				console.error('[JSC ERROR]', ...text);
			},
			setStatus(text){
				// console.info('[JSC STATUS]', text);
			},
			locateFile(file){
				return new URL(file, current).href;
			},
		};
		
		require('../build-wasm/out/jsc.js?emcc')(Module);
	}
};


module.exports = new Server();