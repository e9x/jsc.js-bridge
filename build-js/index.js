'use strict';

var fs = require('fs'),
	path = require('path'),
	consts = require('./consts.js'),
	wp_mode = consts.production ? 'production' : 'development',
	webpack = require('webpack'),
	ModifyPlugin = require('./ModifyPlugin'),
	TerserPlugin = require('terser-webpack-plugin'),
	errors = (err, stats = { compilation: { errors: [] } }) => {
		var error = !!(err || stats.compilation.errors.length);
		
		for(var ind = 0; ind < stats.compilation.errors.length; ind++)error = true, console.error(stats.compilation.errors[ind]);
		
		if(err)console.error(err);
		
		return error;
	},
	suffix = 'typeof module=="object"?(module.exports=JSC):globalThis.JSC=JSC;';

var compiler = webpack({
	entry: {
		'jsc': consts.entry,
		'jsc.min': consts.entry,
		'jsc.client': consts.client_entry,
		'jsc.client.min': consts.client_entry,
	},
	output: {
		library: {
			name: 'JSC',
			type: 'var',
		},
		path: consts.dist,
		filename: '[name].js',
	},
	context: consts.src,
	devtool: false,
	mode: wp_mode,
	module: {
		rules: [
			{
				resourceQuery: /\?emcc/,
				loader: path.join(__dirname, 'emc-loader.js'),
			},
		],
	},
	plugins: [
		new ModifyPlugin({
			file: 'jsc.min.js',
			replace: {
				client_file: '"jsc.client.min.js"',
			},
			suffix,
		}),
		new ModifyPlugin({
			file: 'jsc.js',
			replace: {
				client_file: '"jsc.client.js"',
			},
			suffix,
		}),
		new ModifyPlugin({
			file: 'jsc.client.js',
			suffix,
		}),
		new ModifyPlugin({
			file: 'jsc.client.js',
			suffix,
		}),
		
		new TerserPlugin({
			include: /\.min\.js$/,
			terserOptions: {
				mangle: {
					eval: true, 
				},
				format: {
					quote_style: 1,
				},
			},
		}),
	],
}, (err, stats) => {
	if(errors(err, stats))return console.error('JSC compiler failure');
	
	var callback = async (err, stats) => {
		if(errors(err, stats))return console.error('JSC build failure');
		else{
			await fs.promises.copyFile(consts.wasm, path.join(compiler.options.output.path, 'jsc.wasm'));
			console.log('JSC build success');
		}
	};
	
	if(process.argv.includes('-once'))compiler.run(callback);
	else compiler.watch({}, callback);
});