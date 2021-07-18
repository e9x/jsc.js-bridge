'use strict';

var Host = require('./Host'),
	IPC = require('./IPC');

class ServerContext extends Host {
	constructor(server){
		super(Object.assign(new server.Module.JSCJS(), {
			send(...data){
				this.eval(`JSC.context.ipc.emit(...${JSON.stringify(data)})`);
			},

		}));
		
		server.eventp.on(this.$.id, this.ipc.emit.bind(this.ipc));
		
		// Load the client script.
		this.$.eval(server.client_js.replace('CONTEXT_ID', this.$.id));
		
		this.$.send('ready');
	}
	destroy(){
		// Unallocate props etc in C++
		this.$.destroy();
		
		this.$.delete();
	}
}

module.exports = ServerContext;