var JSC;
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./Client.js":
/*!*******************!*\
  !*** ./Client.js ***!
  \*******************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var Context = __webpack_require__(/*! ./ClientContext */ "./ClientContext.js");

class Client {
	constructor(){
		this.context = new Context(this);
	}
};

module.exports = new Client();

/***/ }),

/***/ "./ClientContext.js":
/*!**************************!*\
  !*** ./ClientContext.js ***!
  \**************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var Host = __webpack_require__(/*! ./Host */ "./Host.js"),
	{ READY } = __webpack_require__(/*! ./EventTypes */ "./EventTypes.js");

class ClientContext extends Host {
	constructor(server){
		super({
			eval: x => {
				jscLINK.log(x);
				this.bridge.eval(x);
			},
			id: jscLINK.id,
			send: (event, ...data) => {
				// this.link.log('SEND TO SERVER', event, data);
				this.link.send(event, ...data);
			},
			delete(){
				throw new Error('Cannot delete the server context.');
			},
			compile_bytecode(){
				throw new Error('Cannot compile server bytecode.');
			},
			eval_bytecode(){
				throw new Error('Cannot eval server bytecode.');
			},
		});
		
		this.link = jscLINK;
		
		jscLINK.event  = (event, ...data) => {
			// jscLINK.log('got event', event, data);
			
			if(!this.ipc.emit(event, ...data))this.link.log('Unregistered event:', event);
		};
		
		this.link.send(69);
		
		this.ipc.on(READY, () => {
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

/***/ "./EventTypes.js":
/*!***********************!*\
  !*** ./EventTypes.js ***!
  \***********************/
/***/ ((__unused_webpack_module, exports) => {



exports.REF = {
	APPLY: 0,
	CONSTRUCT: 1,
	GET: 2,
	SET: 3,
	GET_DESC: 4,
	SET_DESC: 5,
	GET_PROTO: 6,
	SET_PROTO: 7,
	DELETE_PROP: 8,
	HAS: 9,
	OWNKEYS: 10,
};

exports.EVAL = 11;
exports.POST = 12;
exports.READY = 13;

/***/ }),

/***/ "./Events.js":
/*!*******************!*\
  !*** ./Events.js ***!
  \*******************/
/***/ ((module) => {



class Events {
	static resolve(target, event){
		var events = this.map.get(target);
		
		if(!events){
			events = new Map();
			this.map.set(target, events);
		}
		
		var callbacks = events.get(event);
		
		if(!callbacks){
			callbacks = new Set();
			events.set(event, callbacks);
		}
		
		return callbacks;
	};
	on(event, callback){
		if(typeof callback != 'function')throw new TypeError('callback is not a function');
		
		Events.resolve(this, event).add(callback);
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
		if(typeof callback != 'function')throw new TypeError('callback is not a function');
		
		if(callback[Events.original_func])callback = callback[Events.original_func];
		
		var list = Events.resolve(this, event);
		
		list.delete(callback);
	}
	emit(event, ...data){
		var set = Events.resolve(this, event);
		
		if(!set.size){
			if(event == 'error')throw data[0];
			return false;
		}else for(let item of set)try{
			item.call(this, ...data);
		}catch(err){
			this.emit('error', err);
		}
		
		return true;
	}
};

Events.map = new WeakMap();

module.exports = Events;

/***/ }),

/***/ "./Host.js":
/*!*****************!*\
  !*** ./Host.js ***!
  \*****************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var Refs = __webpack_require__(/*! ./Refs */ "./Refs.js"),
	Events = __webpack_require__(/*! ./Events */ "./Events.js"),
	IPC = __webpack_require__(/*! ./IPC */ "./IPC.js"),
	{ EVAL } = __webpack_require__(/*! ./EventTypes */ "./EventTypes.js");

class Host extends Events {
	constructor($){
		super();
		
		this.$ = $;
		
		this.ipc = new IPC((event, ...data) => {
			this.$.send(event, ...data);
		});
		
		this.refs = new Refs(this);
		
		this.refs.create(globalThis);
		this.refs.create(this);
		
		this.bridge = this.refs.handle(1);
		this.global = this.refs.handle(2);
		
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
			let ret = this.refs.read(this.ipc.post(EVAL, '(' + x + ')'));
			
			// SyntaxError
			if(ret.thrown)throw this.refs.native.error(ret.data);
			
			try{
				return ret.data(...args);
			}catch(err){
				console.log(err);
				throw this.refs.native.error(err);
			}
		}else{
			let ret = this.refs.read(this.ipc.post(EVAL, x));
			
			if(ret.thrown)throw this.native.error(ret.data);
			
			return ret.data;
		}
	}
	// create a parallel json object for sending to native functions such as MutationObserver.observe.
	json(data){
		return this.bridge.JSON.parse(JSON.stringify(data));
	}
	destroy(){
		this.$.delete();
		delete this.refs;
		delete this.ipc;
		delete this.global;
		delete this.bridge;
		delete this.native;
		delete this.bytecode;
		delete this.$;
	}
};

module.exports = Host;

/***/ }),

/***/ "./IPC.js":
/*!****************!*\
  !*** ./IPC.js ***!
  \****************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var Events = __webpack_require__(/*! ./Events */ "./Events.js"),
	{ POST } = __webpack_require__(/*! ./EventTypes */ "./EventTypes.js");

class IPC extends Events {
	constructor(send){
		super();
		
		this.pid = 100;
		
		this.send = send;
		
		this.on(POST, (id, event, ...data) => {
			this.emit(event, data => this.send(id--, data), ...data);
		});
	}
	post(...data){
		var id = this.pid++,
			ret;
		
		this.once(id, data => ret = data);
		
		this.send(POST, id, ...data);
		
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



var { REF, EVAL } = __webpack_require__(/*! ./EventTypes */ "./EventTypes.js");

class Handle {
	constructor(host, id, base){
		this.host = host;
		this.id = id;
		this.base = base;
	}
	apply(target, that, args){
		return this.host.read(this.host.ipc.post(REF.APPLY, this.id, this.host.create(that), args.length ? this.host.create(args) : [ 'json', [] ]), true);
	}
	construct(target, args, new_target){
		return this.host.read(this.host.ipc.post(REF.CONSTRUCT, this.id, this.host.create(args), this.host.create(new_target)), true);
	}
	get(target, prop, reciever){
		return this.host.read(this.host.ipc.post(REF.GET, this.id, this.host.create(prop), this.host.create(reciever)), true);
	}
	set(target, prop, value){
		return this.host.read(this.host.ipc.post(REF.SET, this.id, this.host.create(prop), this.host.create(value)), true);
	}
	getOwnPropertyDescriptor(target, prop){
		var desc = this.host.read(this.host.ipc.post(REF.GET_DESC, this.id, this.host.create(prop)));
		
		// use Object.entries and Object.fromEntries to have the object as is, not a proxy or stuffed with getters
		return typeof desc == 'object' ? Object.fromEntries(desc) : desc;
	}
	defineProperty(target, prop, value){
		return this.host.read(this.host.ipc.post(REF.SET_DESC, this.id, this.host.create(prop), this.host.create(Object.entries(value))));
	}
	deleteProperty(target, prop){
		return this.host.read(this.host.ipc.post(REF.DELETE_PROP, this.id, this.host.create_ref(), true));
	}
	getPrototypeOf(target){
		return this.host.read(this.host.ipc.post(REF.GET_PROTO, this.id), true);
	}
	setPrototypeOf(target, value){
		return this.host.read(this.host.ipc.post(REF.SET_PROTO, this.id, this.host.create(value)), true);
	}
	has(target, prop){
		return this.host.ipc.post(REF.HAS, this.id, this.host.create(prop));
	}
	ownKeys(target){
		return [...new Set([...this.host.read(this.host.ipc.post(REF.OWNKEYS, this.id), true)].concat(Reflect.ownKeys(this.base)))];
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
		
		this.ipc.on(EVAL, (resolve, code) => {
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
			
			resolve(this.create(ret));
		});
		
		this.ipc.on(REF.GET, (resolve, target, prop, reciever) => {
			target = this.resolve(target);
			prop = this.read(prop);
			reciever = this.read(reciever);
			
			var data, threw;
			
			try{ data = Reflect.get(target, prop, reciever)
			}catch(err){ data = err; threw = true }
			
			resolve(this.create(data, threw));
		});
		
		this.ipc.on(REF.SET, (resolve, target, prop, value) => {
			target = this.resolve(target);
			prop = this.read(prop);
			value = this.read(value);
			
			var data, threw;
			
			try{ data = Reflect.set(target, prop, value)
			}catch(err){ data = err; threw = true }
			
			resolve(this.create(data, threw));
		});
		
		this.ipc.on(REF.APPLY, (resolve, target, that, args) => {
			target = this.resolve(target);
			that = this.read(that);
			args = this.read(args);
			
			if(args.length)args = [...args];
			else args = [];
			
			var data, threw;
			
			try{ data = Reflect.apply(target, that, args)
			}catch(err){ data = err; threw = true }
			
			resolve(this.create(data, threw));
		});
		
		this.ipc.on(REF.CONSTRUCT, (resolve, target, args, new_target) => {
			args = [...this.read(args)];
			new_target = this.read(new_target);
			target = this.resolve(target);
			
			var data, threw;
			
			try{ data = Reflect.construct(target, args, new_target)
			}catch(err){ data = err; threw = true }
			
			resolve(this.create(data, threw));
		});
		
		this.ipc.on(REF.HAS, (resolve, target, prop) => {
			target = this.resolve(target);
			prop = this.read(prop);
			
			var data, threw;
			
			try{ data = Reflect.has(target, prop)
			}catch(err){ data = err; threw = true }
			
			resolve(this.create(data, threw));
		});
		
		this.ipc.on(REF.GET_PROTO, (resolve, id) => {
			var data, threw;
			
			try{ data = Reflect.getPrototypeOf(this.resolve(id))
			}catch(err){ data = err; threw = true }
			
			resolve(this.create(data, threw));
		});
		
		this.ipc.on(REF.SET_PROTO, (resolve, id, value) => {
			var data, threw;
			
			try{ data = Reflect.setPrototypeOf(this.resolve(id), this.read(value))
			}catch(err){ data = err; threw = true }
			
			resolve(this.create(data, threw));
		});
		
		this.ipc.on(REF.OWNKEYS, (resolve, id) => {
			var data, threw;
			
			try{ data = Reflect.ownKeys(this.resolve(id))
			}catch(err){ data = err; threw = true }
			
			resolve(this.create(data, threw));
		});
		
		this.ipc.on(REF.GET_DESC, (resolve, target, prop) => {
			target = this.resolve(target);
			prop = this.read(prop);
			
			var data, threw;
			
			try{ data = Object.entries(Reflect.getOwnPropertyDescriptor(target, prop))
			}catch(err){ data = err; threw = true }
			
			resolve(this.create(data, threw));
		});
		
		this.ipc.on(REF.SET_DESC, (resolve, target, prop, value) => {
			target = this.resolve(target);
			prop = this.read(prop);
			value = this.read(value);
			
			var data, threw;
			
			try{ data = Reflect.defineProperty(target, prop, Object.fromEntries(value))
			}catch(err){ data = err; threw = true }
			
			resolve(this.create(data, threw));
		});
		
		this.ipc.on(REF.DELETE_PROP, (resolve, target, prop) => {
			target = this.resolve(target);
			prop = this.read(prop);
			
			var data, threw;
			
			try{ data = Reflect.deleteProperty(target, prop)
			}catch(err){ data = err; threw = true }
			
			resolve(this.create(data, threw));
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