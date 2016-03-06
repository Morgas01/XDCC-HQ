var fs=require("fs");
var path = require("path");
var logger=require("../../logger")("search")
var fork=require("child_process").fork;
var config=require("../../libs/configManager");

var subOffices={};
var uniquify=µ.getModule("uniquify");


module.exports=function(request)
{
	if(request.method!=="POST")return "post a json like {query'queryString'[,subOffices:['subofficeName'...]]}";
	else return new Promise(function(resolve,reject)
	{
		var post = '';
	    request.on('data', function (data) {post += data});
	    request.on('end', function () {
	    	try
	    	{
	    		post=JSON.parse(post);
	    		
	    		var searchJobs;
	    		if(post.subOffices&&post.subOffices.length>0)
	    			searchJobs=post.subOffices;
	    		else
	    		{
	    			searchJobs=fs.readdirSync(path.join(__dirname,"..","..","subOffices"));
	    			if(config.subOffices)
	    				searchJobs=searchJobs.filter(subOffice=>!(subOffice.slice(0,-3) in config.subOffices)||config.subOffices[subOffice.slice(0,-3)]);
	    		}
	    		
	    		logger.info({subOffices:searchJobs});
	    		var promises=searchJobs.slice().map(function(subOffice)
	    		{
	    			var promise=doSearch(subOffice,post.query);
	    			promise.then(data=>
	    			{
	    				var i=searchJobs.indexOf(subOffice);
	    				if(i==-1) logger.error("unknown job has finished: %s",subOffice);
	    				else searchJobs.splice(i,1);
	    				logger.info({remainingJobs:searchJobs},"%d jobs remaining",searchJobs.length);
	    			});
	    			return promise;
	    		});
	    		Promise.all(promises).then(filterResults).then(function(filteredResults)
	    		{
	    			resolve(filteredResults);
	    		},reject)
	    	}
	    	catch(e)
	    	{
	    		reject(e);
	    	}
	    });
	});
};

var doSearch=function(subOffice,search)
{
	return new Promise(function (resolve)
	{
		logger.info({search:search,fileExpiration:config.fileExpiration},"start hunting in subOffice %s",subOffice);
		var hunter=fork(path.join(__dirname,"..","..","libs","hunter"),[JSON.stringify({
			subOfficeName:subOffice,
			search:search,
			fileExpiration:config.fileExpiration,
			searchTimeout:config.searchTimeout
		})]);
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