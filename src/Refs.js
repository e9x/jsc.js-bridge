'use strict';

var { REF, EVAL } = require('./EventTypes');

class Handle {
	constructor(host, id, base){
		this.host = host;
		this.id = id;
		this.base = base;
	}
	apply(target, that, args){
		return this.host.read(this.host.ipc.send(REF.APPLY, this.id, this.host.create(that), args.length ? this.host.create(args) : [ 'json', [] ]), true);
	}
	construct(target, args, new_target){
		return this.host.read(this.host.ipc.send(REF.CONSTRUCT, this.id, this.host.create(args), this.host.create(new_target)), true);
	}
	get(target, prop, reciever){
		return this.host.read(this.host.ipc.send(REF.GET, this.id, this.host.create(prop), this.host.create(reciever)), true);
	}
	set(target, prop, value){
		return this.host.read(this.host.ipc.send(REF.SET, this.id, this.host.create(prop), this.host.create(value)), true);
	}
	getOwnPropertyDescriptor(target, prop){
		var desc = this.host.read(this.host.ipc.send(REF.GET_DESC, this.id, this.host.create(prop)));
		
		if(typeof desc == 'object'){
			desc = Object.fromEntries(desc);
			
			desc.configurable = true;
		}
		
		// use Object.entries and Object.fromEntries to have the object as is, not a proxy or stuffed with getters
		return desc;
	}
	defineProperty(target, prop, value){
		return this.host.read(this.host.ipc.send(REF.SET_DESC, this.id, this.host.create(prop), this.host.create(Object.entries(value))));
	}
	deleteProperty(target, prop){
		return this.host.read(this.host.ipc.send(REF.DELETE_PROP, this.id, this.host.create_ref(), true));
	}
	getPrototypeOf(target){
		return this.host.read(this.host.ipc.send(REF.GET_PROTO, this.id), true);
	}
	setPrototypeOf(target, value){
		return this.host.read(this.host.ipc.send(REF.SET_PROTO, this.id, this.host.create(value)), true);
	}
	has(target, prop){
		return this.host.ipc.send(REF.HAS, this.id, this.host.create(prop));
	}
	ownKeys(target){
		return [...new Set([...this.host.read(this.host.ipc.send(REF.OWNKEYS, this.id), true)].concat(Reflect.ownKeys(this.base)))];
	}
};

class Refs {
	name_func(func){
		var descs = Object.getOwnPropertyDescriptors(func);
		
		for(let prop in descs){
			let desc = descs[prop];
			
			if(desc.configurable){
				Object.defineProperty(func, prop, { writable: true });
				
				delete func[prop];
			}
		}
		
		return func;
	}
	scope(callback){
		// automatically create var data, threw; and create ref with return value
		return (resolve, ...handles) => {
			
		};
	}
	proxy_id(proxy){
		return this.proxies.get(proxy);
	}
	constructor(host){
		this.host = host;
		this.ipc = this.host.ipc;
		
		this.base = {
			// function: this.name_func(Object.setPrototypeOf({main(){}}['main'], null)),
			function: this.name_func(Object.setPrototypeOf(function(){}, null)),
			object: Object.setPrototypeOf({}, null),
		};
		
		/*
		proxy => handle id
		for when a proxy is used as a ref when sending to the client
		*/
		
		this.proxies = new WeakMap();
		
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
		
		this.ipc.register(EVAL, code => {
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
			
			return this.create(ret);
		});
		
		this.ipc.register(REF.GET, (target, prop, reciever) => {
			target = this.resolve(target);
			prop = this.read(prop);
			reciever = this.read(reciever);
			
			var data, threw;
			
			try{ data = Reflect.get(target, prop, reciever)
			}catch(err){ data = err; threw = true }
			
			return this.create(data, threw);
		});
		
		this.ipc.register(REF.SET, (target, prop, value) => {
			target = this.resolve(target);
			prop = this.read(prop);
			value = this.read(value);
			
			var data, threw;
			
			try{ data = Reflect.set(target, prop, value)
			}catch(err){ data = err; threw = true }
			
			return this.create(data, threw);
		});
		
		this.ipc.register(REF.APPLY, (target, that, args) => {
			target = this.resolve(target);
			that = this.read(that);
			args = this.read(args);
			
			if(args.length)args = [...args];
			else args = [];
			
			var data, threw;
			
			try{ data = Reflect.apply(target, that, args)
			}catch(err){ data = err; threw = true }
			
			return this.create(data, threw);
		});
		
		this.ipc.register(REF.CONSTRUCT, (target, args, new_target) => {
			args = [...this.read(args)];
			new_target = this.read(new_target);
			target = this.resolve(target);
			
			var data, threw;
			
			try{ data = Reflect.construct(target, args, new_target)
			}catch(err){ data = err; threw = true }
			
			return this.create(data, threw);
		});
		
		this.ipc.register(REF.HAS, (target, prop) => {
			target = this.resolve(target);
			prop = this.read(prop);
			
			var data, threw;
			
			try{ data = Reflect.has(target, prop)
			}catch(err){ data = err; threw = true }
			
			return this.create(data, threw);
		});
		
		this.ipc.register(REF.GET_PROTO, id => {
			var data, threw;
			
			try{ data = Reflect.getPrototypeOf(this.resolve(id))
			}catch(err){ data = err; threw = true }
			
			return this.create(data, threw);
		});
		
		this.ipc.register(REF.SET_PROTO, (id, value) => {
			var data, threw;
			
			try{ data = Reflect.setPrototypeOf(this.resolve(id), this.read(value))
			}catch(err){ data = err; threw = true }
			
			return this.create(data, threw);
		});
		
		this.ipc.register(REF.OWNKEYS, id => {
			var data, threw;
			
			try{ data = Reflect.ownKeys(this.resolve(id))
			}catch(err){ data = err; threw = true }
			
			return this.create(data, threw);
		});
		
		this.ipc.register(REF.GET_DESC, (target, prop) => {
			target = this.resolve(target);
			prop = this.read(prop);
			
			var data, threw;
			
			try{ data = Object.entries(Reflect.getOwnPropertyDescriptor(target, prop))
			}catch(err){ data = err; threw = true }
			
			return this.create(data, threw);
		});
		
		this.ipc.register(REF.SET_DESC, (target, prop, value) => {
			target = this.resolve(target);
			prop = this.read(prop);
			value = this.read(value);
			
			var data, threw;
			
			try{ data = Reflect.defineProperty(target, prop, Object.fromEntries(value))
			}catch(err){ data = err; threw = true }
			
			return this.create(data, threw);
		});
		
		this.ipc.register(REF.DELETE_PROP, (target, prop) => {
			target = this.resolve(target);
			prop = this.read(prop);
			
			var data, threw;
			
			try{ data = Reflect.deleteProperty(target, prop)
			}catch(err){ data = err; threw = true }
			
			return this.create(data, threw);
		});
		
		this.refs = new Map();
		
		this.create(this);
		this.global = this.handle(0);
	}
	delete(id){
		return this.refs.delete(id);
	}
	resolve(id){
		return this.refs.get(id);
	}
	create(data, exception = false){
		var res = false,
			ret = [ typeof data, data, exception ];
		
		for(let [ id, dt ] of this.refs)if(data === dt){
			ret[1] = id;
			res = true;
		}
		
		if(res){}
		else if(this.proxies.has(data)){
			ret[0] = 'ref';
			ret[1] = this.proxies.get(data);
		} else if(typeof data == 'symbol'){
			for(let prop of this.symbols)if(Symbol[prop] == data){
				ret[0] = 'symbol_res';
				ret[1] = prop;
				
				break;
			}
		}else if(data === null){
			ret[0] = 'json';
			ret[1] = null;
		}else if(this.base[ret[0]]){
			ret[1] = this.refs.size;
			this.refs.set(ret[1], data);
		}
		
		return ret;
	}
	read(arr, can_throw){
		if(!Array.isArray(arr))throw new ReferenceError(`The reference cannot be read. Was the reference destroyed? (Recieved '${arr}')`);
		
		var [ type, id, is_exception ] = arr;
		
		var data;
		
		if(type == 'undefined')data = undefined;
		else if(type == 'symbol_res' && typeof id == 'string')data = Symbol[id];
		else if(type == 'ref')data = this.resolve(id);
		else if(this.base[type])data = this.handle(id, type);
		else data = id;
		
		if(is_exception && can_throw)throw this.host.native.error(data);
		else return data;
	}
	// resolve a local reference
	handle(id, type = 'object'){
		var target = this.base[type],
			proxy = new Proxy(target, new Handle(this, id, target));
		
		this.proxies.set(proxy, id);
		
		return proxy;
	}
};

module.exports = Refs;