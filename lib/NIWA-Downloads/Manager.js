(function(µ,SMOD,GMOD,HMOD,SC){


	SC=SC({
		adopt:"adopt",
		Download:require.bind(null,"./Download"),
    	File:"File",
    	FileUtils:"File.util",
    	JsonConnector:"DB/jsonConnector",
    	ObjectConnector:"ObjectConnector",
    	es:"errorSerializer",
    	Promise:"Promise",
    	NodePatch:"NodePatch",
    	it:"iterate",
    	eq:"equals",
    	flatten:"flatten",
    	rescope:"rescope",
    	flatten:"flatten",
    	itAs:"iterateAsync",
    });

    var delegateID=0;
    var delegateMap=new Map();

    var delegateDownload=function(appName,download,onUpdate,manager)
    {
    	var delegateInfo={
    		appName:appName,
    		ID:delegateID++,
    		onUpdate:onUpdate,
    		manager:manager
    	};
    	delegateMap.set(delegateInfo.ID,delegateInfo);
    	var p=worker.ask(appName,"receiveDownload",{
    		ID:delegateInfo.ID,
    		download:download,
    		objectType:download.objectType
		});
    	p.catch(()=>delegateMap.delete(delegateInfo.ID));
    	return p;
    }
    worker.updateDelegatedDownload=function(update,appName)
	{
		var delegateInfo=delegateMap.get(update.remoteID);

		if(!delegateInfo) µ.logger.error("no delegate info");
		else if(delegateInfo.appName!=appName) µ.logger.error("wrong delegate app");
		else
		{
			update.ID=update.remoteID;
			delete update.remoteID;
			delete update.appName;
			delegateInfo.onUpdate.call(delegateInfo.manager,update);
			if(update.state!==SC.Download.states.RUNNING) delegateMap.delete(update.ID);
		}
	}

	var rotateErrorMapper=function(rotateError)
	{
		return {error:SC.es(rotateError.error),file:rotateError.file.getAbsolutePath()}
	};

	var MANAGER=module.exports=µ.Class({
		init:function(options)
		{
			SC.rescope.all(this,["isDownloadNotRunning","receiveDownload","_trigger","fetchSubPackages"]);
			options=SC.adopt({
				eventName:"downloads",
				DBClassDictionary:[],// standard Download and Package is always added
				storagePath:"storage/downloads.json", // set to false to disable persistance
				jsonConnectorParam:null,
				accept:null, // function(download,appName) to accept downloads from other apps; returns true or a Promise resolving to true to accept
				filter:null, // function(running[],download) to determinate if download is ready to download NOW; returns true or a Promise resolving to true to start download
				download:null, // function(signal,download) to actually download the file; resolve or reject the signal to conclude the download
				maxDownloads:0, // n<=0 no restriction
				autoTriggger:false // trigger downloads automatic
			},options);

			options.jsonConnectorParam=SC.adopt({
				fileRotation:10
			},options.jsonConnectorParam);

			this.eventName=options.eventName;
			this.DBClassDictionary=[SC.Download,SC.Download.Package].concat(options.DBClassDictionary)
			// array to map
			.reduce((d,c)=>(d[c.prototype.objectType]=c,d),{});

			this.runningDownloadMap=new Map();
			this.serviceMethods={};
			for (var key in SERVICEMETHODS)
			{
				this.serviceMethods[key]=SC.rescope(SERVICEMETHODS[key],this);
			}
			this.dbErrors=[];

			if(options.dbConnector)
			{
				if (SC.Promise.isThenable(options.dbConnector)) this.dbConnector=options.dbConnector
				else this.dbConnector=Promise.resolve(options.dbConnector);
			}
			if(!options.storagePath) this.dbConnector=Promise.resolve(new SC.ObjectConnector());
			else
			{
				var storageFile=new SC.File(options.storagePath);
				this.dbConnector=SC.FileUtils.enshureDir(storageFile.clone().changePath("..")).then(()=>
				{
					var dbErrors=this.dbErrors;
					return new SC.JsonConnector(storageFile,options.jsonConnectorParam).open
					.then(function(result)
					{
						if(result.others.length>0)
						{
							dbErrors=result.others.map(rotateErrorMapper);
							dbErrors.push({file:result.file.getAbsolutePath(),error:"loaded"});
							µ.logger.warn({errors:dbErrors},"errors loading file "+result.file.getAbsolutePath());
						}
						return this;
					},
					(errors)=>
					{
						if(errors.length==0)
						{
							errors.push({file:storageFile,error:"file not found"});
						}
						Array.prototype.push.apply(dbErrors,errors.map(rotateErrorMapper));
						dbErrors.push({file:null,error:"could not load any DB file"});
						µ.logger.warn({errors:dbErrors},"could not load any DB file");

						return this;
					});
				});
				this.dbConnector.catch((error)=>
				{
					this.dbErrors.push(SC.es(error));
					µ.logger.error({error:error},"error opening downloads DB");
				});
			}

			this.notify("init",null);

			if(options.download) this.download=options.download;
			if(options.filter) this.isDownloadReady=options.filter;

			if(options.accept)
			{
				this.accept=options.accept;
				worker.receiveDownload=this.receiveDownload;
			}

			this.setMaxDownloads(options.maxDownloads);
			this.setAutoTrigger(options.autoTriggger);
		},
		setAutoTrigger:function(trigger)
		{
			this.autoTriggger=!!trigger;
			this._trigger();
		},
		getAutoTrigger:function(){return this.autoTriggger},
		setMaxDownloads:function(maxDownloads)
		{
			this.maxDownloads=maxDownloads>0?maxDownloads:0;
			this._trigger();
		},
		getMaxDownloads:function(){return this.maxDownloads},
		notify:function(event,data)
		{
			this.dbConnector.then((dbc)=>
			{
				worker.event(this.eventName,dbc.db.getValues(),event,data);
			});
		},
		mapDictionary:function(dict)
		{
			var rtn=[];
			for(var type in dict)
			{
				var itemClass=this.DBClassDictionary[type];
				if(!itemClass) throw "unknown class: "+type;
				for(var item of dict[type])
				{
					rtn.push(new itemClass().fromJSON(item));
				}
			}
			return rtn;
		},
		loadDictionary:function(dict)
		{
			return this.dbConnector.then(dbc=>
				Promise.all(
					SC.it(dict,(type,ids)=>
						dbc.load(this.DBClassDictionary[type],{ID:ids})
					,true)
				)
			)
			.then(SC.flatten);
		},
    	add:function(downloads)
    	{
    		if(!Array.isArray(downloads)) downloads=[downloads];
    		return this.dbConnector.then(function(dbc)
			{
				return dbc.save(downloads);
			}).then(()=>
			{
				this.dbErrors.length=0;
				this.notify("add",downloads.map(d=>({objectType:d.objectType,fields:d.toJSON()})));
				this._trigger();
				return true;
			},
			(error)=>
			{
				error={error:SC.es(error),file:this.file.getAbsolutePath()};
				µ.logger.error(error,"failed to add downloads");
				this.dbErrors.push(error);
				return Promise.reject(error);
			});
    	},
    	addWithPackage:function(packageClass,packageName,downloads)
    	{
    		return this.createPackage(packageClass,packageName,downloads);
    	},
    	createPackage:function(packageClass,packageName,items,parent)
    	{
    		var package=new packageClass();
    		package.name=packageName;

    		if(parent) parent.addChild("subPackages",package);

    		return this.dbConnector.then(dbc=>dbc.save(package))
    		.then(()=>
    		{
    			this.notify("add",[{objectType:package.objectType,fields:package.toJSON()}]);
    			return this.moveTo(package,items);
    		});
    	},
    	moveTo:function(package,items)
    	{
    		return this.fetchParentPackages(package) //get parents until "root"
    		.then(()=> //generate parentUIDs
    		{
    			var parentUIDs=[];
    			var parent=package;
    			while(parent!=null)
    			{
    				parentUIDs.push(parent.objectType+","+parent.ID);
    				parent=parent.getParent("package");
    			}
    			return parentUIDs;
    		})
    		.then(parentUIDs=>items.filter(i=>parentUIDs.indexOf(i.objectType+","+i.ID)==-1)) // filter items that are parents of package
    		.then(items=>
    		{
				for(var item of items)
				{
					item.setParent("package",package||null);
					item.orderIndex=null;
				}
				return this.dbConnector.then(dbc=>dbc.save(items))
				.then(()=>
				{
					this.notify("move",prepareItems(items));
					this._trigger();
				});
			});
    	},
    	changeState:function(idDictionary,expectedState,newState)
    	{
    		var isPending=(newState===SC.Download.states.PENDING)
    		return this.dbConnector.then(dbc=>
    			Promise.all(Object.keys(idDictionary)
    				.map(type=>dbc.load(this.DBClassDictionary[type],{ID:idDictionary[type],state:expectedState}))
    			)
				.then(SC.flatten)
				.then(downloads=>
				{
					for(var download of downloads)
				 	{
				 		download.state=newState;
				 		if(isPending)download.clearMessages();
				 	}
					return dbc.save(downloads).then(()=>
					{
						this.notify("update",prepareItems(downloads));
						if(isPending) this._trigger();
					});
				})
    		);
    	},
    	delete:function(patternDictionary)
    	{
    		return this.dbConnector.then(dbc=>
    		{
				var filteredItems=Object.keys(patternDictionary)
				.map(type=>
				{
					// load items
					var dbClass=this.DBClassDictionary[type];
					var loading=dbc.load(dbClass,patternDictionary[type]);

					if(dbClass.prototype instanceof SC.Download||dbClass==SC.Download) //filter downloads
						loading=loading.then(downloads=>downloads.filter(this.isDownloadNotRunning));

					else if(dbClass.prototype instanceof SC.Download.Package||dbClass==SC.Download.Package) // filter & flatten packages
						loading=loading.then(packages=>this.fetchSubPackages(packages)
						.then(()=>packages.map(p=>
						{
							var toDelete=new Set();
							SC.NodePatch.traverse(p,package=>
							{
								var isRunning=false;
								for(var download of package.getChildren("children"))
								{
									if(!this.isDownloadNotRunning(download)) isRunning=true;
									else toDelete.add(download);
								}
								if(!isRunning) toDelete.add(package);
								else
								{
									var parent=package;
									while(parent=parent.getParent("package")) toDelete.delete(parent);
								}
							},parent=>parent.getChildren("subPackages"));
							return Array.from(toDelete);
						}))
						.then(SC.flatten)
					);
					return loading;
				});
				return Promise.all(filteredItems)
				.then(deletion=>Array.prototype.concat.apply(Array.prototype,deletion))//flatten
				.then(items=>prepareItems(items,true))
				.then(dict=>
				{
					var deletions=Object.keys(dict)
					.map(type=>dbc.delete(this.DBClassDictionary[type],dict[type])
						.then(result=>[type,result])
					);
					return Promise.all(deletions);
				})
				.then(results=>
				{
					var rtn={};
					for(var result of results)
					{
						rtn[result[0]]=result[1];
					}
					this.notify("delete",rtn);
					return rtn;
				});
			});
    	},
    	fetchSubPackages:function(packages)
    	{
    		if(!packages.length) return Promise.resolve();
    		return this.dbConnector.then(dbc=>
    			Promise.all(packages.map(p=>
    				Promise.all([
    					dbc.loadChildren(p,"children"),
    					dbc.loadChildren(p,"subPackages").then(this.fetchSubPackages)
					])
				))
			)
    	},
    	fetchParentPackages:function(package)
    	{
    		if(!package) return Promise.resolve();
    		return this.dbConnector.then(dbc=>dbc.loadParent(package,"package").then(p=>this.fetchParentPackages(p)));
    	},
    	updateDownload:function(download)
    	{
    		if(!download.startTime) download.startTime=Date.now();
    		download.time=Date.now();
    		var data=download.toUpdateJSON();
    		this.notify("update",{[download.objectType]:[data]});
    		if (download.appName)
    		{
    			worker.ask(download.appName,"updateDelegatedDownload",data)
    			.catch(e=>µ.logger.error({error:e},"updateDelegatedDownload failed"));
    		}
    	},
    	isDownloadReady:µ.constantFunctions.t,
    	isDownloadNotRunning:function(download)
    	{
    		for(var running of this.runningDownloadMap.keys())
    		{
    			if(running.objectType===download.objectType &&
    				running.ID===download.ID &&
					running.remoteID===download.remoteID
					) return false;
    		}
    		return true;
    	},
    	startDownload:function(download)
    	{
    		µ.logger.debug("startDownload",download.name);
    		if(!this.isDownloadNotRunning(download)) return Promise.reject("download already running");

    		return trueOrReject(this.isDownloadReady(Array.from(this.runningDownloadMap.keys()),download))
    		.then(()=>
    		{
				download.state=SC.Download.states.RUNNING;
				this.updateDownload(download);
				var runningInfo={promise:null};
				this.runningDownloadMap.set(download,runningInfo);
				runningInfo.promise=new SC.Promise(this.download,{args:[download],scope:this});
				runningInfo.promise.then(function()
				{
					if(download.state==SC.Download.states.RUNNING)
					{
						µ.logger.warn({download:download},"download was still in running state when finished");
						download.state=SC.Download.states.DISABLED;
					}
				},
				function(error)
				{
					µ.logger.error({error:error},"download failed");
					error=SC.es(error);
					download.addMessage("Error:\n"+JSON.stringify(error,null,"\t"));
					download.state=SC.Download.states.FAILED;
				})
				.then(()=>
				{
					this.runningDownloadMap.delete(download);
					this.dbConnector.then(dbc=>
					{
						var p;
						if(download.appName)p=dbc.delete(this.DBClassDictionary[download.objectType],[download]).catch(e=>µ.logger.error({error:e},"failed to delete completed download"));
						else p=dbc.save(download).catch(e=>µ.logger.error({error:e},"failed to save completed download"));
						this.updateDownload(download);
						p.then(this._trigger);
					});
				});
				return true;
    		});
    	},
    	receiveDownload:function(data,appName)
    	{
			data.appName=appName;
			data.download.remoteID=data.ID;
			data.download.appName=appName;
			delete data.download.ID;
			var downloadClass=this.DBClassDictionary[data.objectType];
			if(!downloadClass) return Promise.reject("unknown class: "+data.download.objectType);
			var download=new downloadClass();
			download.fromJSON(data.download);

			return trueOrReject(this.accept(download,appName))
			.then(()=>this.startDownload(download));
    	},
    	delegateDownload:function(appName,download,onUpdate)
    	{
    		return delegateDownload(appName,download,onUpdate,this);
    	},
    	_trigger:function()
    	{
    		µ.logger.debug("_trigger");
    		if(!this.autoTriggger) return Promise.resolve();
    		if(this.maxDownloads!=0&&this.runningDownloadMap.size>=this.maxDownloads) return Promise.resolve();
    		//TODO queue?
    		var dbClasses=Object.keys(this.DBClassDictionary).map(key=>this.DBClassDictionary[key])
    		var triggerPromise=this.dbConnector.then(dbc=>
    		{
    			//load all dbClasses in Pending
    			return Promise.all(dbClasses.map(dbClass=>dbc.load(dbClass,{packageID:SC.eq.unset()})))
				.then(SC.flatten) //flatten
				.then(data=>
				{
					var sortedData=data.sort(SC.Download.sortByOrderIndex);
					return SC.itAs(sortedData,function(index,item)
					{
						if(item instanceof SC.Download)
						{
							if(item.state===SC.Download.states.PENDING&&this.isDownloadNotRunning(item))
							{
								return SC.Promise.reverse(this.startDownload(item),item);
							}
							return "download not pending";
						}
						else
						{
							return Promise.all([
								dbc.loadChildren(item,"children"),
								dbc.loadChildren(item,"subPackages")
							]).then(function()
							{
								sortedData.splice(index+1,0,...item.getItems()); //insert sub items as next items
								return "loaded sub items";
							},
							function(error)
							{
								µ.logger.error({error:error},"error loading sub items");
								return error;
							});
						}
					},null,this).reverse("triggered download");
				});
    		});
    		triggerPromise.then(this._trigger,µ.logger.error);
    		return triggerPromise;
    	}
	});

    var checkRequest=function(param,expectedMethod)
    {
    	if(param.method!==expectedMethod)
    	{
    		param.status=405;
    		return Promise.reject(`only "${expectedMethod}" allowed`);
    	}
    	if (!param.data)
    	{
    		param.status=400;
    		return Promise.reject("no data was send");
    	}
    	return Promise.resolve(param.data);
    };
	var prepareItems=function(items,forDelete)
	{
		var rtn={};
		for(var item of items)
		{
			if(!rtn[item.objectType])rtn[item.objectType]=[];
			rtn[item.objectType].push(forDelete?item.ID:item);
		}
		return rtn;
	};
	var trueOrReject=function(value)
	{
		if (SC.Promise.isThenable(value))
		{
			return value.then(function(value)
			{
				if(value===true) return true;
				return Promise.reject(value);
			});
		}
		else if(value===true) return Promise.resolve(true);
		return Promise.reject(value);
	}

    // [this] is a Manager instance
	var SERVICEMETHODS={
		errors:function()
		{
			return this.dbErrors;
		},
		add:function(param)
		{
			return checkRequest(param,"POST")
			.then(data=>
			{
				var downloads=this.mapDictionary(data);
				return this.add(downloads);
			});
		},
		addWithPackage:function(param)
		{
			return checkRequest(param,"POST")
			.then(data=>
			{
				var packageClass=this.DBClassDictionary[data.packageClass||"Package"];
				if(!packageClass) throw "unknown package class: "+data.packageClass;
				var downloads=this.mapDictionary(data.downloads);

				return this.addWithPackage(packageClass,data.packageName,downloads);
			});
		},
		delete:function(param)
		{
			return checkRequest(param,"DELETE")
			.then(data=>
			{
				var patterns={};
				for(var type in data) patterns[type]={ID:data[type]};
				return this.delete(patterns);
			});
		},
		disable:function(param)
		{
			return checkRequest(param,"PUT")
			.then(data=>
			{
				return this.changeState(data,SC.Download.states.PENDING,SC.Download.states.DISABLED);
			});
		},
		enable:function(param)
		{
			return checkRequest(param,"PUT")
			.then(data=>
			{
				return this.changeState(data,SC.Download.states.DISABLED,SC.Download.states.PENDING);
			});
		},
		reset:function(param)
		{
			return checkRequest(param,"PUT")
			.then(data=>
			{
				return this.changeState(data,[SC.Download.states.DONE,SC.Download.states.FAILED],SC.Download.states.PENDING);
			});
		},
		createPackage:function(param)
		{
			return checkRequest(param,"POST")
			.then(data=>
			{
				var packageClass=this.DBClassDictionary[data.packageClass||"Package"];
				if(!packageClass) throw "unknown package class: "+data.packageClass;

				return this.loadDictionary(data.items)
				.then(items=>
				{
					var p;
					if(items.length==0) p=Promise.resolve();
					else p=this.dbConnector.then(dbc=>dbc.loadParent(items[0],"package"));
					return p.then(package=>this.createPackage(packageClass,data.name,items,package));
				});
			});
		},
		moveTo:function(param)
		{
			return checkRequest(param,"PUT")
			.then(data=>
			{
				if(!data.items||Object.keys(data.items).length==0) return Promise.reject("no items selected");
				return new SC.Promise([
					!data.target?null:this.loadDictionary(data.target).then(t=>t[0],function(e)
					{
						µ.logger.error(e);
						return null;
					}),
					this.loadDictionary(data.items)
				])
				.then((package,items)=>this.moveTo(package,items));
			});
		},
		sort:function(param)
		{
			return checkRequest(param,"POST")
			.then(data=>
			{
				var dbClasses=Object.keys(this.DBClassDictionary).map(key=>this.DBClassDictionary[key]);
				var loadPattern={packageID:data.packageID!=null?data.packageID:SC.eq.unset()};

				return this.dbConnector.then(dbc=>Promise.all(dbClasses.map(c=>dbc.load(c,loadPattern))))
				.then(downloads=>Array.prototype.concat.apply(Array.prototype,downloads))//flatten
				.then(function(items)
				{
					items.sort(SC.Download.sortByOrderIndex);
					var sortingItems=items.slice();
					var index=0;
					for (var sortItem of data.items)
					{
						for(var i=0;i<sortingItems.length;i++)
						{
							if(sortingItems[i].ID==sortItem.ID&&sortingItems[i].objectType===sortItem.objectType)
							{
								sortingItems[i].orderIndex=index++;
								sortingItems.splice(i,1);
								break;
							}
						}
					}
					for(var unsortedItem of sortingItems)
					{
						unsortedItem.orderIndex=index++;
					}
					return items;
				})
				.then(sortedItem=>
				{
					return this.dbConnector.then(dbc=>dbc.save(sortedItem))
					.then(()=>this.notify("sort",prepareItems(sortedItem)));
				});
			});
		},
		autoTrigger:function(param)
		{
			if(param.method==="GET") return this.autoTriggger;
			else if (param.method==="POST")
			{
				this.setAutoTrigger(param.data);
				return Promise.resolve();
			}
			else
			{
				param.status=405;
				return Promise.reject("only POST or GET method is allowed");
			}
		}
	};
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);