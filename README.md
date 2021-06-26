# jsc.js-bridge
Bridge contexts made in JSC to the main JS context.

## Explanation:

[JSC.js](https://github.com/mbbill/JSC.js) provides a foundation for embedding JavaScriptCore in the browser using [Emscripten](https://emscripten.org/).

This project aims to modify JavaScriptCore to allow for IPC communication between the main page and the new context and provide a context bridge.

Inspired by [Electron's remote module](https://github.com/electron/remote) and [Embind](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/embind.html).

## Use cases:

- Securing features in webpages (custom elements, websocket protocols, HTML generation, network requests)
- Skipping parse times for huge blocks of code via bytecode
- Simulating enviorments such as NodeJS by having no `window` or `location` properties in the context

### Current progress:

- Bridging ✅

- Loading bytecode ✅

- Upgrading JavaScriptCore to the latest (for WeakRefs) 🚫

#### Garbage collection:

- Storing references as WeakRefs 🚫

## Usage:

Embed the demo code on your website or host it locally

```html
<script src='https://e9x.github.io/jsc.js-bridge/demo/jsc.js?6-26-2021'></script>
```

### window.JSC.evaluate(code, [...args]) ⇒ `Handle`

Returns the code executed in the parallel context as a handle or JSON.

| Param | Type | Description |
| --- | --- | --- |
| code | `String|Function` | A string or function containing code to be executed in the JSC context |
| ...args | `Any` | Arguments to call `code` with, this will be ignored if `code` is a string |


#### Example:

```
console.log(JSC.evaluate(`globalThis.toString()`)); // "[object GlobalObject]"

JSC.evaluate(function(exposed_arg){
  console.log(typeof fetch); // undefined
  console.log(typeof exposed_arg); // function
  
  exposed_arg('https://www.google.com').then(res => console.log(res.headers.get('content-type')));
}, fetch);
```
