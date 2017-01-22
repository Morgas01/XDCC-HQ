
module.exports=function(network,channel,bot)
{
	var rtn=require("./xdccList")(network,channel,null,bot);
	rtn.type="BOT";
	return rtn;
};