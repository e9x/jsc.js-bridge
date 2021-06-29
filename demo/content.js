var main = () => {
	var base = new JSC.context.URL('https://e9x.github.io/jsc.js-bridge/?');
	
	JSC.context.fetch(base).then(res => res.text()).then(text => {
		var dom = new JSC.context.DOMParser().parseFromString(text, 'text/html');
		
		var tags = ['src', 'href'],
			url_props = ['port', 'hostname', 'protocol'];
		
		for(let tag of tags)for(let node of dom.querySelectorAll('[' + tag + ']')){
			var url = new JSC.context.URL(node[tag], base);
			
			for(let prop of url_props)url[prop] = base[prop];
			
			node[tag] = url;
		}
		
		dom.querySelector('.project-tagline').innerHTML = '<pre>This page was not loaded directly from the main JS context.\nExplore the context bridge using devtools.</pre>';
		
		dom.querySelector('.main-content').innerHTML = [
			`<h2>Demos:</h2>`,
			`<a href='./securing-code'><p>Loading bytecode and extending HTML elements</p></a>`,
		].join('\n');
		
		JSC.context.document.documentElement.innerHTML = dom.documentElement.innerHTML;
	});
};

console.log('window.JSC variable is explosed.', JSC);

JSC.ready.then(() => {
	console.log('JSC.js bridge is ready. New context\'s global is', JSC.context);
	console.log('Access context variables through JSC.context');
	
	JSC.eval(main);
});