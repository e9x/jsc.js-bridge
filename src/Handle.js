'use strict';

class Handle {
	constructor(host, id, base){
		this.host = host;
		this.id = id;
		this.base = base;
	}
	apply(target, that, args){
		return this.host.ref_read(this.host.ipc.post('ref_apply', this.id, this.host.ref_create(that), args.length ? this.host.ref_create(args) : [ 'json', [] ]), true);
	}
	construct(target, args){
		return this.host.ref_read(this.host.ipc.post('ref_construct', this.id, this.host.ref_create(args)), true);
	}
	get(target, prop){
		return this.host.ref_read(this.host.ipc.post('ref_get', this.id, this.host.ref_create(prop)), true);
	}
	set(target, prop, value){
		return this.host.ref_read(this.host.ipc.post('ref_set', this.id, this.host.ref_create(prop), this.host.ref_create(value)), true);
	}
	getOwnPropertyDescriptor(target, prop){
		return this.host.ipc.post('ref_desc', this.id, this.host.ref_create(prop)) || undefined;
	}
	getPrototypeOf(target){
		return this.host.ref_read(this.host.ipc.post('ref_get_proto', this.id), true);
	}
	setPrototypeOf(target, value){
		return this.host.ref_read(this.host.ipc.post('ref_set_proto', this.id, this.host.ref_create(value)), true);
	}
	has(target, prop){
		return this.host.ipc.post('ref_has', this.id, this.host.ref_create(prop));
	}
	ownKeys(target){
		return [...new Set([...this.host.ref_read(this.host.ipc.post('ref_ownkeys', this.id), true)].concat(Reflect.ownKeys(this.base)))];
	}
};

module.exports = Handle;