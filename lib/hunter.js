
let { StringDecoder } = require('string_decoder');

let BOT_LISTS_DIR_NAME="bot lists";
let PARSED_LISTS_DIR_NAME="parsed lists";

let subOfficeName;
let subOffice;
let searchTimeout;
let fileExpiration;
let niwaAppWorkDir;
let noCache;

let SC=µ.shortcut({
	File:"File",
	Promise:"Promise",
	URL:require.bind(null,"url"),
	errorSerializer:"errorSerializer",
	util:"File/util"
});

let searchFn=null;
worker.search=function(query)
{
	if(searchFn==null) return Promise.reject({message:`no search function (bot type:${subOffice?subOffice.type:null})`});
	return searchFn(query)
	.catch(e=>Promise.reject(SC.errorSerializer(e)));
};
worker.initialize.then(function(param)
{
	subOfficeName=param.subOffice;
	subOffice=require("../subOffices/"+param.subOffice);
	searchTimeout=param.searchTimeout;
	fileExpiration=param.fileExpiration;
	niwaAppWorkDir=param.niwaAppWorkDir;
	noCache=param.noCache;

	searchFn=searches[subOffice.type.toUpperCase()];
});

let getWorkDir=function()
{
	return new SC.File(niwaAppWorkDir)
};
let checkFileNotExpired=function(file)
{
	return file.exists()
	.then(function()
	{
		//age in days < file expiration time
		return file.stat().then(stat=>(Date.now()-stat.mtime)/864E5<fileExpiration?Promise.resolve():Promise.reject());
	})
};
let saveParsedList=function(file,data)
{
	let promise=SC.util.enshureDir(file.clone().changePath(".."))
	.then(()=>file.write(JSON.stringify(data)));
	promise.catch(e=>console.error(SC.errorSerializer(e)));
	return promise;
};

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
		let parsedFile=getWorkDir().changePath(PARSED_LISTS_DIR_NAME).changePath(subOfficeName+"on");
		let fileCheck;
		if(noCache)
		{
			fileCheck=Promise.reject();
		}
		else
		{
			fileCheck=checkFileNotExpired(parsedFile);
		}
		return fileCheck.then(function()
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
				return saveParsedList(parsedFile,jsonData)
				.always(()=>jsonData) //return json data
			});
		})
		.then(r=>filterResults(r,query))
		.then(appendSubOffice);
	},
	"BOT":function(query)
	{
		let downloadedFile=getWorkDir().changePath(BOT_LISTS_DIR_NAME).changePath(subOfficeName.slice(0,-3)+".txt");
		let parsedFile=getWorkDir().changePath(PARSED_LISTS_DIR_NAME).changePath(subOfficeName+"on");
		return checkFileNotExpired(parsedFile)
		.then(function()
		{
			return parsedFile.read().then(JSON.parse);
		},
		function(e)
		{
			if(e) µ.logger.error(SC.errorSerializer(e)); //real error
			return downloadedFile.exists() //TODO check expiration time?
			.then(function()
			{
				µ.logger.info("parse bot list");
				return downloadedFile.read()
				.then(buffer=>new StringDecoder().end(buffer))//cast buffer to string for performance
				.then(subOffice.parse)
			},
			function()
			{
				console.log(downloadedFile.getAbsolutePath()+" does not exist");
				subOffice.listParam.subOffice=subOfficeName
				return Promise.reject({
					message:"no_list",
					listParam:subOffice.listParam
				});
			})
			.then(function(jsonData)
			{
				return saveParsedList(parsedFile,jsonData)
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