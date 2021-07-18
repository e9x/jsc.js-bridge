'use strict';

var Base = require('./Base'),
	IPC = require('./IPC'),
	Context = require('./ClientContext');

class Client extends Base {
	constructor(){
		super();
		
		var jsc_emit = globalThis.jsc_emit;
		
		delete globalThis.jsc_emit;
		
		this.context = new Context(this, CONTEXT_ID, jsc_emit);
	}
};

module.exports = new Client();