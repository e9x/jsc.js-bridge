var JSC;
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./Bridge.js":
/*!*******************!*\
  !*** ./Bridge.js ***!
  \*******************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var Handle = __webpack_require__(/*! ./Handle */ "./Handle.js");

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
		
		this.ipc.on('ref_get', (resolve, id, propref) => {
			var prop = this.ref_read(propref),
				target = this.ref_resolve(id),
				data, threw;
			
			try{ data = Reflect.get(target, prop)
			}catch(err){ data = err; threw = true }
			
			resolve(this.ref_create(data, threw));
		});
		
		this.ipc.on('ref_set', (resolve, id, propref, valueref) => {
			var prop = this.ref_read(propref),
				value = this.ref_read(valueref),
				target = this.ref_resolve(id),
				data, threw;
			
			try{ data = Reflect.set(target, prop, value)
			}catch(err){ data = err; threw = true }
			
			resolve(this.ref_create(data, threw));
		});
		
		this.ipc.on('ref_apply', (resolve, id, thatref, argsref) => {
			var that = this.ref_read(thatref),
				args = this.ref_read(argsref),
				target = this.ref_resolve(id),
				good_args = [],
				data, threw;
			
			if(args.length)good_args = [...args];
			
			try{ data = Reflect.apply(target, that, good_args)
			}catch(err){ data = err; threw = true }
			
			resolve(this.ref_create(data, threw));
		});
		
		this.ipc.on('ref_construct', (resolve, id, args_ref, new_target_ref) => {
			var args = [...this.ref_read(args_ref)],
				new_target = this.ref_read(new_target_ref),
				target = this.ref_resolve(id),
				data, threw;
			
			try{ data = Reflect.construct(target, args, new_target)
			}catch(err){ data = err; threw = true }
			
			resolve(this.ref_create(data, threw));
		});
		
		this.ipc.on('ref_has', (resolve, id, propref) => {
			var data, threw;
			
			try{ data = Reflect.has(this.ref_resolve(id), this.ref_read(propref))
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
		
		if(is_exception && can_throw)throw this.native_error(data);
		else return data;
	}
	// resolve a local reference
	ref_handle(id, type = 'object'){
		var target = type == 'function' ? this.base_func : this.base_obj,
			proxy = new Proxy(target, new Handle(this, id, target));
		
		this.proxies.set(proxy, id);
		
		return proxy;
	}
	native_error(data){
		if(data instanceof this.host.context.Error){
			let newe = new(data.name in globalThis ? globalThis[data.name] : Error)(data.message + data.stack);
			
			return newe;
		}
		
		return data;
	}
};

module.exports = Bridge;

/***/ }),

/***/ "./Client.js":
/*!*******************!*\
  !*** ./Client.js ***!
  \*******************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var Host = __webpack_require__(/*! ./Host */ "./Host.js");

class Client extends Host {
	constructor(){
		var jsc_emit = globalThis.jsc_emit;
		
		delete globalThis.jsc_emit;
		
		super((...data) => jsc_emit(JSON.stringify(data)));
		
		globalThis.console_log = console.log = (...data) => this.ipc.send('log', ...data);
		
		this.ready.then(() => {
			var cons = this.context.console;
			
			for(let prop of [ 'log', 'error', 'warn', 'debug', 'trace' ])globalThis.console[prop] = prop == 'error' ? ((...data) => {
				try{
					cons[prop]('[SUB]', ...data.map(data => this.bridge.global.native_error(data)))
				}catch(err){
					console_log(err + '');
				}
			}) : cons[prop].bind(cons, '[SUB]');
		});
	}
};

module.exports = new Client();

/***/ }),

/***/ "./Events.js":
/*!*******************!*\
  !*** ./Events.js ***!
  \*******************/
/***/ ((module) => {



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

module.exports = Events;

/***/ }),

/***/ "./Handle.js":
/*!*******************!*\
  !*** ./Handle.js ***!
  \*******************/
/***/ ((module) => {



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

/***/ }),

/***/ "./Host.js":
/*!*****************!*\
  !*** ./Host.js ***!
  \*****************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var Bridge = __webpack_require__(/*! ./Bridge */ "./Bridge.js"),
	IPC = __webpack_require__(/*! ./IPC */ "./IPC.js");

class Host {
	constructor(ipc_send){
		this.ipc = new IPC(ipc_send);
		
		var promise = {};
		
		Object.assign(this.ready = new Promise((resolve, reject) => promise = { resolve, reject }), promise);
		
		this.bridge = new Bridge(this);
		
		this.bridge.ref_create(globalThis);
		this.bridge.ref_create(this);
		
		this.context = this.bridge.ref_handle(1);
		this.global = this.bridge.ref_handle(2);
		
		this.ipc.on('ready', () => {
			this.ready.resolve();
		});
	}
	debugger(){
		this.eval('debugger;');
	}
	eval(x, ...args){
		if(typeof x == 'function'){
			let ret = this.bridge.ref_read(this.ipc.post('eval', '(' + x + ')'));
			
			// SyntaxError
			if(ret.thrown)throw this.bridge.native_error(ret.data);
			
			try{
				return ret.data(...args);
			}catch(err){
				console.log(err);
				throw this.bridge.native_error(err);
			}
		}else{
			let ret = this.bridge.ref_read(this.ipc.post('eval', x));
			
			if(ret.thrown)throw this.bridge.native_error(ret.data);
			
			return ret.data;
		}
	}
	json(data){
		// create a parallel json object for sending to native functions like mutationobserver.observe options
		return this.context.JSON.parse(JSON.stringify(data));
	}
};

module.exports = Host;

/***/ }),

/***/ "./IPC.js":
/*!****************!*\
  !*** ./IPC.js ***!
  \****************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var Events = __webpack_require__(/*! ./Events */ "./Events.js");

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

module.exports = IPC;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./Client.js");
/******/ 	JSC = __webpack_exports__;
/******/ 	
/******/ })()
;typeof module=="object"?(module.exports=JSC):globalThis.JSC=JSC;typeof module=="object"?(module.exports=JSC):globalThis.JSC=JSC;