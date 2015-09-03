var config=require("../../config");
console.log(config);
module.exports=function(request)
{
	return config;
};