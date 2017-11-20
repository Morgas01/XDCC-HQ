
var parseRegEx=/b:"([^"]+).*n:(\d+).*s:(\d+).*f:"([^"]+)/g;

module.exports=function(network,channel,url)
{
	return {
		type:"SEARCH",
		getUrl:search=>url+"/search.php?t="+search.replace(/\s/g,"+"),
		parse:function(data)
        {
        	var rtn=[];
        	var match;
        	while(match=parseRegEx.exec(data))
        	{
        		rtn.push({
        			network:network,
        			channel:channel,
					user:match[1],
					name:match[4],
					packnumber:match[2],
					filesize:match[3]+"M"
        		});
        	}
        	return rtn;
        }
	}
};