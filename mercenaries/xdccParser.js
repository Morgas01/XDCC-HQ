//define in subOffice
exports.network=null;
exports.channel=null;
exports.url=null;

exports.type="SEARCH";
exports.getUrl=function(search)
{
	return exports.url+"/search.php?t="+encodeURIComponent(search);
}
var parseRegEx=/b:"([^"]+).*n:(\d+).*s:(\d+).*f:"([^"]+)/g
exports.parse=function(data)
{
	var rtn=[];
	var match;
	while(match=parseRegEx.exec(data))
	{
		rtn.push({
			network:exports.network,
			channel:exports.channel,
			bot:match[1],
			name:match[4],
			packnumber:match[2],
			size:match[3]+"M"
		});
	}
	return rtn;
}