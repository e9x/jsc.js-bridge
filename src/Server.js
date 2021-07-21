'use strict';

var current = typeof document == 'object' && document.currentScript ? document.currentScript.src : 'https://e9x.github.io/jsc.js-bridge/dist/',
	Context = require('./ServerContext'),
	Events = require('./Events');

class Server {
	constructor(){
		this.create_module();
		
		var self = this;
		
		this.Context = class extends Context {
			constructor(){
				super(self);
			}
		}
		
		var res;
		
		var fetch_p = fetch(new URL(client_file, current)).then(async res => {
			this.client_js = await res.text();
		});
		
		this.ready = new Promise((resolve, reject) => res = async () => {
			await fetch_p;
			
			resolve();
		});
		
		this.ready.resolve = res;
		
		// this.ready.then(() => this.ipc.send(READY));
	}
	create_module(){
		this.Module = {
			postRun: async () => {
				
				this.ready.resolve();
			},
			print(text){
				console.log(text);
			},
			printErr(...text){
				console.error(...text);
			},
			setStatus(text){
				// Unnecessary.
				// console.info('[JSC STATUS]', text);
			},
			locateFile(file){
				return new URL(file, current).href;
			},
		};
		
		this.Module.eventp = new Events();
		
		require('../build-wasm/out/jsc.js?emcc')(this.Module);
	}
};


module.exports = new Server();