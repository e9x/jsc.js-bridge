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
		
		this.ipc.on('ref_construct', (resolve, id, argsref) => {
			var args = [...this.ref_read(argsref)],
				target = this.ref_resolve(id);
			
			resolve(this.ref_create(Reflect.construct(target, args)));
		});
		
		this.ipc.on('ref_apply', (resolve, id, thatref, argsref) => {
			var that = this.ref_read(thatref),
				args = this.ref_read(argsref),
				target = this.ref_resolve(id),
				good_args = [];
			
			if(args.length)good_args = [...args];
			
			resolve(this.ref_create(Reflect.apply(target, that, good_args)));
		});
		
		this.ipc.on('ref_has', (resolve, id, propref) => {
			resolve(this.ref_create(Reflect.has(this.ref_resolve(id), this.ref_read(propref))));
		});
		
		this.ipc.on('ref_proto', (resolve, id) => {
			resolve(this.ref_create(Reflect.getPrototypeOf(this.ref_resolve(id))));
		});
		
		this.ipc.on('ref_ownkeys', (resolve, id) => {
			resolve(this.ref_create(Reflect.ownKeys(this.ref_resolve(id))));
		});
		
		this.ipc.on('ref_desc', (resolve, id, propref) => {
			var desc = Reflect.getOwnPropertyDescriptor(this.ref_resolve(id), this.ref_read(propref));
			
			resolve(desc ? {
				writable: desc.writable,
				configurable: desc.configurable,
				enumerable: desc.enumerable,
				value: desc.value ? 'it exists' : undefined,
				get: desc.get ? this.global.noop : undefined,
				set: desc.set ? this.global.noop : undefined,
			} : desc);
		});
		
		this.ipc.on('ref_set', (resolve, id, propref, valueref) => {
			var prop = this.ref_read(propref),
				value = this.ref_read(valueref),
				target = this.ref_resolve(id);
			
			resolve(this.ref_create(Reflect.set(target, prop, value)));
		});
		
		this.ipc.on('ref_get', (resolve, id, propref) => {
			var prop = this.ref_read(propref),
				target = this.ref_resolve(id);
			
			resolve(this.ref_create(Reflect.get(target, prop)));
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
	ref_create(data){
		var ret = [ typeof data, data, data == null ];
		
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
		
		if(!this.needs_handle.includes(typeof data))return ret;
		
		ret[1] = this.refs.size;
		
		this.refs.set(ret[1], data);
		
		return ret;
	}
	ref_read([ type, id, is_null ]){
		if(is_null)return null;
		else if(type == 'symbol_res' && typeof id == 'string')return Symbol[id];
		else if(type == 'ref')return this.ref_resolve(id);
		else if(this.needs_handle.includes(type))return this.ref_handle(id, type);
		else return id;
	}
	// resolve a local reference
	ref_handle(id, type = 'object'){
		var proxy = new Proxy(type == 'function' ? this.base_func : this.base_obj, new Handle(this, id));
		
		this.proxies.set(proxy, id);
		
		return proxy;
	}
	native_error(data){
		if(data instanceof JSC.global.Error){
			let newe = new(data.name in window ? window[data.name] : Error)(data.message + data.stack);
			
			return newe;
		}
		
		return data;
	}
};

module.exports = Bridge;