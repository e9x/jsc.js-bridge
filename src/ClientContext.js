'use strict';

var Host = require('./Host');

class ClientContext extends Host {
	constructor(server, id, jsc_emit){
		super({
			eval: x => {
				this.bridge.eval(x);
			},
			id,
			send(...data){
				jsc_emit(JSON.stringify([ this.id, ...data ]));
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
		
		this.ipc.on('ready', () => {
			var cons = this.bridge.console;
			
			for(let prop of [ 'log', 'error', 'warn', 'debug', 'trace' ])globalThis.console[prop] = prop == 'error' ? ((...data) => {
				try{
					cons[prop]('[SUB]', ...data.map(data => this.native.error(data)))
				}catch(err){
					console_log(err + '');
				}
			}) : cons[prop].bind(cons, '[SUB]');
		});
	}
}

module.exports = ClientContext;