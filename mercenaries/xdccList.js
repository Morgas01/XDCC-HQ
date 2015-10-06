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
var parseRegEx=/#(\d+)\s*\d*x\s*\[\s*([\d\.,GgMmKkBb]+)\]\s*(.+)/g;
exports.parse=function(data)
{
	var rtn=[];
	var match;
	console.log(data.slice(280,600));
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