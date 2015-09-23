var fs=require("fs");
var path=require("path");

var SC=µ.shortcut({
	ef:"enshureFolder",
});
var proxy=µ.getModule("proxy");

var eventEmitter = new (require('events'))()
var methods=["on","once","addListener","removeListener","emit"];
proxy(eventEmitter,methods,exports);

exports.add=function(config,noSave)
{
	for(var c in config) exports[c]=config[c];
	exports.resolvedDownloadDir=path.resolve(exports.downloadDir);
	noSave||exports.save();
	exports.emit("change");
}

exports.save=function()
{
	var folderPath=path.join(__dirname,"..","temp");
	SC.ef(folderPath);
	var data=JSON.stringify(exports,null,"\t");
	fs.writeFileSync(path.join(folderPath,"config.json"),data);
};

exports.add(require("../config.json"),true);
try{exports.add(require("../temp/config.json"),true);}catch(e){console.log("could not load user config")}