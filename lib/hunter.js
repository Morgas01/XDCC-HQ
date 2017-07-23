
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
		var parsedFile=new SC.File(__dirname).changePath("../storage").changePath(subOfficeName+"on");
		return parsedFile.exists()
		.then(function()
		{
			//age in days < file expiration time
			return parsedFile.stat().then(stat=>(Date.now()-stat.mtime)/864E5<fileExpiration?Promise.resolve():Promise.reject());
		})
		.then(function()
		{
			µ.logger.info("hunt from file");
			return parsedFile.read().then(JSON.parse);
		},
		function()
		{
			var getUrl=subOffice.getUrl();
			µ.logger.info({url:getUrl},"hunt from url");
			return requestUrl(getUrl)
			.then(subOffice.parse)
			.then(function(jsonData)
			{
				return parsedFile.write(JSON.stringify(jsonData))
				.always(()=>jsonData) //return json data
			});
		})
		.then(r=>filterResults(r,query))
		.then(appendSubOffice);
	},
	"BOT":function(query)
	{
		var downloadedFile=new SC.File(__dirname).changePath("../storage").changePath(subOfficeName+".txt");
		var parsedFile=new SC.File(__dirname).changePath("../storage").changePath(subOfficeName+".json");
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
			return downloadedFile.exists() //TODO check expiration time?
			.then(function()
			{
				return downloadedFile.read().then(subOffice.parse)
			},
			function()
			{
				downloadedFile.getAbsolutePath();
				return Promise.reject({
					message:"no_list",
					listParam:{
						filepath:downloadedFile.getDir(),
                        filename:downloadedFile.getName(),
                        sources:[subOffice.listParam],
                        dataSource:{
                        	checkName:false
                        }
					}
				});
			})
			.then(function(jsonData)
			{
				return parsedFile.write(JSON.stringify(jsonData))
				.then(()=>downloadedFile.remove())
				.always(()=>jsonData); //return json Data
			});
		})
		.then(r=>filterResults(r,query))
		.then(appendSubOffice);
	}
}
var requestUrl=SC.Promise.pledge(function(signal,url)
{
	var options=SC.URL.parse(url);
	var protocol=require(options.protocol.slice(0,-1)||"http");
	options.rejectUnauthorized=false;
	protocol.get(options,function(response)
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
			if(response.statusCode!==200) signal.reject({text:data});
			else signal.resolve(data);
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
		signal.reject({message:"searchTimeout"});
	});
});
var filterResults=function(results,query)
{
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