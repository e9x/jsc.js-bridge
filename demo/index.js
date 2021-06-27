'use strict';

// Website hosts: change the urls to paths resolving to JSC

var urls = {
	'jsc.js': 'jsc.js',
};

class Events {
	static resolve_list(target, event){
		if(!this.listeners)this.listeners = Symbol();
		
		var events = (target[Events.listeners] || (target[Events.listeners] = {}))[event] || (target[Events.listeners][event] = []);
		
		if(!events.merged){
			events.merged = true;
			
			if(target.constructor.hasOwnProperty(Events.listeners))events.push(...Events.resolve_list(target.constructor, event));
		}
		
		return events;
	};
	on(event, callback){
		Events.resolve_list(this, event).push(callback);
	}
	once(event, callback){
		var cb = (...data) => {
			this.off(event, cb);
			callback.call(this, ...data)
		};
		
		cb[Events.original_func] = callback;
		
		this.on(event, callback);
	}
	off(event, callback){
		if(typeof callback != 'function')throw new Error('callback is not a function');
		
		if(callback[Events.original_func])callback = callback[Events.original_func];
		
		var list = Events.resolve_list(this, event), ind = list.indexOf(callback);
		
		if(ind != -1)list.splice(ind, 1);
		
		if(!list.length)delete this[Events.listeners][event];
	}
	emit(event, ...data){
		var list = Events.resolve_list(this, event);
		
		if(!list.length){
			delete this[Events.listeners][event];
			if(event == 'error')throw data[0];
		}else for(var item of list)try{
			item.call(this, ...data);
		}catch(err){
			this.emit('error', err);
		}
	}
};

class Handle {
	constructor(host, id){
		this.host = host;
		this.id = id;
	}
	apply(target, that, args){
		return this.host.ref_read(this.host.ipc.post('ref_apply', this.id, this.host.ref_create(that), args.length ? this.host.ref_create(args) : [ 'json', [] ]));
	}
	construct(target, args){
		return this.host.ref_read(this.host.ipc.post('ref_construct', this.id, this.host.ref_create(args)));
	}
	get(target, prop){
		return this.host.ref_read(this.host.ipc.post('ref_get', this.id, this.host.ref_create(prop)));
	}
	set(target, prop, value){
		return this.host.ref_read(this.host.ipc.post('ref_set', this.id, this.host.ref_create(prop), this.host.ref_create(value)));
	}
	getOwnPropertyDescriptor(target, prop){
		return this.host.ipc.post('ref_desc', this.id, this.host.ref_create(prop)) || undefined;
	}
	getPrototypeOf(target){
		return this.host.ref_read(this.host.ipc.post('ref_proto', this.id));
	}
	has(target, prop){
		return this.host.ipc.post('ref_has', this.id, this.host.ref_create(prop));
	}
	ownKeys(target){
		return [...this.host.ref_read(this.host.ipc.post('ref_ownkeys', this.id))];
	}
}

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

class JSCBridge {
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
		
		// GOOD USAGE
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
}

class JSCBaseHost {
	constructor(ipc_send){
		this.ipc = new IPC(ipc_send);
		
		var promise = {};
		
		Object.assign(this.ready = new Promise((resolve, reject) => promise = { resolve, reject }), promise);
		
		this.registery = new JSCBridge(this);
		
		this.registery.ref_create(globalThis);
		this.registery.ref_create(this);
		
		this.global = this.registery.ref_handle(1);
		this.global_jsc = this.registery.ref_handle(2);
		
		this.ipc.on('ready', () => {
			this.ready.resolve();
		});
	}
	evaluate(x, ...args){
		var is_func = typeof x == 'function';
		
		if(is_func)x = '(' + x + ')';
		
		var ret = this.registery.ref_read(this.ipc.post('eval', x));
		
		if(ret.thrown)throw this.registery.native_error(ret.data);
		
		return is_func ? ret.data(...args) : ret.data;
	}
	json(data){
		// create a parallel json object for sending to native functions like mutationobserver.observe options
		return this.global.JSON.parse(JSON.stringify(data));
	}
};

class JSCClientHost extends JSCBaseHost {
	constructor(){
		super((...data) => jsc_emit(JSON.stringify(data)));
		
		globalThis.global = globalThis;
		
		global.console_log = console.log = (...data) => this.ipc.send('log', ...data);
		
		this.ready.then(() => {
			var cons = this.global.console;
			
			for(let prop of Reflect.ownKeys(cons))global.console[prop] = (...data) => cons[prop]('[SUB]', ...data.map(data => this.registery.global.native_error(data)));
		});
	}
};

class JSCServerHost extends JSCBaseHost {
	constructor(){
		super((...data) => this.reval(`JSC.ipc.emit(...${JSON.stringify(data)})`));
		
		this.ipc.on('log', console.log.bind(console, '[WASM]'));
		
		this.create_module();
		
		this.ready.then(() => {
			this.reval(`${Events};${JSCBridge};${Handle};${IPC};${JSCBaseHost};${JSCClientHost};this.JSC = new JSCClientHost();`);
			this.ipc.send('ready');
		});
		
		this.bytecode = {
			compile: src => {
				return this.bytecode_compile(src);
			},
			load: src => {
				this.bytecode_eval(src);
			},
		};
	}
	create_module(){
		var Module = {
			preRun: [
				() => {
					// this.reval = this.Module.cwrap('jsc_eval', 'string', ['string']);
					
					var run = this.reval = Module.cwrap('jsc_eval', 'string', ['string']);
					
					this.reval = x => {
						var ret = run(x);
						
						if(ret.startsWith('Exception'))console.log(ret);
						
						return ret;
					};
					
					this.bytecode_compile = Module.cwrap('jsc_compile', 'string', ['string']);
					
					this.bytecode_eval = Module.cwrap('jsc_eval_bytecode', 'string', ['string']);
					
					setTimeout(() => this.ready.resolve(), 10);
				},
			],
			postRun: [],
			print(text){
				console.log('[JSC LOG]', text);
			},
			printErr(...text){
				console.error('[JSC ERROR]', ...text);
			},
			setStatus(text){
				// console.info('[JSC STATUS]', text);
			},
		};
		
		fetch(urls['jsc.js']).then(res => res.text()).then(text => new Function('Module', text)(Module));
	}
};

window.JSC = new JSCServerHost();