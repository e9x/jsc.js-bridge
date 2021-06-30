'use strict';

var Handle = require('./Handle');

class Bridge {
	constructor(host){
		this.host = host;
		this.ipc = this.host.ipc;
		
		this.base_func = Object.setPrototypeOf(function(){}, null);
		
		this.base_obj = Object.setPrototypeOf({}, null);
		
		var descs = Object.getOwnPropertyDescriptors(this.base_func);
		
		for(let prop in descs){
			let desc = descs[prop];
			
			if(desc.configurable){
				Object.defineProperty(this.base_func, prop, {
					writable: true,
				});
				
				delete this.base_func[prop];
			}
		}
		
		Object.defineProperty(this.base_func, 'toString', {
			value(){
				return '[JSC Function]';
			},
			writable: true,
		});
		
		/*
		proxy => handle id
		for when a proxy is used as a ref when sending to the client
		*/
		
		this.proxies = new WeakMap();
		
		this.needs_handle = ['function', 'object'];
		
		this.symbols = [
			'search',
			'match',
			'matchAll',
			'replace',
			'species',
			'split',
			'toPrimitive',
			'toStringTag',
			'unscopables',
			'asyncIterator',
			'hasInstance',
			'isConcatSpreadable',
			'iterator',
		];
		
		this.ipc.on('eval', (resolve, code) => {
			var ret = {
				thrown: false,
				data: undefined,
			};
			
			try{
				ret.data = eval(code);
			}catch(err){
				ret.thrown = true;
				ret.data = err;
			}
			
			resolve(this.ref_create(ret));
		});
		
		this.ipc.on('ref_get', (resolve, target, prop, reciever) => {
			target = this.ref_resolve(target);
			prop = this.ref_read(prop);
			reciever = this.ref_read(reciever);
			
			var data, threw;
			
			try{ data = Reflect.get(target, prop, reciever)
			}catch(err){ data = err; threw = true }
			
			resolve(this.ref_create(data, threw));
		});
		
		this.ipc.on('ref_set', (resolve, target, prop, value) => {
			target = this.ref_resolve(target);
			prop = this.ref_read(prop);
			value = this.ref_read(value);
			
			var data, threw;
			
			try{ data = Reflect.set(target, prop, value)
			}catch(err){ data = err; threw = true }
			
			resolve(this.ref_create(data, threw));
		});
		
		this.ipc.on('ref_apply', (resolve, target, that, args) => {
			target = this.ref_resolve(target);
			that = this.ref_read(that);
			args = this.ref_read(args);
			
			if(args.length)args = [...args];
			else args = [];
			
			var data, threw;
			
			try{ data = Reflect.apply(target, that, args)
			}catch(err){ data = err; threw = true }
			
			resolve(this.ref_create(data, threw));
		});
		
		this.ipc.on('ref_construct', (resolve, target, args, new_target) => {
			args = [...this.ref_read(args)];
			new_target = this.ref_read(new_target);
			target = this.ref_resolve(target);
			
			var data, threw;
			
			try{ data = Reflect.construct(target, args, new_target)
			}catch(err){ data = err; threw = true }
			
			resolve(this.ref_create(data, threw));
		});
		
		this.ipc.on('ref_has', (resolve, target, prop) => {
			target = this.ref_resolve(target);
			prop = this.ref_read(prop);
			
			var data, threw;
			
			try{ data = Reflect.has(target, prop)
			}catch(err){ data = err; threw = true }
			
			resolve(this.ref_create(data, threw));
		});
		
		this.ipc.on('ref_get_proto', (resolve, id) => {
			var data, threw;
			
			try{ data = Reflect.getPrototypeOf(this.ref_resolve(id))
			}catch(err){ data = err; threw = true }
			
			resolve(this.ref_create(data, threw));
		});
		
		this.ipc.on('ref_set_proto', (resolve, id, value) => {
			var data, threw;
			
			try{ data = Reflect.setPrototypeOf(this.ref_resolve(id), this.ref_read(value))
			}catch(err){ data = err; threw = true }
			
			resolve(this.ref_create(data, threw));
		});
		
		this.ipc.on('ref_ownkeys', (resolve, id) => {
			var data, threw;
			
			try{ data = Reflect.ownKeys(this.ref_resolve(id))
			}catch(err){ data = err; threw = true }
			
			resolve(this.ref_create(data, threw));
		});
		
		this.ipc.on('ref_get_desc', (resolve, target, prop) => {
			target = this.ref_resolve(target);
			prop = this.ref_read(prop);
			
			var data, threw;
			
			try{ data = Object.entries(Reflect.getOwnPropertyDescriptor(target, prop))
			}catch(err){ data = err; threw = true }
			
			resolve(this.ref_create(data, threw));
		});
		
		this.ipc.on('ref_set_desc', (resolve, target, prop, value) => {
			target = this.ref_resolve(target);
			prop = this.ref_read(prop);
			value = this.ref_read(value);
			
			var data, threw;
			
			try{ data = Reflect.defineProperty(target, prop, Object.fromEntries(value))
			}catch(err){ data = err; threw = true }
			
			resolve(this.ref_create(data, threw));
		});
		
		this.ipc.on('ref_delete_prop', (resolve, target, prop) => {
			target = this.ref_resolve(target);
			prop = this.ref_read(prop);
			
			var data, threw;
			
			try{ data = Reflect.deleteProperty(target, prop)
			}catch(err){ data = err; threw = true }
			
			resolve(this.ref_create(data, threw));
		});
		
		this.refs = new Map();
		
		this.ref_create(this);
		this.global = this.ref_handle(0);
	}
	noop(){}
	ref_delete(id){
		return this.refs.delete(id);
	}
	ref_resolve(id){
		return this.refs.get(id);
	}
	ref_create(data, exception = false){
		var ret = [ typeof data, data, exception ];
		
		for(let [ id, dt ] of this.refs)if(data === dt){
			ret[1] = id;
			return ret;
		}
		
		if(this.proxies.has(data)){
			ret[0] = 'ref';
			ret[1] = this.proxies.get(data);
			return ret;
		}
		
		if(typeof data == 'symbol'){
			for(let prop of this.symbols)if(Symbol[prop] == data){
				ret[0] = 'symbol_res';
				ret[1] = prop;
				
				return ret;
			}
			
			console.warn('Could not create symbol:', data);
		}
		
		if(data === null){
			ret[0] = 'json';
			ret[1] = null;
			
			return ret;
		}
		
		if(!this.needs_handle.includes(typeof data))return ret;
		
		ret[1] = this.refs.size;
		
		this.refs.set(ret[1], data);
		
		return ret;
	}
	ref_read([ type, id, is_exception ], can_throw){
		var data;
		
		if(type == 'undefined')data = undefined;
		else if(type == 'symbol_res' && typeof id == 'string')data = Symbol[id];
		else if(type == 'ref')data = this.ref_resolve(id);
		else if(this.needs_handle.includes(type))data = this.ref_handle(id, type);
		else data = id;
		
		if(is_exception && can_throw)throw this.host.native.error(data);
		else return data;
	}
	// resolve a local reference
	ref_handle(id, type = 'object'){
		var target = type == 'function' ? this.base_func : this.base_obj,
			proxy = new Proxy(target, new Handle(this, id, target));
		
		this.proxies.set(proxy, id);
		
		return proxy;
	}
};

module.exports = Bridge;