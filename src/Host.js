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
	evaluate(x, ...args){
		var is_func = typeof x == 'function';
		
		if(is_func)x = '(' + x + ')';
		
		var ret = this.registery.ref_read(this.ipc.post('eval', x));
		
		if(ret.thrown)throw this.registery.native_error(ret.data);
		
		return is_func ? ret.data(...args) : ret.data;
	}
	json(data){
		// create a parallel json object for sending to native functions like mutationobserver.observe options
		return this.global.JSON.parse(JSON.stringify(data));
	}
};

module.exports = Host;