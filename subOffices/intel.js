
exports.getUrl=function(search)
{
	return "http://intel.haruhichan.com/ajax.php?a=s&t="+encodeURIComponent(search);
}
exports.parse=function(data)
{
	data=JSON.parse(data);
	var rtn=data.files.map(function(d)
	{
		return {
			network:"irc.rizon.net",
			channel:"#intel",
			bot:d.botname,
			name:d.filename,
			packnumber:d.packnum,
			size:d.size
		};
	});
	return rtn;
}