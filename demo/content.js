var main = () => {
	var base = new JSC.global.URL('https://e9x.github.io/jsc.js-bridge/?');
	
	JSC.global.fetch(base).then(res => res.text()).then(text => {
		var dom = new JSC.global.DOMParser().parseFromString(text, 'text/html');
		
		var tags = ['src', 'href'],
			url_props = ['port', 'hostname', 'protocol'];
		
		for(let tag of tags)for(let node of dom.querySelectorAll('[' + tag + ']')){
			var url = new JSC.global.URL(node[tag], base);
			
			for(let prop of url_props)url[prop] = base[prop];
			
			node[tag] = url;
		}
		
		dom.querySelector('.project-tagline').innerHTML = '<pre>This page was not loaded directly from the main JS context.\nExplore the context bridge using devtools.</pre>';
		
		JSC.global.document.documentElement.innerHTML = dom.documentElement.innerHTML;
	});
};

console.log('window.JSC variable is explosed.', JSC);

JSC.ready.then(() => {
	console.log('JSC.js bridge is ready. New context\'s global is', JSC.global);
	JSC.evaluate(main);
});