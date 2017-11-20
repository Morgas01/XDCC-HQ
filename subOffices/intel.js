
exports.type="SEARCH";
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
			user:d.botname,
			name:d.filename.trim(),
			packnumber:d.packnum,
			filesize:d.size
		};
	});
	return rtn;
}