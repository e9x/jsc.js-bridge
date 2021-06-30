'use strict';

var Bridge = require('./Bridge'),
	IPC = require('./IPC');

class Host {
	constructor(ipc_send){
		this.ipc = new IPC(ipc_send);
		
		var promise = {};
		
		Object.assign(this.ready = new Promise((resolve, reject) => promise = { resolve, reject }), promise);
		
		this.bridge = new Bridge(this);
		
		this.bridge.ref_create(globalThis);
		this.bridge.ref_create(this);
		
		this.context = this.bridge.ref_handle(1);
		this.global = this.bridge.ref_handle(2);
		
		this.ipc.on('ready', () => {
			this.ready.resolve();
		});
		
		this.native = {
			error: data => {
				if(data instanceof this.context.Error){
					let newe = new (data.name in globalThis ? globalThis[data.name] : Error)();
					
					return data.name + ': ' + data.message + '\n' + data.stack;
				}
				
				return data;
			},
		};
	}
	debugger(){
		this.eval('debugger;');
	}
	eval(x, ...args){
		if(typeof x == 'function'){
			let ret = this.bridge.ref_read(this.ipc.post('eval', '(' + x + ')'));
			
			// SyntaxError
			if(ret.thrown)throw this.bridge.native.error(ret.data);
			
			try{
				return ret.data(...args);
			}catch(err){
				console.log(err);
				throw this.bridge.native.error(err);
			}
		}else{
			let ret = this.bridge.ref_read(this.ipc.post('eval', x));
			
			if(ret.thrown)throw this.bridge.native.error(ret.data);
			
			return ret.data;
		}
	}
	json(data){
		// create a parallel json object for sending to native functions like mutationobserver.observe options
		return this.context.JSON.parse(JSON.stringify(data));
	}
};

module.exports = Host;