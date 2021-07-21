'use strict';

var Context = require('./ClientContext');

class Client {
	constructor(){
		this.context = new Context(this);
	}
};

module.exports = new Client();