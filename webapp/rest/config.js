var path=require("path");
var fs=require("fs");
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
module.exports=function(request)
{
	var p;
	if(request.method==="POST") p=new Promise(function(resolve,reject)
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
	else p=new Promise(function(resolve,reject)
	{
		var subOffices=fs.readdirSync(path.join(__dirname,"..","..","subOffices"))
		.reduce((o,k)=>{o[k.slice(0,-3)]=true;return o},{});
		config.addDefault({subOffices:subOffices});
		resolve(config);
	});
	return p;
};