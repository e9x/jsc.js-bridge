'use strict';

var Refs = require('./Refs'),
	Events = require('./Events'),
	IPC = require('./IPC');

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
				var hex = this.$.compile_bytecode(src),
					arr = new Uint8Array(hex.length / 2);
				
				for(let index = 0; index < hex.length; index += 2){
					arr[index / 2] = parseInt(hex.substr(index, 2), 16);
				}
					
				return arr;
			},
			load: src => {
				if(Array.isArray(src))src = new Uint8Array(src);
				else if(src instanceof ArrayBuffer)src = new Uint8Array(src);
				else if(!(src instanceof Uint8Array))throw new TypeError('JSC.bytecode.load only accepts: ArrayBuffer, Uint8Array, Array');
				
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