var subOfficeName=process.argv[2];
var search=process.argv[3];

var url=require("url");
var path=require("path");
var fs=require("fs");
require("./webapp/Morgas/src/NodeJs/Morgas.NodeJs");
var logger=require("./logger")(subOfficeName);

var SC=µ.shortcut({
	ef:"enshureFolder"
});
var targetDir=path.join(__dirname,"temp");
var targetFilePath=path.join(targetDir,subOfficeName+"on");
var subOffice=require("./subOffices/"+subOfficeName);

var filterResults=function(results)
{
	var exp=new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/\s+/g,".*"),"i");
	return results.filter(function(p){return exp.test(p.name)});
}

if(subOffice.type==="FILE"&&fs.existsSync(targetFilePath))
{
	logger.info("hunt from existing file");
	var results=require(targetFilePath);
	results=filterResults(results);
	process.send(JSON.stringify(results));
}
else
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
		});
		response.on("end",function()
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
					process.send(JSON.stringify(results));
			}
		});
	}).on("error",function(e)
	{
		logger.error({error:e},"error get");
	});
}