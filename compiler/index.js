'use strict';

// Compile a function and display the bytecode

var utils = new DOMUtils(),
	{ input, files, load_js } = utils.tree({
		input: '.input',
		files: '.files',
		load_js: 'script[type="load.js"]',
	}),
	file_data = Symbol();

input.value = document.querySelector('script[type="example"]').textContent;

function download_file(){
	var a = utils.add_ele('a', document.documentElement, {
		href: URL.createObjectURL(new Blob([ this[file_data] ])),
		download: this.textContent,
	});
	
	a.click();
	
	a.remove();
}

var show_files = data => {
	files.innerHTML = '';
	
	for(let file in data)utils.add_ele('button', files, {
		textContent: file,
		events: {
			click: download_file,
		},
		[file_data]: data[file],
	});
};

var context;

var compile_code = () => show_files({
	'load.html': `<!doctype html>
<html>
	<head>
		<meta charset='utf-8'>
	</head>
	<body>
		<script src='https://e9x.github.io/jsc.js-bridge/dist/jsc.min.js'></script>
		<script src='./load.js'></script>
	</body>
</html>`,
	'load.js': load_js.textContent,
	'load.jsc': context.bytecode.compile(input.value),
});

JSC.ready.then(() => {
	console.log('JSC loaded.');
	
	context = new JSC.Context();
	
	compile_code();
	
	document.querySelector('.compile').addEventListener('click', compile_code, { passive: true });
});