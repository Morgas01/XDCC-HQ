(function(µ,SMOD,GMOD,HMOD,SC){

	var SC=µ.shortcut({
		adopt:"adopt",
		Download:require.bind(null,"./Download"),
    	File:"File",
    	FileUtils:"File.util",
    	JsonConnector:"DB/jsonConnector",
    	es:"errorSerializer",
    	Promise:"Promise",
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
    		DBClassDictionary:{},// standard Download and Package is always added
    		eventName:"downloads",
    		jsonConnectorParam:null,
    	},options);
    	options.jsonConnectorParam=SC.adopt({
    		fileRotation:10
    	},options.jsonConnectorParam);

    	options.DBClassDictionary.Download=options.DBClassDictionary.Download||SC.Download;
    	options.DBClassDictionary.Package=options.DBClassDictionary.Package||SC.Download.Package;


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

    	var methods={
    		errors:()=>dbErrors,
    		add:function(param)
    		{
    			return checkRequest(param,"POST")
    			.then(function(data)
    			{
    				var downloads=[];
    				for(var type in data)
    				{
    					downloads.push.apply(downloads,data[type].map(d=>new options.DBClassDictionary[type]().fromJSON(d)));
    				}
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
    			});
    		},
    		delete:function(param)
    		{
    			return checkRequest(param,"DELETE")
    			.then(function(data)
    			{
    				var patterns={};
    				for(var type in data) patterns[type]={ID:data[type],state:SC.deletableStates};
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
    		createPacakge:function(param)
    		{
    			return checkRequest(param,"POST")
    			.then(function(data)
    			{
					//TODO
    			});
    		},
    		moveTo:function(param)
    		{
    			return checkRequest(param,"PUT")
    			.then(function(data)
    			{
					//TODO
    			});
    		},
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
    	service.changeState=function(idDictionary,expectedState,newState)
    	{
    		return dbConnector.then(function(dbc)
    		{
    			return Promise.all(Object.keys(idDictionary)
    				.map(type=>dbc.load(options.DBClassDictionary[type],{ID:idDictionary[type],state:expectedState}))
    			)
				.then(downloads=>Array.prototype.concat.apply(Array.prototype,downloads))//flatten
				.then(function(downloads)
				{
					for(var download of downloads) download.state=newState;
					return dbc.save(downloads).then(()=>notify("update",downloads));
				});
    		});
    	};
    	service.delete=function(patternDictionary)
    	{
    		var deletions=Object.keys(patternDictionary)
			.map(type=>dbConnector
				.then(dbc=>dbc.delete(options.DBClassDictionary[type],patternDictionary[type])
					.then(r=>[type,r],
						e=>[type,SC.es(e)]
					)
				)
			);
			return Promise.all(deletions)
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
    	}
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

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);