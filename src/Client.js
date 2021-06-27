'use strict';

var Host = require('./Host');

class Client extends Host {
	constructor(){
		var jsc_emit = globalThis.jsc_emit;
		
		delete globalThis.jsc_emit;
		
		super((...data) => jsc_emit(JSON.stringify(data)));
		
		globalThis.global = globalThis;
		
		global.console_log = console.log = (...data) => this.ipc.send('log', ...data);
		
		this.ready.then(() => {
			var cons = this.global.console;
			
			for(let prop of Reflect.ownKeys(cons))global.console[prop] = (...data) => cons[prop]('[SUB]', ...data.map(data => this.registery.global.native_error(data)));
		});
	}
};

module.exports = new Client();