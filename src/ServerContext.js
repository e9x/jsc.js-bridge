'use strict';

var Host = require('./Host'),
	IPC = require('./IPC');

class ServerContext extends Host {
	constructor(server){
		var mod = new server.Module.JSCJS();
		
		mod.send = (event, ...data) => mod.send_json(event, JSON.stringify(data));
		
		mod.log = (...args) => console.log(JSON.stringify([ '[HOST]', ...args ]));
		
		super(mod);
		
		server.Module.eventp.on(this.$.id, this.ipc.emit.bind(this.ipc));
		
		/*(event, ...data) => {
			// console.log('INCOMING TO CTX', event, ...data);
			this.ipc.emit(event, ...data);
			// this.ipc.emit.bind(this.ipc)
		}*/
		
		// Load the client script.
		console.log('EVAL CLIENT:', this.$.eval(server.client_js));
		
		this.ipc.send(13);
		
		window.test = this;
	}
}

module.exports = ServerContext;