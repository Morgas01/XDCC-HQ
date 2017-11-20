
var parseRegEx=/"right">#?(\d+).*?"right">.*?"right">(\d+.).*?>([^<]+)<\/(a|span)/g;

module.exports=function(network,channel,url,user)
{
	return {
		type:"FILE",
		getUrl:()=>url,
		parse:function(data)
        {
        	data=data.replace(/\n/g,"");
        	var rtn=[];
        	var match;
        	while(match=parseRegEx.exec(data))
        	{
        		rtn.push({
        			network:network,
        			channel:channel,
        			user:user,
        			name:match[3],
        			packnumber:match[1],
        			filesize:match[2]
        		});
        	}
        	return rtn;
        }
	}
}