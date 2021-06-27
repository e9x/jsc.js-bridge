'use strict';

var webpack = require('webpack');

class ModifyPlugin {
	constructor(data = {}){
		this.data = data;
	}
	to_regex(string, flags){
		return new RegExp(string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), flags);
	}
	apply(compiler){
		compiler.hooks.thisCompilation.tap('Replace', compilation => {
			compilation.hooks.processAssets.tap({
				name: 'Replace',
				stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
			}, () => {
				var asset = compilation.getAsset(this.data.file),
					source = (this.data.prefix || '') + asset.source.source() + (this.data.suffix || '');
				
				for(let data in (this.data.replace || {}))source = source.replace(this.to_regex(data, 'g'), this.data.replace[data]);
				
				compilation.updateAsset(asset.name, new webpack.sources.RawSource(source));
			});
		});
	}
};

module.exports = ModifyPlugin;