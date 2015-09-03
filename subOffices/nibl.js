
exports.getUrl=function(search)
{
	return "http://nibl.co.uk/bots.php?search="+encodeURIComponent(search);
}
var parseRegEx=/botname="([^"]+)\D+?(\d+).+?filesize\D+([\d\.]+.).+?filename..(.+?)\s+<a/g;
exports.parse=function(data)
{
	data=data.replace(/\n/g,"");
	var rtn=[];
	var match;
	while(match=parseRegEx.exec(data))
	{
		rtn.push({
			network:"irc://irc.rizon.net",
			channel:"nibl",
			bot:match[1],
			name:match[4],
			packnumber:match[2],
			size:match[3]
		});
	}
	return rtn;
}