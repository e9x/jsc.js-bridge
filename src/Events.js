'use strict';

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