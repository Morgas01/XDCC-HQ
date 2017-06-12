require("../lib/NIWA-Downloads/Download");
var XDCCdownload=require("../js/XDCCdownload");

var manager=new (require("../lib/NIWA-Downloads/Manager"))({
	DBClassDictionary:[XDCCdownload],
	filter:function(running,download)
	{
		if(worker.appNamesDict["NIWA-irc"].length==0) return "no irc available";
		return download.filterSources(running.map(r=>r.dataSource));
	},
	download:function(signal,download)
	{
		//TODO select best source from activeSources
		download.dataSource=download.availableSources[0];
		//TODO rename bot to user
		download.dataSource.user=download.dataSource.bot;
		this.delegateDownload(signal,worker.appNamesDict["NIWA-irc"][0],delegate,function onUpdate(updated)
		{
			updated.sources=download.sources;
			download.fromJson(updated);
			if(download.state===XDCCdownload.states.RUNNING) this.updateDownload(download);
			else signal.resolve();
		})
		.catch(function(e)
		{
			//TODO next source
			signal.reject(e);
		});
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
}).catch(µ.logger.error);