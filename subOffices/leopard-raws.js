
exports.type="FILE";
exports.getUrl=function(search)
{
	return "http://leopard-raws.org/xdcc/";
}
var parseRegEx=/<td>(\d+)<\/td>[^>]+>([^<]+)<\/td>[^>]+>([\d\.]+)/g;
exports.parse=function(data)
{
	data=data.replace(/[\r\n]+/g,"");
	var rtn=[];
	var match;
	while(match=parseRegEx.exec(data))
	{
		rtn.push({
			network:"irc.rizon.net",
			channel:"#leopard-raws",
			bot:"Leopard-xdcc",
			name:match[2],
			packnumber:match[1],
			size:match[3]+"M"
		});
	}
	return rtn;
}