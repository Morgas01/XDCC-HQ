
exports.type="SEARCH";
exports.getUrl=function(search)
{
	return "https://xdcc.yauncle.net/index.php?search="+encodeURIComponent(search);
}
let groupRegex=/sysinfo.+?<\/table>/g;
let botnameRegex=/sysinfo"><h2>(.+?)<\/h2/;
let parseRegEx=/<tr><td>#(\d+)<\/td><td>([^<]+)<\/td><td>(\d+[^<]+)/g;
exports.parse=function(data)
{
	let rtn=[];
	let groups=data.match(groupRegex);
	if(!groups) return rtn; //no packages
	groups.forEach(group =>
	{
		let botname=group.match(botnameRegex)[1];
		let match;
		while(match=parseRegEx.exec(group))
		{
			rtn.push({
				network:"irc.hoshinet.org",
				channel:"#the-tomodachi",
				user:botname,
				name:match[2],
				packnumber:match[1],
				filesize:match[3]
			});
		}
	})
	return rtn;
}