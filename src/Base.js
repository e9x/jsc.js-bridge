var Events = require('./Events');

class Base {
	constructor(){
		// event pool, across multiple contexts
		this.eventp = new Events();
	}
};

module.exports = Base;