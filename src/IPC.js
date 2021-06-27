'use strict';

var Events = require('./Events');

class IPC extends Events {
	constructor(send){
		super();
		
		this.send = send;
		
		this.on('post', (id, event, ...data) => {
			this.emit(event, data => this.send(id, data), ...data);
		});
	}
	post(...data){
		var id = Math.random(),
			ret;
		
		this.once(id, data => ret = data);
		
		this.send('post', id, ...data);
		
		return ret;
	}
};

module.exports = IPC;