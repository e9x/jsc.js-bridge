'use strict';

var Host = require('./Host');

class Client extends Host {
	constructor(){
		var jsc_emit = globalThis.jsc_emit;
		
		delete globalThis.jsc_emit;
		
		super((...data) => jsc_emit(JSON.stringify(data)));
		
		globalThis.console_log = console.log = (...data) => this.ipc.send('log', ...data);
		
		this.ready.then(() => {
			var cons = this.context.console;
			
			for(let prop of [ 'log', 'error', 'warn', 'debug', 'trace' ])globalThis.console[prop] = prop == 'error' ? ((...data) => {
				try{
					cons[prop]('[SUB]', ...data.map(data => this.bridge.global.native_error(data)))
				}catch(err){
					console_log(err + '');
				}
			}) : cons[prop].bind(cons, '[SUB]');
		});
	}
};

module.exports = new Client();