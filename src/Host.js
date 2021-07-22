'use strict';

var Refs = require('./Refs'),
	{ Events, Router } = require('./Events'),
	{ EVAL } = require('./EventTypes');

class Host extends Events {
	constructor($){
		super();
		
		this.$ = $;
		
		this.ipc = new Router((event, ...data) => {
			return this.$.send(event, ...data);
		});
		
		this.refs = new Refs(this);
		
		this.refs.create(globalThis);
		this.refs.create(this);
		
		this.bridge = this.refs.handle(1);
		this.global = this.refs.handle(2);
		
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
	execute(x, ...args){
		if(typeof x == 'function'){
			let ret = this.refs.read(this.ipc.send(EVAL, '(' + x + ')'));
			
			// SyntaxError
			if(ret.thrown)throw this.native.error(ret.data);
			
			try{
				return ret.data(...args);
			}catch(err){
				console.log(err);
				throw this.native.error(err);
			}
		}else{
			let ret = this.refs.read(this.ipc.send(EVAL, x));
			
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
	debugger(){
		this.execute('debugger;');
	}
};

module.exports = Host;