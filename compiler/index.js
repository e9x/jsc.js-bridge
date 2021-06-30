'use strict';

// Compile a function and display the bytecode

var input = document.querySelector('.input'),
	output = document.querySelector('.output');

input.value = document.querySelector('script[type="example"]').textContent;

var compile_code = () => {
	var compiled = JSC.bytecode.compile(input.value);
	
	JSC.bytecode.load(compiled);
	
	output.value = [
		`var COMPILED_CODE = "${compiled}";`,
		``,
		`JSC.ready.then(() => {`,
		`\tJSC.bytecode.load(COMPILED_CODE);`,
		`});`,
	].join('\n');
};

JSC.ready.then(() => {
	compile_code();
	
	input.addEventListener('change', compile_code, { passive: true });
});