
let subOfficeName;
let subOffice;
let searchTimeout;
let fileExpiration;
let niwaWorkDir;
let appContext;

let SC=µ.shortcut({
	File:"File",
	Promise:"Promise",
	URL:require.bind(null,"url"),
	errorSerializer:"errorSerializer"
});


worker.search=null;
worker.initialize.then(function(param)
{
	subOfficeName=param.subOffice;
	subOffice=require("../subOffices/"+param.subOffice);
	searchTimeout=param.searchTimeout;
	fileExpiration=param.fileExpiration;
	niwaWorkDir=param.niwaWorkDir;
	appContext=param.context;

	worker.search=searches[subOffice.type.toUpperCase()];
});

let getWorkDir=function()
{
	return new SC.File(niwaWorkDir).changePath("work/"+appContext)
}

//TODO logs

let searches={
	"SEARCH":function(query)
	{
		let getUrl=subOffice.getUrl(query);
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
		let parsedFile=getWorkDir().changePath(subOfficeName+"on");
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
			let getUrl=subOffice.getUrl();
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
		let downloadedFile=getWorkDir().changePath(subOfficeName.slice(0,-3)+".txt");
		let parsedFile=getWorkDir().changePath(subOfficeName.slice(0,-3)+".json");
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
				return Promise.reject({
					message:"no_list",
					listParam:subOffice.listParam
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
let requestUrl=SC.Promise.pledge(function(signal,url)
{
	let options=SC.URL.parse(url);
	let protocol=require(options.protocol.slice(0,-1)||"http");
	options.rejectUnauthorized=false;
	protocol.get(options,function(response)
	{
		let data="";
		response.on("data",function(chunk)
		{
			data+=chunk;
		});
		response.on("error",function(e)
		{
			signal.reject(SC.errorSerializer(e));
		});
		response.on("end",function()
		{
			if(response.statusCode!==200) signal.reject({text:data});
			else signal.resolve(data);
		});
	})
	.on("error",function(e)
	{
		signal.reject(SC.errorSerializer(e))
	})
	.setTimeout(searchTimeout)
	.on("timeout",function()
	{
		this.abort();
		signal.reject({message:"searchTimeout"});
	});
});
let filterResults=function(results,query)
{
	let exp=new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/\s+/g,".*"),"i");
	return results.filter(function(p){return exp.test(p.name)});
};
let appendSubOffice=function(results)
{
	for(let result of results)
	{
		result.subOffice=subOfficeName;
	}
	return results;
}