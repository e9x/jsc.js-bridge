'use strict';

var Host = require('./Host');

class ServerContext extends Host {
	constructor(server){
		var mod = new server.Module.JSCJS();
		
		mod.send = (event, ...data) => JSON.parse(mod.send_json(event, JSON.stringify(data)));
		
		mod.log = (...args) => console.log(JSON.stringify([ '[HOST]', ...args ]));
		
		super(mod);
		
		server.Module.eventp.register(this.$.id, (event, data) => {
			// console.log('FROM CPP', event, data);
			return this.ipc.emit(event, ...JSON.parse(data));
		});
		
		// Load the client script.
		this.$.main(server.client_js);
	}
	emit_log(prop, ...data){
		if(!this.emit(prop, ...data))console[prop](...data);
	}
}

module.exports = ServerContext;