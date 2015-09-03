var fs=require("fs");
var path = require("path");
var logger=require("../../logger")("search")
var fork=require("child_process").fork;

var subOffices={};


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
	    		Promise.all(searchJobs).then(function(results)
	    		{
	    			resolve(Array.prototype.concat.apply([],results.filter(function(a){return a!=undefined})));
	    		},reject)
	    	}
	    });
	});
};

var doSearch=function(subOffice,search)
{
	return new Promise(function (resolve)
	{
		var hunter=fork(path.join(__dirname,"..","..","hunter"),[subOffice,search]);
		hunter.on("message",function(data)
		{
			resolve(JSON.parse(data));
		});
		hunter.on("error",function(err){
			logger.error({error:err},"hunter has trown an error for subOffice %s",subOffice);
			resolve();
		})
		hunter.on("exit",function()
		{
			logger.info("hunt ended in subOffice %s",subOffice);
			resolve();
		});
	});
}