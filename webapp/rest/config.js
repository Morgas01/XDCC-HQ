var path=require("path");
var config=require("../../config");
module.exports=function(request)
{
	config.resolvedDownloadDir=path.resolve(config.downloadDir);
	return config;
};