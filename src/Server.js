'use strict';

var current = typeof document == 'object' && document.currentScript ? document.currentScript.src : 'https://e9x.github.io/jsc.js-bridge/dist/',
	Host = require('./Host');

class Server extends Host {
	constructor(){
		super((...data) => this.Module.eval(`JSC.ipc.emit(...${JSON.stringify(data)})`));
		
		this.ipc.on('log', console.log.bind(console, '[WASM]'));
		
		this.create_module();
		
		this.ready.then(() => this.ipc.send('ready'));
		
		this.bytecode = {
			compile: src => {
				var hex = this.Module.compile_bytecode(src),
					arr = new Uint8Array(hex.length / 2);
				
				for(let index = 0; index < hex.length; index += 2){
					arr[index / 2] = parseInt(hex.substr(index, 2), 16);
				}
					
				return arr;
			},
			load: src => {
				if(Array.isArray(src))src = new Uint8Array(src);
				else if(src instanceof ArrayBuffer)src = new Uint8Array(src);
				else if(!(src instanceof Uint8Array))throw new TypeError('JSC.bytecode.load only accepts: ArrayBuffer, Uint8Array, Array');
				
				if(!src.byteLength)throw new Error('Invalid bytecode');
				
				var hex = '';
				
				for(let byte of src)hex += (byte & 0xff).toString(16).toUpperCase().padStart(2, 0);
				
				// TODO: return handle id
				this.Module.eval_bytecode(hex);
			},
		};
	}
	create_module(){
		this.Module = {
			postRun: async () => {
				// Load the client script.
				this.Module.eval(await(await fetch(new URL(client_file, current))).text());
				
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
		
		require('../build-wasm/out/jsc.js?emcc')(this.Module);
	}
};


module.exports = new Server();