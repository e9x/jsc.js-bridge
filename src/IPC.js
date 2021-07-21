'use strict';

var Events = require('./Events'),
	{ POST } = require('./EventTypes');

class IPC extends Events {
	constructor(send){
		super();
		
		this.pid = 100;
		
		this.send = send;
		
		this.on(POST, (id, event, ...data) => {
			this.emit(event, data => this.send(id--, data), ...data);
		});
	}
	post(...data){
		var id = this.pid++,
			ret;
		
		this.once(id, data => ret = data);
		
		this.send(POST, id, ...data);
		
		return ret;
	}
};

module.exports = IPC;