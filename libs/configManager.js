var fs=require("fs");
var path=require("path");

var SC=µ.shortcut({
	ef:"enshureFolder",
});
var proxy=µ.getModule("proxy");

var eventEmitter = new (require('events'))()
var methods=["on","once","addListener","removeListener","emit"];
proxy(eventEmitter,methods,exports);

var merge=function(config,target,asDefault)
{
	for(var c in config)
	{
		if(typeof config[c]==="object"&&typeof target[c]==="object")
			merge(config[c],target[c],asDefault);
		else if(!asDefault||target[c]==null)
			target[c]=config[c];
	}
};

exports.add=function(config,noSave)
{
	merge(config,exports);
	exports.resolvedDownloadDir=path.resolve(__dirname,"..",exports.downloadDir);
	noSave||exports.save();
	exports.emit("change");
};
exports.addDefault=function(config)
{
	merge(config,exports,true);
	exports.emit("change");
};

exports.save=function()
{
	var folderPath=path.join(__dirname,"..","temp");
	SC.ef(folderPath);
	var data=JSON.stringify(exports,null,"\t");
	fs.writeFileSync(path.join(folderPath,"config.json"),data);
};

exports.add(require("../config.json"),true);
try{exports.add(require("../temp/config.json"),true);}catch(e){console.log("could not load user config")}