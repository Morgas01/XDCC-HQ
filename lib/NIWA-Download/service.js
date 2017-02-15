(function(µ,SMOD,GMOD,HMOD,SC){

	var SC=µ.shortcut({
		adopt:"adopt",
		Download:require.bind(null,"./Download"),
    	File:"File",
    	FileUtils:"File.util",
    	JsonConnector:"DB/jsonConnector",
    	es:"errorSerializer",
    	Promise:"Promise",
    	NodePatch:"NodePatch",
    	it:"iterate",
    	eq:"equals",
    	deletableStates:function()
    	{
    		var rtn=[];
    		for (var key in SC.Download.states)
    		{
    			if(key==="RUNNING") continue;
    			rtn.push(SC.Download.states[key]);
    		}
    		return rtn;
    	}
    });

    module.exports=function(options)
    {
    	options=SC.adopt({
    		storagePath:"storage/downloads.json",
    		DBClassDictionary:[],// standard Download and Package is always added
    		eventName:"downloads",
    		jsonConnectorParam:null,
    	},options);
    	options.jsonConnectorParam=SC.adopt({
    		fileRotation:10
    	},options.jsonConnectorParam);

		options.DBClassDictionary.unshift(SC.Download,SC.Download.Package);
		options.DBClassDictionary=options.DBClassDictionary.reduce((d,c)=>(d[c.prototype.objectType]=c,d),{});

		var dbErrors=[];
		var storageFile=new SC.File(options.storagePath);
		var dbConnector=SC.FileUtils.enshureDir(storageFile.clone().changePath("..")).then(function()
		{
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
			function(errors)
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
		dbConnector.catch(function(error)
		{
			dbErrors.push(SC.es(error));
			µ.logger.error({error:error},"error opening downloads DB");
		});

		var notify=function(event,data)
		{
			dbConnector.then(function(dbc)
			{
				worker.event(options.eventName,dbc.db.getValues(),event,data);
			});
		};
		notify("init",null);


		var mapDictionary=function(dict)
		{
			var rtn=[];
			for(var type in dict)
			{
				var itemClass=options.DBClassDictionary[type];
				if(!itemClass) throw "unknown class: "+type;
				for(var item of dict[type])
				{
					rtn.push(new itemClass().fromJSON(item));
				}
			}
			return rtn;
		}
		var loadDictionary=function(dict)
		{
			return dbConnector.then(dbc=>Promise.all(SC.it(dict,function(type,ids)
			{
				return dbc.load(options.DBClassDictionary[type],{ID:ids});
			},true)))
			.then(items=>Array.prototype.concat.apply(Array.prototype,items))//flatten
		}

    	var methods={
    		errors:()=>dbErrors,
    		add:function(param)
    		{
    			return checkRequest(param,"POST")
    			.then(function(data)
    			{
    				var downloads=mapDictionary(data);
    				return service.add(downloads);
    			});
    		},
    		addWithPackage:function(param)
    		{
    			return checkRequest(param,"POST")
    			.then(function(data)
    			{
    				var packageClass=options.DBClassDictionary[data.packageClass||"Package"];
    				if(!packageClass) throw "unknown package class: "+data.packageClass;
    				var downloads=mapDictionary(data.downloads);

    				return service.addWithPackage(packageClass,data.packageName,downloads);
    			});
    		},
    		delete:function(param)
    		{
    			return checkRequest(param,"DELETE")
    			.then(function(data)
    			{
    				var patterns={};
    				for(var type in data) patterns[type]={ID:data[type]};
    				return service.delete(patterns);
    			});
    		},
    		disable:function(param)
    		{
    			return checkRequest(param,"PUT")
    			.then(function(data)
    			{
    				return service.changeState(data,SC.Download.states.PENDING,SC.Download.states.DISABLED);
    			});
    		},
    		enable:function(param)
    		{
    			return checkRequest(param,"PUT")
    			.then(function(data)
    			{
    				return service.changeState(data,SC.Download.states.DISABLED,SC.Download.states.PENDING);
    			});
    		},
    		reset:function(param)
    		{
    			return checkRequest(param,"PUT")
    			.then(function(data)
    			{
    				return service.changeState(data,[SC.Download.states.DONE,SC.Download.states.FAILED],SC.Download.states.PENDING);
    			});
    		},
    		createPackage:function(param)
    		{
    			return checkRequest(param,"POST")
    			.then(function(data)
    			{
    				var packageClass=options.DBClassDictionary[data.packageClass||"Package"];
					if(!packageClass) throw "unknown package class: "+data.packageClass;

					return loadDictionary(data.items)
					.then(function(items)
					{
						var p;
						if(items.length==0) p=Promise.resolve();
						else p=dbConnector.then(dbc=>dbc.loadParent(items[0],"package"));
						return p.then(package=>service.createPackage(packageClass,data.name,items,package));
					});
    			});
    		},
    		moveTo:function(param)
    		{
    			return checkRequest(param,"PUT")
    			.then(function(data)
    			{
    				if(!data.items||Object.keys(data.items).length==0) return Promise.reject("no items selected");
					return new SC.Promise([
						!data.target?null:loadDictionary(data.target).then(t=>t[0],function(e)
						{
							µ.logger.error(e);
							return null;
						}),
						loadDictionary(data.items)
					])
					.then(service.moveTo);
    			});
    		},
    		sort:function(param)
    		{
    			return checkRequest(param,"POST")
    			.then(function(data)
    			{
    				var dbClasses=Object.keys(options.DBClassDictionary).map(key=>options.DBClassDictionary[key]);
    				var loadPattern={packageID:data.packageID!=null?data.packageID:SC.eq.unset()};

    				return dbConnector.then(dbc=>Promise.all(dbClasses.map(c=>dbc.load(c,loadPattern))))
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
					.then(function(sortedItem)
					{
						return dbConnector.then(dbc=>dbc.save(sortedItem))
						.then(()=>notify("sort",prepareItems(sortedItem)));
					});
    			});
    		}
    	}

    	var service=function service(param,method)
    	{
    		if(!method in methods){
    			param.status=404;
    			return "no such action: "+method;
    		}
    		else
    		{
    			var args=Array.from(arguments);
    			args.splice(1,1);
    			return methods[method](param);
    		}
    	};
    	service.add=function(downloads)
    	{
    		return dbConnector.then(function(dbc)
			{
				return dbc.save(downloads);
			}).then(function(){
				dbErrors.length=0;
				notify("add",downloads.map(d=>({objectType:d.objectType,fields:d.toJSON()})));
				return true;
			},
			function(error)
			{
				error={error:SC.es(error),file:this.file.getAbsolutePath()};
				µ.logger.error(error,"failed to add downloads");
				dbErrors.push(error);
				return Promise.reject(error);
			});
    	};
    	service.addWithPackage=function(packageClass,packageName,downloads)
    	{
    		return service.createPackage(packageClass,packageName,downloads);
    	};
    	service.createPackage=function(packageClass,packageName,items,parent)
    	{
    		var package=new packageClass();
    		package.name=packageName;

    		if(parent) parent.addChild("subPackages",package);

    		return dbConnector.then(dbc=>dbc.save(package))
    		.then(function()
    		{
    			notify("add",[{objectType:package.objectType,fields:package.toJSON()}]);
    			return service.moveTo(package,items);
    		});
    	};
    	service.moveTo=function(package,items)
    	{
    		return service.fetchParentPackages(package) //get parents until "root"
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
				return dbConnector.then(dbc=>dbc.save(items))
				.then(()=>notify("move",prepareItems(items)));
			});
    	},
    	service.changeState=function(idDictionary,expectedState,newState)
    	{
    		return dbConnector.then(dbc=>
    			Promise.all(Object.keys(idDictionary)
    				.map(type=>dbc.load(options.DBClassDictionary[type],{ID:idDictionary[type],state:expectedState}))
    			)
				.then(downloads=>Array.prototype.concat.apply(Array.prototype,downloads))//flatten
				.then(function(downloads)
				{
					for(var download of downloads) download.state=newState;
					return dbc.save(downloads).then(()=>notify("update",prepareItems(downloads)));
				})
    		);
    	};
    	var runningDownloadsFilter=d=>d.state!=SC.Download.states.RUNNING;
    	service.delete=function(patternDictionary)
    	{
    		return dbConnector.then(dbc=>
    		{
				var filteredItems=Object.keys(patternDictionary)
				.map(type=>
				{
					// load items
					var dbClass=options.DBClassDictionary[type];
					var loading=dbc.load(dbClass,patternDictionary[type]);

					if(dbClass.prototype instanceof SC.Download||dbClass==SC.Download) //filter downloads
						loading=loading.then(downloads=>downloads.filter(runningDownloadsFilter));

					else if(dbClass.prototype instanceof SC.Download.Package||dbClass==SC.Download.Package) // filter & flatten packages
						loading=loading.then(packages=>service.fetchSubPackages(packages)
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
						.then(deletion=>Array.prototype.concat.apply(Array.prototype,deletion))//flatten
					);
					return loading;
				});
				return Promise.all(filteredItems)
				.then(deletion=>Array.prototype.concat.apply(Array.prototype,deletion))//flatten
				.then(items=>prepareItems(items,true))
				.then(dict=>
				{
					var deletions=Object.keys(dict)
					.map(type=>dbc.delete(options.DBClassDictionary[type],dict[type])
						.then(result=>[type,result])
					);
					return Promise.all(deletions);
				})
				.then(function(results)
				{
					var rtn={};
					for(var result of results)
					{
						rtn[result[0]]=result[1];
					}
					notify("delete",rtn);
					return rtn;
				});
			});
    	};
    	service.fetchSubPackages=function(packages)
    	{
    		if(!packages.length) return Promise.resolve();
    		return dbConnector.then(dbc=>
    			Promise.all(packages.map(p=>
    				Promise.all([
    					dbc.loadChildren(p,"children"),
    					dbc.loadChildren(p,"subPackages").then(service.fetchSubPackages)
					])
				))
			)
    	}
    	service.fetchParentPackages=function(package)
    	{
    		if(!package) return Promise.resolve();
    		return dbConnector.then(dbc=>dbc.loadParent(package,"package").then(service.fetchParentPackages));
    	};
    	service.getDBConnector=dbConnector;
    	return service;
    };

	var rotateErrorMapper=function(rotateError)
	{
		return {
			error:SC.es(rotateError.error),
			file:rotateError.file.getAbsolutePath()
		};
	};
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

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);