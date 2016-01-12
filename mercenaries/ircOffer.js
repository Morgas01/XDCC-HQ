//define in subOffice
exports.network=null;
exports.channel=null;
exports.url=null;
exports.bot=null;

exports.type="FILE";
exports.getUrl=function(search)
{
	return exports.url;
}
var parseRegEx=/"right">#?(\d+).*?"right">.*?"right">(\d+.).*?>([^<]+)<\/(a|span)/g;
exports.parse=function(data)
{
	data=data.replace(/\n/g,"");
	var rtn=[];
	var match;
	while(match=parseRegEx.exec(data))
	{
		rtn.push({
			network:exports.network,
			channel:exports.channel,
			bot:exports.bot,
			name:match[3],
			packnumber:match[1],
			size:match[2]
		});
	}
	return rtn;
}