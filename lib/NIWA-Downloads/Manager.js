(function(µ,SMOD,GMOD,HMOD,SC){


	SC=SC({
		adopt:"adopt",
		Download:require.bind(null,"./Download"),
    	File:"File",
    	FileUtils:"File.util",
    	JsonConnector:"DB/jsonConnector",
    	ObjectConnector:"DB/ObjectConnector",
    	es:"errorSerializer",
    	Promise:"Promise",
    	NodePatch:"NodePatch",
    	it:"iterate",
    	eq:"equals",
    	flatten:"flatten",
    	rescope:"rescope"
    });

	var MANAGER=module.exports=µ.Class({
		init:function(options)
		{
			options=SC.adopt({
				eventName:"downloads",
				DBClassDictionary:[],// standard Download and Package is always added
				storagePath:"storage/downloads.json", // set to false to disable persistance
				jsonConnectorParam:null,
			},options);

			options.jsonConnectorParam=SC.adopt({
				fileRotation:10
			},options.jsonConnectorParam);

			this.eventName=options.eventName;
			this.DBClassDictionary=[SC.Download,SC.Download.Package].concat(options.DBClassDictionary)
			// array to map
			.reduce((d,c)=>(d[c.prototype.objectType]=c,d),{});

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
					return new SC.JsonConnector(storageFile,options.jsonConnectorParam).open
					.then(function(result)
					{
						if(result.others.length>0)
						{
							this.dbErrors=result.others.map(rotateErrorMapper);
							this.dbErrors.push({file:result.file.getAbsolutePath(),error:"loaded"});
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
						this.dbErrors.push({file:null,error:"could not load any DB file"});
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
		},
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
    		return this.dbConnector.then(function(dbc)
			{
				return dbc.save(downloads);
			}).then(()=>
			{
				this.dbErrors.length=0;
				this.notify("add",downloads.map(d=>({objectType:d.objectType,fields:d.toJSON()})));
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
				.then(()=>this.notify("move",prepareItems(items)));
			});
    	},
    	changeState:function(idDictionary,expectedState,newState)
    	{
    		return this.dbConnector.then(dbc=>
    			Promise.all(Object.keys(idDictionary)
    				.map(type=>dbc.load(this.DBClassDictionary[type],{ID:idDictionary[type],state:expectedState}))
    			)
				.then(SC.flatten)
				.then(downloads=>
				{
					for(var download of downloads) download.state=newState;
					return dbc.save(downloads).then(()=>this.notify("update",prepareItems(downloads)));
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
						loading=loading.then(downloads=>downloads.filter(runningDownloadsFilter));

					else if(dbClass.prototype instanceof SC.Download.Package||dbClass==SC.Download.Package) // filter & flatten packages
						loading=loading.then(packages=>this.fetchSubPackages(packages)
						.then(()=>packages.map(p=>
						{
							var toDelete=new Set();
							SC.NodePatch.traverse(p,function(package)
							{
								var isRunning=false;
								for(var download of package.getChildren("children"))
								{
									if(!runningDownloadsFilter(download)) isRunning=true;
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
    	}
	});

    var runningDownloadsFilter=d=>d.state!=SC.Download.states.RUNNING;
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
		}
	};
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);