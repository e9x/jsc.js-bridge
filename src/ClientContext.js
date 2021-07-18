'use strict';

var Host = require('./Host');

class ClientContext extends Host {
	constructor(server, id, jsc_emit){
		super({
			eval: () => {
				
			},
			id,
			send(...data){
				jsc_emit(JSON.stringify([ this.id, ...data ]));
			},
		});
		
		/*
		globalThis.console_log = console.log = (...data) => this.ipc.send('log', ...data);
		
		// this.ready.then(() => {
		var cons = this.context.console;
		
		for(let prop of [ 'log', 'error', 'warn', 'debug', 'trace' ])globalThis.console[prop] = prop == 'error' ? ((...data) => {
			try{
				cons[prop]('[SUB]', ...data.map(data => this.bridge.global.native.error(data)))
			}catch(err){
				console_log(err + '');
			}
		}) : cons[prop].bind(cons, '[SUB]');
		// });
		*/
	}
}

module.exports = ClientContext;