'use strict';

class Handle {
	constructor(host, id){
		this.host = host;
		this.id = id;
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
		return this.host.ref_read(this.host.ipc.post('ref_proto', this.id), true);
	}
	has(target, prop){
		return this.host.ipc.post('ref_has', this.id, this.host.ref_create(prop));
	}
	ownKeys(target){
		return [...this.host.ref_read(this.host.ipc.post('ref_ownkeys', this.id), true)];
	}
};

module.exports = Handle;