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
	construct(target, args, new_target){
		return this.host.ref_read(this.host.ipc.post('ref_construct', this.id, this.host.ref_create(args), this.host.ref_create(new_target)), true);
	}
	get(target, prop, reciever){
		return this.host.ref_read(this.host.ipc.post('ref_get', this.id, this.host.ref_create(prop), this.host.ref_create(reciever)), true);
	}
	set(target, prop, value){
		return this.host.ref_read(this.host.ipc.post('ref_set', this.id, this.host.ref_create(prop), this.host.ref_create(value)), true);
	}
	getOwnPropertyDescriptor(target, prop){
		var desc = this.host.ref_read(this.host.ipc.post('ref_get_desc', this.id, this.host.ref_create(prop)));
		
		// use Object.entries and Object.fromEntries to have the object as is, not a proxy or stuffed with getters
		return typeof desc == 'object' ? Object.fromEntries(desc) : desc;
	}
	defineProperty(target, prop, value){
		return this.host.ref_read(this.host.ipc.post('ref_set_desc', this.id, this.host.ref_create(prop), this.host.ref_create(Object.entries(value))));
	}
	deleteProperty(target, prop){
		return this.host.ref_read(this.host.ipc.post('ref_delete_prop', this.id, this.host.create_ref(), true));
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