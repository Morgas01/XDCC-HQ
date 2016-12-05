
var subOfficeName;
var subOffice;
var searchTimeout;
var fileExpiration;

var SC=µ.shortcut({
	File:"File",
	Promise:"Promise",
	URL:require.bind(null,"url")
});
worker.init=function(param)
{
	subOfficeName=param.subOffice;
	subOffice=require("../subOffices/"+param.subOffice);
	searchTimeout=param.searchTimeout;
	fileExpiration=param.fileExpiration;

	worker.search=searches[subOffice.type.toUpperCase()];
}
worker.search=null;

//TODO logs

var searches={
	"SEARCH":function(query)
	{
		var getUrl=subOffice.getUrl(query);
		µ.logger.info({url:getUrl},"hunt from url");
		return requestUrl(getUrl)
		.then(function(data)
		{
			return subOffice.parse(data);
		})
		.then(appendSubOffice);
	},
	"FILE":function(query)
	{
		var parsedFile=new SC.File(__dirname).changePath("../temp").changePath(subOfficeName);
		return parsedFile.exists()
		.then(function()
		{
			//age in days < file expiration time
			return parsedFile.stat().then(stat=>(Date.now()-stat.mtime)/864E5<fileExpiration?Promise.resolve():Promise.reject());
		})
		.then(function()
		{
			return parsedFile.read().then(JSON.parse);
		},
		function()
		{
			return requestUrl(subOffice.getUrl())
			.then(function(data)
			{
				return subOffice.parse(data);
			})
			.then(function(jsonData)
			{
				return parsedFile.write(jsonData)
				.then(()=>jsonData) //return json data
			});
		})
		.then(r=>filterResults(r,query))
		.then(appendSubOffice);
	},
	"BOT":function(query)
	{
		var downloadedFile=new SC.File(__dirname).changePath("../temp").changePath(subOfficeName+".txt");
		var parsedFile=new SC.File(__dirname).changePath("../temp").changePath(subOfficeName+".json");
		return parsedFile.exists()
		.then(function()
		{
			//age in days < file expiration time
			return parsedFile.stat().then(stat=>(Date.now()-stat.mtime)/864E5<fileExpiration?Promise.resolve():Promise.reject());
		})
		.then(function()
		{
			return parsedFile.read().then(JSON.parse);
		},
		function()
		{
			return downloadedFile.exist()
			.then(subOffice.parse,
			function()
			{
				return Promise.reject(
					//TODO error for downloading bot listing
				)
			})
			.then(function(jsonData)
			{
				return parsedFile.write(jsonData)
				.then(()=>downloadedFile.remove().catch(µ.constantFunctions.pass)) //ignore error from removing file
				.then(()=>jsonData) //return json data
			});
		})
		.then(r=>filterResults(r,query))
		.then(appendSubOffice);
	}
}
var requestUrl=SC.Promise.pledge(function(signal,url)
{
	var protocol=require(SC.URL.parse(url).protocol.slice(0,-1)||"http");
	protocol.get(url,function(response)
	{
		var data="";
		response.on("data",function(chunk)
		{
			data+=chunk;
		});
		response.on("error",function(e)
		{
			signal.reject(e);
		});
		response.on("end",function()
		{
			signal.resolve(data);
		});
	})
	.on("error",function(e)
	{
		signal.reject(e)
	})
	.setTimeout(searchTimeout)
	.on("timeout",function()
	{
		this.abort();
		signal.reject("timeout");
	});
});
var filterResults=function(results,query)
{
	//TODO FuzzySearch?
	var exp=new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/\s+/g,".*"),"i");
	return results.filter(function(p){return exp.test(p.name)});
};
var appendSubOffice=function(results)
{
	for(var result of results)
	{
		result.subOffice=subOfficeName;
	}
	return results;
}