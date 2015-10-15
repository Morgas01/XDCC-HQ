var subOfficeName=process.argv[2];
var search=process.argv[3];

var url=require("url");
var path=require("path");
var fs=require("fs");
require("../webapp/Morgas/src/NodeJs/Morgas.NodeJs");
var logger=require("../logger")(subOfficeName);
var errorSerializer=require("../logger").errorSerializer

var MAX_FILE_AGE=3;

var SC=µ.shortcut({
	ef:"enshureFolder"
});
var targetDir=path.join(__dirname,"..","temp");
var targetFilePath=path.join(targetDir,subOfficeName+"on");
var subOffice=require("../subOffices/"+subOfficeName);

var filterResults=function(results)
{
	var exp=new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/\s+/g,".*"),"i");
	return results.filter(function(p){return exp.test(p.name)});
}

var useFile=false;
if(subOffice.type==="FILE"&&fs.existsSync(targetFilePath))
{
	useFile=true;
	var age=(Date.now()-fs.statSync(targetFilePath).mtime)/864E5;
	if(age>MAX_FILE_AGE)
	{
		logger.info("not using file because it's too old (%s days)",age.toFixed(1));
		useFile=false;
	}
}
if(useFile)
{
	logger.info("hunt from existing file");
	var results=require(targetFilePath);
	results=filterResults(results);
	process.send(JSON.stringify({results:results,error:null}));
}
else
{
	try
	{
		var getUrl=subOffice.getUrl(search);
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
		}).on("error",function(e)
		{
			logger.error({error:e},"error get data");
			process.send(JSON.stringify({results:[],error:errorSerializer(e)}));
		});
	}
	catch (e)
	{
		logger.error({error:e},"error get url");
		process.send(JSON.stringify({results:[],error:errorSerializer(e)}));
	}
}