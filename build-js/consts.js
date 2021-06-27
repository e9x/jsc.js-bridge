'use strict';

var path = require('path');

exports.src = path.join(__dirname, '..', 'src');
exports.dist = path.join(__dirname, '..', 'dist');
exports.entry = path.join(exports.src, 'Server.js');
exports.client_entry = path.join(exports.src, 'Client.js');
exports.wasm = path.join(__dirname, '..', 'build-wasm', 'out', 'jsc.wasm');