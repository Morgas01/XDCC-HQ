(function(µ,SMOD,GMOD,HMOD,SC){

	require("../lib/NIWA-Downloads/Download");
	var XDCCdownload=require("../js/XDCCdownload");

	SC=SC({
    	es:"errorSerializer",
		Download:require.bind(null,"../lib/NIWA-Downloads/Download"),
		config:()=>require("./config").ready,
		File:"File",
		util:"File.util"
	})

	var manager=new (require("../lib/NIWA-Downloads/Manager"))({
		DBClassDictionary:[XDCCdownload],
		filter:function(running,download)
		{
			if(worker.appNamesDict["NIWA-irc"].length==0) return "no irc available";
			return download.filterSources(running.map(r=>r.dataSource));
		},
		download:function(signal,download)
		{
			SC.config.then(config=>
			{
				var downloadPath=config.get("download folder").get();
				if(!downloadPath)
				{
					download.state=SC.Download.states.DISABLED;
					download.addMessage("no download folder");
					signal.resolve();
					return;
				}
				return this.fetchParentPackages(download)
				.then(()=>
				{
					var folders=[];
					var parent=download;
					while(parent=parent.getParent("package"))
					{
						folders.push(parent.name);
					}
					folders.reverse();
					folders.unshift(downloadPath);
					var folder=new SC.File(folders.join("/"));
					return SC.util.enshureDir(folder).then(()=>folder)
				})
				.then(downloadFolder=>
				{
					//TODO select best source from activeSources
					download.dataSource=download.availableSources[0];
					//TODO rename bot to user
					download.dataSource.user=download.dataSource.bot;
					this.updateDownload(download);

					var delegate=(new SC.Download()).fromJSON(download.toJSON());
					delegate.filepath=downloadFolder.getAbsolutePath();
					delegate.filename=config.get("clean name").get()?download.getCleanName():download.name;
					delegate.dataSource.checkName=config.get("check name").get()?download.name:null;
					console.log(delegate.toJSON());
					this.delegateDownload(worker.appNamesDict["NIWA-irc"][0],delegate,function onUpdate(updated)
					{
						updated.sources=download.sources;
						download.fromJSON(updated);
						if(download.state===SC.Download.states.RUNNING) this.updateDownload(download);
						else signal.resolve();
					})
					.catch(function(e)
					{
						//TODO next source
						µ.logger.error({error:e},"failed");
						e=SC.es(e);
						download.addMessage("Error:\n"+JSON.stringify(e,null,"\t"));
						download.state=SC.Download.states.FAILED;
						signal.resolve();
					});
				});
			}).catch(signal.reject)
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

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);