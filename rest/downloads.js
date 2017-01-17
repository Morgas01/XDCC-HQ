/*
var SC=µ.shortcut({
	File:"File",
	FileUtils:"File.util",
	DBC:"DB/jsonConnector",
	XDCCdownload:require.bind(null,"../js/XDCCdownload"),
	DBObject:"DBObject",
	es:"errorSerializer",
	Promise:"Promise"
});

var dbErrors=[];
var rotateErrorMapper=rotateError=>({error:SC.es(rotateError.error),file:rotateError.file.getAbsolutePath()});

var dbConnector=SC.FileUtils.enshureDir("storage").then(function()
{
	return new SC.DBC(this.changePath("downloads.json")).open
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
		if(errors.length>0)
		{
			Array.prototype.push.apply(dbErrors,errors.map(rotateErrorMapper));
			dbErrors.push({file:null,error:"could not load any DB file"});
			µ.logger.warn({errors:dbErrors},"could not load any DB file");
		}
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
		worker.event("downloads",dbc.db.getValues(),event,data);
	});
};
notify("init",null);

module.exports={
	errors:function()
	{
		return dbErrors;
	},
	add:function(param)
	{
		if (param.method!=="POST"||!param.data||!param.data.length)
		{
			return String.raw
`post as json like this:
[
	{
		"name":"packageName",
		"sources":[
			{
				"network":"ircServer",
				"channel":"ircChannel",
				"bot":"xdccBot",
				"packnumber":number
			}
			(,...)
		]
	}
	(,...)
]
`
			;
		}
		else
		{
			var downloads=param.data.map(d=>new SC.XDCCdownload(d));
			return dbConnector.then(function(dbc)
			{
				return dbc.save(downloads);
			}).then(function(){
				dbErrors.length=0;
				notify("add",downloads);
				return true;
			},
			function(error)
			{
				error={error:SC.es(error),file:this.file.getAbsolutePath()};
				µ.logger.error(error,"failed to add downloads");
				dbErrors.push(error);
				return Promise.reject(error);
			});
		}
	}
}
*/
require("../lib/NIWA-Download/Download");
var XDCCdownload=require("../js/XDCCdownload");

var manager=require("../lib/NIWA-Download/service")({
	DBClassDictionary:{
		XDCCdownload:XDCCdownload
	}
});

module.exports={
	deleteByState:function(param)
	{
		if(param.method!=="DELETE") return "http method must be DELETE";
		if(param.data in XDCCdownload.states) return manager.delete({XDCCdownload:{state:XDCCdownload.states[param.data]}});
		else return "unknown state: "+param.data;
	},
	manager:manager
};