'use strict';

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