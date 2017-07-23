
module.exports=function(network,channel,bot,listPackNumber=-1)
{
	var rtn=require("./xdccList")(network,channel,null,bot);
	rtn.type="BOT";
	rtn.listParam={
		network:network,
		channel:channel,
		packnumber:listPackNumber
	};
	return rtn;
};