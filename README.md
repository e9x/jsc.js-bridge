## Explanation

This project allows the browser and embedded contexts to communicate and share objects.

[JSC.js](https://github.com/mbbill/JSC.js) provides a foundation for embedding JavaScriptCore in the browser using [Emscripten](https://emscripten.org/).

Inspired by [Electron's remote module](https://github.com/electron/remote) and [Embind](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/embind.html).

## Use cases

- Securing code in webpages (custom elements, websocket protocols, HTML generation, network requests, etc..)
- Skipping parse times for huge blocks of code via bytecode
- Simulating enviorments such as NodeJS with no fixed variables such as `window` and `location`
- Re-creating NodeJS's [VM](https://nodejs.org/api/vm.html) module

### Todo

- Update JavaScriptCore
- Store references as WeakRefs

## Usage

ℹ This project is in its early stages. If a feature is missing, open an issue or implement it yourself and create a pull request.

Embed the dist code on your website or host it locally

```html
<script src='https://e9x.github.io/jsc.js-bridge/dist/jsc.min.js'></script>
```

### Demos

[Compiler](./demos/compiler)

[Secure Input Element](./demos/secure-input)

### [API Docs](./API.md)

## Building

Original build instructions found at https://github.com/mbbill/JSC.js/blob/master/README.md

### Build the WASM

#### Using CMD on Windows

1. Install [Emscripten](https://emscripten.org/docs/getting_started/downloads.html#installation-instructions-using-the-emsdk-recommended) and setup em++ enviorment variables

2. Install [Ninja/CMake](https://cmake.org/download/)

3. Open a terminal

4. Clone the repo
```sh
git clone https://github.com/e9x/jsc.js-bridge.git
```

5. Enter the wasm builder
```sh
cd jsc.js-bridge/build-wasm
```

6. Run `prep_env.bat`
```sh
./prep_env.bat
```

7. Create the build target
```sh
gn gen out --args="target_os=\"wasm\""
```

8. Build with Ninja
```sh
ninja -C out
```

### Build the JS

1. Install [NodeJS 14<=](https://nodejs.org/en/)

2. Clone the repo or enter pre-existing folder
```
git clone https://github.com/e9x/jsc.js-bridge.git
```

3. Enter the JS builder directory
```sh
cd jsc.js-bridge/build-js
```

4. Install NPM modules
```sh
npm install
```

5. Run the builder
```sh
node ./index.js --once
```

JS output is found in the `dist/` folder
