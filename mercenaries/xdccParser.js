//define in subOffice
exports.network=null;
exports.channel=null;
exports.url=null;

exports.getUrl=function(search)
{
	return exports.url+"/search.php?t="+encodeURIComponent(search);
}
exports.parse=function(data)
{
	data=JSON.parse(("["+data.replace(/p\.k\[\d+\]\s=\s/g,"").replace(/;[\r\n]+/g,",").slice(0,-1).replace(/(\w+):/g,'"$1":')+"]"))
	var rtn=data.map(function(d)
	{
		return {
			network:exports.network,
			channel:exports.channel,
			bot:d.b,
			name:d.f,
			packnumber:d.n,
			size:d.s+"M"
		};
	});
	return rtn;
}