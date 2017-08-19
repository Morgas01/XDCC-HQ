(function(µ,SMOD,GMOD,HMOD,SC){

	var Manager=GMOD("NIWA-Download.Manager");
	var XDCCdownload=require("../js/XDCCdownload");
	var extractCRC=/.*[\[\(]([0-9a-fA-F]{8})[\)\]]/;

	SC=SC({
    	es:"errorSerializer",
		Download:"NIWA-Download.Download",
		config:()=>require("./config"),
		File:"File",
		util:"File.util",
		adopt:"adopt"
	})

	var manager=new Manager({
		DBClassDictionary:[XDCCdownload],
		filter:function(running,download)
		{
			if(worker.appNamesDict["NIWA-irc"].length==0) return "no irc available";
			return download.filterSources(running.map(r=>r.dataSource));
		},
		download:function(signal,download)
		{
			µ.logger.info("start to download "+download.name);
			SC.config.ready.then(config=>
			{
				var downloadPath=config.get(["download","download folder"]).get();
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
					this.updateDownload(download);

					var delegate=(new SC.Download()).fromJSON(download.toJSON());
					delegate.dataSource=SC.adopt({},download.dataSource,true); //copy
					if(!delegate.filepath)delegate.filepath=downloadFolder.getAbsolutePath();
					if(!delegate.filename)delegate.filename=config.get(["download","clean name"]).get()?download.getCleanName():download.name;
					if(download.checkName!=null) delegate.dataSource.checkName=download.checkName;
					else if (config.get(["download","check name"]).get()) delegate.dataSource.checkName=download.name;
					µ.logger.info({dataSource:delegate.dataSource},"delegate to irc");
					download.addMessage("download "+delegate.dataSource.packnumber+":"+delegate.dataSource.user+"@"+delegate.dataSource.network);
					this.delegateDownload(worker.appNamesDict["NIWA-irc"][0],delegate,function onUpdate(updated)
					{
						updated.sources=download.sources;
						download.updateFromDelegate(updated);
						if(download.state===SC.Download.states.RUNNING) this.updateDownload(download);
						else
						{
							if (download.state===SC.Download.states.FAILED)
							{
								download.dataSource.failed=true;
								if(download.sources.find(s=>!s.failed)) download.state=SC.Download.states.PENDING; //
							}
							signal.resolve();
							if (download.state===SC.Download.states.DONE)
							{
								var fileCRC=download.filename.match(extractCRC);
								if(fileCRC)
								{
									download.addMessage("checking CRC ...");
									this.updateDownload(download);
									SC.util.calcCRC(download.filepath+'/'+download.filename)
									.then((crc)=>
									{
										if(crc==fileCRC[1].toUpperCase())
										{
											download.addMessage("CRC OK");
										}
										else
										{
											download.addMessage("wrong CRC: "+crc);
											download.state=SC.Download.states.FAILED;
										}
										this.dbConnector.then(dbc=>dbc.save(download));
										this.updateDownload(download);
									});
								}
								else if (config.get(["download","append CRC32"]).get())
								{
									download.addMessage("calculating CRC ...");
									this.updateDownload(download);
									var downloadFile=new SC.File(download.filepath).changePath(download.filename);
									SC.util.calcCRC(downloadFile)
									.then((crc)=>
									{
										let prom;
										if(download.appendCRC===false)
										{
											download.addMessage("CRC: "+crc);
											return;
										}
										var newFileName=downloadFile.getFileName()+` [${crc}]`+downloadFile.getExt();
										return downloadFile.rename(newFileName)
										.then(()=>
										{
											download.addMessage("appended CRC "+crc);
											download.filename=newFileName;
										},
										e=>
										{
											download.addMessage("could not append CRC "+crc);
											µ.logger.error({error:e},"could not append CRC "+crc);
										});
									})
									.then(()=>
									{
										this.dbConnector.then(dbc=>dbc.save(download));
										this.updateDownload(download);
									});
								}
							}
						}
					})
					.catch(function(e)
					{
						µ.logger.error({error:e},"failed");
						e=SC.es(e);
						download.addMessage("Error:\n"+JSON.stringify(e,null,"\t"));
						download.dataSource.failed=true;
						if(download.sources.find(s=>!s.failed)) download.state=SC.Download.states.PENDING;
						else download.state=SC.Download.states.FAILED;
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

	manager.serviceMethods.addListDownload=function(param)
	{
		if(param.method!=="POST") return "http method must be POST";

		let download=new XDCCdownload();
		download.name="xdcc listing from "+param.data.user;
		download.sources=[{
			network: param.data.network,
			user: param.data.user,
			packnumber: param.data.packnumber,
			channel: param.data.channel,
			subOffices: [param.data.subOffice],
		}];
		download.checkName=false;
		download.appendCRC=false;
		let targetFile=new SC.File(__dirname).changePath("../storage");
		download.filepath=targetFile.getAbsolutePath();
		download.filename=param.data.subOffice.slice(0,-3)+".txt";

		manager.add(download);
	}

	SC.config.ready.then(function(config)
	{
		manager.setMaxDownloads(config.get(["download","maximum Downloads"]).get());
		SC.config.addListener(["download","maximum Downloads"],function(newValue)
		{
			manager.setMaxDownloads(newValue);
		});
	}).catch(µ.logger.error);

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);