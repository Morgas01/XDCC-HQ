var path=require("path");
var config=require("../../libs/configManager");

module.exports=function(request)
{
	if(request.method!=="POST") return config;
	else return new Promise(function(resolve,reject)
	{
		var post = '';
	    request.on('data', function (data) {post += data});
	    request.on('end', function ()
	    {
	    	try
	    	{
		    	post=JSON.parse(post);
		    	config.add(post);
		    	resolve(config);
	    	}
	    	catch(e)
	    	{
	    		reject(e);
	    	}
	    });
	});
};