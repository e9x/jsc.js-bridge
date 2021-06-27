## Explanation:

[JSC.js](https://github.com/mbbill/JSC.js) provides a foundation for embedding JavaScriptCore in the browser using [Emscripten](https://emscripten.org/).

This project aims to modify JavaScriptCore to allow for IPC communication between the main page and the new context and provide a context bridge.

Inspired by [Electron's remote module](https://github.com/electron/remote) and [Embind](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/embind.html).

## Use cases:

- Securing code in webpages (custom elements, websocket protocols, HTML generation, network requests, etc..)
- Skipping parse times for huge blocks of code via bytecode
- Simulating enviorments such as NodeJS by having no `window` or `location` properties in the context

### Current progress:

- Bridging ✅

- Loading bytecode ✅

- Upgrading JavaScriptCore to the latest (for WeakRefs) 🚫

#### Garbage collection:

- Storing references as WeakRefs 🚫

## Usage:

ℹ This project is in its early stages. If a feature is missing, open an issue or implement it yourself and create a pull request.

Embed the demo code on your website or host it locally

```html
<script src='https://e9x.github.io/jsc.js-bridge/dist/jsc.min.js?6.27.2021'></script>
```

### window.JSC.evaluate(code, [...args]) ⇒ `Handle`

Returns the code executed in the parallel context as a handle or JSON.

| Param | Type | Description |
| --- | --- | --- |
| code | `String|Function` | A string or function containing code to be executed in the JSC context |
| ...args | `Any` | Arguments to call `code` with, this will be ignored if `code` is a string |


#### Example:

```js
console.log(JSC.evaluate(`globalThis.toString()`)); // "[object GlobalObject]"

JSC.evaluate(function(exposed_arg){
  console.log(typeof fetch); // undefined
  console.log(typeof exposed_arg); // function
  
  exposed_arg('https://www.google.com').then(res => console.log(res.headers.get('content-type')));
}, fetch);
```

### window.JSC.global

A handle referencing the context's `globalThis`.

#### Example:

```js
// Enter the JSC context
JSC.evaluate(() => {
	// Create an instance of the parent context's headers because they are not present in this context.
	var headers = new JSC.global.Headers();
	
	// Create a native object for calling the native function fetch.
	var options = new JSC.global.Object();
	
	options.method = 'POST';
	options.body = JSON.stringify({
		'sent-from': 'jsc',
	});
	
	options.headers = headers;
	headers.set('content-type', 'application/json');
	
	// Call the parent context's native fetch function using our native object.
	JSC.global.fetch('https://api.sys32.dev/v2/test', options).then(res => {
		console.log('Recieved response code:', res.status);
		// [SUB] Recieved response code: 404
	});
});
```

## Building:

Original build instructions found at https://github.com/mbbill/JSC.js/blob/master/README.md

### Build the WASM:

1. Install [Emscripten](https://emscripten.org/docs/getting_started/downloads.html#installation-instructions-using-the-emsdk-recommended) and setup em++ enviorment variables

2. Install [Ninja/CMake](https://cmake.org/download/)

3. Open a terminal

4. Clone the repo:
```sh
git clone https://github.com/e9x/jsc.js-bridge.git
```

5. Enter the wasm builder:
```sh
cd jsc.js-bridge/build-wasm
```

6. Run `prep_env.bat`:
```sh
./prep_env.bat
```

7. Create the build target:
```sh
gn gen out --args="target_os=\"wasm\""
```

8. Build with Ninja:
```sh
ninja -C out
```

### Build the JS:

1. Install [NodeJS 14<=](https://nodejs.org/en/)

2. Clone the repo or enter pre-existing folder:
```
git clone https://github.com/e9x/jsc.js-bridge.git
```

3. Enter the JS builder directory:
```sh
cd jsc.js-bridge/build-wasm
```

4. Install NPM modules:
```sh
npm install
```

5. Run the builder:
```sh
node ./index.js --once
```

JS output is found in the `dist/` folder