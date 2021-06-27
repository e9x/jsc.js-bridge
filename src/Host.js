'use strict';

var Bridge = require('./Bridge'),
	IPC = require('./IPC');

class Host {
	constructor(ipc_send){
		this.ipc = new IPC(ipc_send);
		
		var promise = {};
		
		Object.assign(this.ready = new Promise((resolve, reject) => promise = { resolve, reject }), promise);
		
		this.registery = new Bridge(this);
		
		this.registery.ref_create(globalThis);
		this.registery.ref_create(this);
		
		this.global = this.registery.ref_handle(1);
		this.global_jsc = this.registery.ref_handle(2);
		
		this.ipc.on('ready', () => {
			this.ready.resolve();
		});
	}
	debugger(){
		this.eval('debugger;');
	}
	eval(x, ...args){
		if(typeof x == 'function'){
			let ret = this.registery.ref_read(this.ipc.post('eval', '(' + x + ')'));
			
			// SyntaxError
			if(ret.thrown)throw this.registery.native_error(ret.data);
			
			try{
				return ret.data(...args);
			}catch(err){
				console.log(err);
				throw this.registery.native_error(err);
			}
		}else{
			let ret = this.registery.ref_read(this.ipc.post('eval', x));
			
			if(ret.thrown)throw this.registery.native_error(ret.data);
			
			return ret.data;
		}
	}
	json(data){
		// create a parallel json object for sending to native functions like mutationobserver.observe options
		return this.global.JSON.parse(JSON.stringify(data));
	}
};

module.exports = Host;