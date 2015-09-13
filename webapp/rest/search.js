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
		var hunter=fork(path.join(__dirname,"..","..","hunter"),[subOffice,search]);
		hunter.on("message",function(data)
		{
			data=JSON.parse(data);
			resolve(data);
			logger.info({search:search},"hunted in subOffice %s %d packs",subOffice,data.length);
		});
		hunter.on("error",function(err){
			logger.error({search:search,error:err},"hunter has trown an error for subOffice %s",subOffice);
			resolve();
		})
		hunter.on("exit",function()
		{
			logger.info({search:search},"hunt ended in subOffice %s",subOffice);
			resolve();
		});
	});
};
var filterResults=function(results)
{
	var unpackedResults=Array.prototype.concat.apply([],results.filter(function(a){return a!=undefined}));
	var filteredResults=uniquify(unpackedResults,function(p){return p.network+p.bot+p.number+p.name});
	return filteredResults;
}