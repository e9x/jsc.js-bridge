'use strict';

var Host = require('./Host'),
	{ READY } = require('./EventTypes');

class ClientContext extends Host {
	constructor(server){
		super({
			eval: x => {
				$.log(x);
				this.bridge.eval(x);
			},
			id: $.id,
			log: $.log,
			send: (event, ...data) => {
				return JSON.parse($.send(event, ...data));
			},
			delete(){
				throw new Error('Cannot delete the server context.');
			},
			compile_bytecode(){
				throw new Error('Cannot compile server bytecode.');
			},
			eval_bytecode(){
				throw new Error('Cannot eval server bytecode.');
			},
		});
		
		$.event  = this.ipc.emit.bind(this.ipc);
		
		var cons = this.bridge.console;
		
		for(let prop of [ 'log', 'error', 'warn', 'debug', 'trace' ])globalThis.console[prop] = prop == 'error' ? ((...data) => {
			try{
				cons[prop]('[JSC]', ...data.map(data => this.native.error(data)))
			}catch(err){
				console_log(err + '');
			}
		}) : cons[prop].bind(cons, '[JSC]');
	}
}

module.exports = ClientContext;