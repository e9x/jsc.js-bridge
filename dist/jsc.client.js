var JSC;
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./Base.js":
/*!*****************!*\
  !*** ./Base.js ***!
  \*****************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var Events = __webpack_require__(/*! ./Events */ "./Events.js");

class Base {
	constructor(){
		// event pool, across multiple contexts
		this.eventp = new Events();
	}
};

module.exports = Base;

/***/ }),

/***/ "./Client.js":
/*!*******************!*\
  !*** ./Client.js ***!
  \*******************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var Base = __webpack_require__(/*! ./Base */ "./Base.js"),
	IPC = __webpack_require__(/*! ./IPC */ "./IPC.js"),
	Context = __webpack_require__(/*! ./ClientContext */ "./ClientContext.js");

class Client extends Base {
	constructor(){
		super();
		
		var jsc_emit = globalThis.jsc_emit;
		
		delete globalThis.jsc_emit;
		
		this.context = new Context(this, CONTEXT_ID, jsc_emit);
	}
};

module.exports = new Client();

/***/ }),

/***/ "./ClientContext.js":
/*!**************************!*\
  !*** ./ClientContext.js ***!
  \**************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var Host = __webpack_require__(/*! ./Host */ "./Host.js");

class ClientContext extends Host {
	constructor(server, id, jsc_emit){
		super({
			eval: x => {
				this.bridge.eval(x);
			},
			id,
			send(...data){
				jsc_emit(JSON.stringify([ this.id, ...data ]));
			},
			destroy(){
				throw new Error('Cannot destroy the server context.');
			},
			compile_bytecode(){
				throw new Error('Cannot compile server bytecode.');
			},
			eval_bytecode(){
				throw new Error('Cannot eval server bytecode.');
			},
		});
		
		this.ipc.on('ready', () => {
			var cons = this.bridge.console;
			
			for(let prop of [ 'log', 'error', 'warn', 'debug', 'trace' ])globalThis.console[prop] = prop == 'error' ? ((...data) => {
				try{
					cons[prop]('[SUB]', ...data.map(data => this.native.error(data)))
				}catch(err){
					console_log(err + '');
				}
			}) : cons[prop].bind(cons, '[SUB]');
		});
	}
}

module.exports = ClientContext;

/***/ }),

/***/ "./Events.js":
/*!*******************!*\
  !*** ./Events.js ***!
  \*******************/
/***/ ((module) => {

"use strict";


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

"use strict";


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

/***/ }),

/***/ "./Host.js":
/*!*****************!*\
  !*** ./Host.js ***!
  \*****************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var Refs = __webpack_require__(/*! ./Refs */ "./Refs.js"),
	Events = __webpack_require__(/*! ./Events */ "./Events.js"),
	IPC = __webpack_require__(/*! ./IPC */ "./IPC.js");

class Host extends Events {
	constructor($){
		super();
		
		this.$ = $;
		
		this.ipc = new IPC(this.$.send.bind(this.$));
		
		this.refs = new Refs(this);
		
		this.refs.ref_create(globalThis);
		this.refs.ref_create(this);
		
		this.bridge = this.refs.ref_handle(1);
		this.global = this.refs.ref_handle(2);
		
		/*this.ipc.on('ready', () => {
			this.ready.resolve();
		});*/
		
		this.native = {
			error: data => {
				if(data instanceof this.bridge.Error){
					let newe = new (data.name in globalThis ? globalThis[data.name] : Error)();
					
					return data.name + ': ' + data.message + '\n' + data.stack;
				}
				
				return data;
			},
		};
		
		this.bytecode = {
			compile: src => {
				if(typeof src == 'function')src = `(${src})()`;
				else if(typeof src != 'string')throw new TypeError('Context.bytecode.compile only accepts: String, Function');
				
				var hex = this.$.compile_bytecode(src),
					arr = new Uint8Array(hex.length / 2);
				
				for(let index = 0; index < hex.length; index += 2){
					arr[index / 2] = parseInt(hex.substr(index, 2), 16);
				}
					
				return arr;
			},
			execute: src => {
				if(Array.isArray(src))src = new Uint8Array(src);
				else if(src instanceof ArrayBuffer)src = new Uint8Array(src);
				else if(!(src instanceof Uint8Array))throw new TypeError('Context.bytecode.execute only accepts: ArrayBuffer, Uint8Array, Array');
				
				if(!src.byteLength)throw new Error('Invalid bytecode');
				
				var hex = '';
				
				for(let byte of src)hex += (byte & 0xff).toString(16).toUpperCase().padStart(2, 0);
				
				// TODO: return handle id
				this.$.eval_bytecode(hex);
			},
		};
	}
	debugger(){
		this.eval('debugger;');
	}
	execute(x, ...args){
		if(typeof x == 'function'){
			let ret = this.refs.ref_read(this.ipc.post('eval', '(' + x + ')'));
			
			// SyntaxError
			if(ret.thrown)throw this.refs.native.error(ret.data);
			
			try{
				return ret.data(...args);
			}catch(err){
				console.log(err);
				throw this.refs.native.error(err);
			}
		}else{
			let ret = this.refs.ref_read(this.ipc.post('eval', x));
			
			if(ret.thrown)throw this.native.error(ret.data);
			
			return ret.data;
		}
	}
	// create a parallel json object for sending to native functions such as MutationObserver.observe.
	json(data){
		return this.bridge.JSON.parse(JSON.stringify(data));
	}
};

module.exports = Host;

/***/ }),

/***/ "./IPC.js":
/*!****************!*\
  !*** ./IPC.js ***!
  \****************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


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

/***/ }),

/***/ "./Refs.js":
/*!*****************!*\
  !*** ./Refs.js ***!
  \*****************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var Handle = __webpack_require__(/*! ./Handle */ "./Handle.js");

class Refs {
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

module.exports = Refs;

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