'use strict';

var Host = require('./Host'),
	{ READY } = require('./EventTypes');

class ClientContext extends Host {
	constructor(server){
		super({
			eval: x => {
				jscLINK.log(x);
				this.bridge.eval(x);
			},
			id: jscLINK.id,
			send: (event, ...data) => {
				// this.link.log('SEND TO SERVER', event, data);
				this.link.send(event, ...data);
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
		
		this.link = jscLINK;
		
		jscLINK.event  = (event, ...data) => {
			// jscLINK.log('got event', event, data);
			
			if(!this.ipc.emit(event, ...data))this.link.log('Unregistered event:', event);
		};
		
		this.link.send(69);
		
		this.ipc.on(READY, () => {
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