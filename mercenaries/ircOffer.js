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
var parseRegEx=/"right">#?(\d+).*?"right">.*?"right">(\d+.).*?>([^<]+)<\/a/g;
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
			name:match[4],
			packnumber:match[3],
			size:match[2]
		});
	}
	return rtn;
}