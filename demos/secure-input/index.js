'use strict';

(async () => {
	var compiled = fetch('./load.jsc').then(res => res.arrayBuffer());
	
	await JSC.ready;
	
	var context = new JSC.Context();
	
	context.bytecode.execute(await compiled);
	
	customElements.define('secure-input', class extends HTMLElement {
		constructor(){
			super();
			
			context.secure_input.call(this);
		}
	});
	
	var element = document.createElement('secure-input');
	
	document.body.appendChild(element);
	
	element.placeholder = 'This is a secure input, all input will be replaced with * once unfocused.';
})();