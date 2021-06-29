'use strict';

// Compile a function and display the bytecode

var textarea = document.querySelector('.output'),
	code = () => {
		console.log('hi');
		
		class secure_class extends JSC.context.HTMLElement {
			connectedCallback(){
				var options = new JSC.context.Object();
				options.mode = 'closed';
				
				var shadow = this.attachShadow(options);
				
				console.log(shadow);
			}
		};
		
		try{
			JSC.context.customElements.define('secure-input', secure_class, new JSC.context.Object());
			
			console.log('ok');
		}catch(err){
			console.error(err);
		}
	};


JSC.ready.then(() => {
	var compiled = JSC.bytecode.compile(code);
	
	JSC.bytecode.load(compiled);
	
	var element = document.createElement('secure-input');
	
	document.body.appendChild(element);
	
	textarea.value = [
		`var COMPILED_CODE = "${compiled}";`,
		``,
		`JSC.ready.then(() => {`,
		`\tJSC.bytecode.load(COMPILED_CODE);`,
		`});`,
	].join('\n');
});