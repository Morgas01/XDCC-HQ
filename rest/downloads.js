require("../lib/NIWA-Downloads/Download");
var XDCCdownload=require("../js/XDCCdownload");

var manager=new (require("../lib/NIWA-Downloads/Manager"))({
	DBClassDictionary:[XDCCdownload],
	filter:function(running,download)
	{
		//TODO
		return download.filterSources(running);
	},
	download:function(signal,download)
	{
		var delegate=download;
		//TODO select best source from activeSources
		this.delegateDownload(signal,worker.appNamesDict["NIWA-irc"][0],delegate);
	}
});

module.exports=manager.serviceMethods;

manager.serviceMethods.deleteByState=function(param)
{
	if(param.method!=="DELETE") return "http method must be DELETE";
	if(param.data in XDCCdownload.states) return manager.delete({XDCCdownload:{state:XDCCdownload.states[param.data]}});
	else return "unknown state: "+param.data;
};

require("./config").ready.then(function(config)
{
	manager.setMaxDownloads(config.get(["maximum Downloads"]).get());
});