var param=JSON.parse(process.argv[2]);

var url=require("url");
var path=require("path");
var fs=require("fs");
require("../webapp/Morgas/src/NodeJs/Morgas.NodeJs");
var logger=require("../logger")(param.subOfficeName);
var errorSerializer=require("../logger").errorSerializer


process.on("uncaughtException",function(e)
{
	process.send(JSON.stringify({results:[],error:errorSerializer(e)}));
	process.exit();
});


var SC=µ.shortcut({
	ef:"enshureFolder"
});
var targetDir=path.join(__dirname,"..","temp");
var targetFilePath=path.join(targetDir,param.subOfficeName+"on");
var subOffice=require("../subOffices/"+param.subOfficeName);

var checkFile=function(filePath)
{
	if(fs.existsSync(filePath))
	{
		var age=(Date.now()-fs.statSync(filePath).mtime)/864E5; //in days
		if(age>param.fileExpiration)
		{
			logger.info("not using file %s because it's too old (%s days)",path.parse(filePath).base,age.toFixed(1));
			return false;
		}
		return true
	}
	logger.info("file %s does not exist",path.parse(filePath).base);
	return false;
};

var filterResults=function(results)
{
	var exp=new RegExp(param.search.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/\s+/g,".*"),"i");
	return results.filter(function(p){return exp.test(p.name)});
};

if((subOffice.type==="FILE"||subOffice.type==="BOT")&&checkFile(targetFilePath))
{
	logger.info("hunt from existing file");
	var results=require(targetFilePath);
	results=filterResults(results);
	process.send(JSON.stringify({results:results,error:null}));
}
else if (subOffice.type==="BOT")
{
	targetFilePath=targetFilePath.slice(0,-4)+"txt";
	if(checkFile(targetFilePath))
	{
		logger.info("parse list into json");
		var data=""+fs.readFileSync(targetFilePath);
		var results=subOffice.parse(data);
		fs.writeFileSync(targetFilePath.slice(0,-3)+"json",JSON.stringify(results));
		logger.info("hunt from list");
		results=filterResults(results);
		process.send(JSON.stringify({results:results,error:null}));
		fs.unlinkSync(targetFilePath);
	}
	else
	{
		process.send(JSON.stringify({results:[],error:{
			type:"missingList",
			message:"List from bot is missing",
			stack:"download list",
			network:subOffice.network,
			channel:subOffice.channel,
			bot:subOffice.bot,
		}}));
	}
}
else
{
	try
	{
		var getUrl=subOffice.getUrl(param.search);
		logger.info({url:getUrl},"hunt from url");
		var protocol=require(url.parse(getUrl).protocol.slice(0,-1)||"http");
		protocol.get(getUrl,function(response)
		{
			var data="";
			response.on("data",function(chunk)
			{
				data+=chunk;
			});
			response.on("error",function(e)
			{
				logger.error({error:e},"error response");
				process.send(JSON.stringify({results:[],error:errorSerializer(e)}));
			});
			response.on("end",function()
			{
				try
				{
					var results=subOffice.parse(data);
					switch(subOffice.type)
					{
						case "FILE":
							logger.info("save results to file");
							SC.ef(targetDir);
							fs.writeFileSync(targetFilePath,JSON.stringify(results));
							results=filterResults(results);
						case "SEARCH":
						default:
							process.send(JSON.stringify({results:results,error:null}));
					}
				}
				catch (e)
				{
					logger.error({error:e},"error parse data");
					process.send(JSON.stringify({results:[],error:errorSerializer(e)}));
				}
			});
		})
		.on("error",function(e)
		{
			logger.error({error:e},"error get data");
			process.send(JSON.stringify({results:[],error:errorSerializer(e)}));
		})
		.setTimeout(param.searchTimeout)
		.on("timeout",function()
		{
			this.abort();
		});
	}
	catch (e)
	{
		logger.error({error:e},"error get url");
		process.send(JSON.stringify({results:[],error:errorSerializer(e)}));
	}
}