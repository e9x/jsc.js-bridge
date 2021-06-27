'use strict';

var fs = require('fs'),
	path = require('path');

module.exports = function(data){
	/*var params = new URLSearchParams(this.resourceQuery),
		wasm = path.join(path.dirname(this.resourcePath), params.get('emcc')),
		read = fs.readFileSync(wasm, 'base64');
	
	if(!wasm)throw new Error('Specify wasm file');
	
	.replace(/wasmBinaryFile=.*?;/, () => `wasmBinaryFile=dataURIPrefix+"${read}";`);
	*/
	
	data = data
	.replace(/require/g, 'noop')
	.replace(/process/g, 'unde');
	
	return `var unde=undefined,noop=()=>{};module.exports=(Module={})=>{${data}\nreturn Module}`;
};