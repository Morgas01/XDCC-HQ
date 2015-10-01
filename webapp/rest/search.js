var fs=require("fs");
var path = require("path");
var logger=require("../../logger")("search")
var fork=require("child_process").fork;

var subOffices={};
var uniquify=µ.getModule("uniquify");


module.exports=function(request)
{
	if(request.method!=="POST")return "post a string to search for";
	else return new Promise(function(resolve,reject)
	{
		var search = '';
	    request.on('data', function (data) {search += data});
	    request.on('end', function () {
	    	if (search.length==0) reject("empty search string");
	    	else
	    	{
	    		var searchJobs=fs.readdirSync(path.join(__dirname,"..","..","subOffices")).map(function(subOffice)
	    		{
	    			return doSearch(subOffice,search);
	    		});
	    		Promise.all(searchJobs).then(filterResults).then(function(filteredResults)
	    		{
	    			resolve(filteredResults);
	    		},reject)
	    	}
	    });
	});
};

var doSearch=function(subOffice,search)
{
	return new Promise(function (resolve)
	{
		logger.info({search:search},"start hunting in subOffice %s",subOffice);
		var hunter=fork(path.join(__dirname,"..","..","libs","hunter"),[subOffice,search]);
		hunter.on("message",function(data)
		{
			data=JSON.parse(data);
			data.subOffice=subOffice;
			resolve(data);
			if(!data.error)logger.info({search:search},"hunted in subOffice %s %d packs",subOffice,data.results.length);
			else logger.warn({search:search,error:data.error},"hunted in subOffice %s with an error",subOffice);
		});
		hunter.on("error",function(err){
			logger.error({search:search,error:err},"hunter has trown an error for subOffice %s",subOffice);
			resolve({results:[],subOffice:subOffice,error:err});
		})
		hunter.on("exit",function()
		{
			logger.info({search:search},"hunt ended in subOffice %s",subOffice);
			resolve({results:[],subOffice:subOffice,error:"unexpected exit"});
		});
	});
};
var filterResults=function(huntResults)
{
	var rtn={
		results:[],
		errors:[]
	};
	for(var i=0;i<huntResults.length;i++)
	{
		rtn.results=rtn.results.concat(huntResults[i].results);
		if(huntResults[i].error) rtn.errors.push({subOffice:huntResults[i].subOffice,error:huntResults[i].error});
	}
	rtn.results=uniquify(rtn.results,function(p){return p.network+p.bot+p.packnumber+p.name});
	return rtn;
}