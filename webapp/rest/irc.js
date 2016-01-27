
var Operator=require("../../libs/ircOperator");
var config=require("../../libs/configManager");

var eventSources=[];


var cleanOrderIndexes=function(all)
{//clean orderIndexes & calculate next one
	nextOrderIndex=1;
	for(var d of all)
	{
		d.orderIndex=nextOrderIndex++;
	}
	downloads.save(all);
};

exports.list=function(request,queryParam,response)
{
	if(request.headers.accept==="text/event-stream")
	{
		response.writeHead(200, {"Content-Type":"text/event-stream", "Cache-Control":"no-cache", "Connection":"keep-alive"});
		response.write("retry: 5000\n");
		response.write("event: list\ndata: "+JSON.stringify(Operator.getMessages())+"\n\n");
		eventSources.push(response);
		request.connection.addListener("close", function () {
			var index=eventSources.indexOf(response);
			if(index===-1)logger.error("could not find response in eventSources");
			else eventSources.splice(index,1);
		}, false);
	}
	else return JSON.stringify(Operator.getMessages())
};
var notifyEventSources=function(eventType,data)
{
	data=JSON.stringify(data);
	for(var es of eventSources)es.write("event: "+eventType+"\ndata: "+data+"\n\n");
};

setInterval(function ()
{
	notifyEventSources("ping",process.uptime());
},60000).unref();

Operator.on("message",function(msg)
{
	notifyEventSources("message",msg);
})

exports.connect=function(request)
{
	if(request.method!=="POST")return "post as {url,[nick]}";
	else return new Promise(function(resolve,reject)
	{
		var param = '';
	    request.on('data', function (data) {param += data});
	    request.on('end', function ()
	    {
	    	try
	    	{
	    		param=JSON.parse(param);
	    		Operator.connectToNetwork(param.url,param.nick||config.ircNick);
		    	resolve("ok");
	    	}
	    	catch(e)
	    	{
	    		reject(e);
	    	}
	    });
	});
};
exports.join=function(request)
{
	if(request.method!=="POST")return "post as {url,channel}";
	else return new Promise(function(resolve,reject)
	{
		var param = '';
	    request.on('data', function (data) {param += data});
	    request.on('end', function ()
	    {
	    	try
	    	{
	    		param=JSON.parse(param);
	    		Operator.joinChannel(param.url,param.channel);
		    	resolve("ok");
	    	}
	    	catch(e)
	    	{
	    		reject(e);
	    	}
	    });
	});
};
exports.say=function(request)
{
	if(request.method!=="POST")return "post as {url,target,text}";
	else return new Promise(function(resolve,reject)
	{
		var param = '';
	    request.on('data', function (data) {param += data});
	    request.on('end', function ()
	    {
	    	try
	    	{
	    		param=JSON.parse(param);
		    	Operator.sendMessage(param.url,param.target,param.text);
		    	resolve("ok");
	    	}
	    	catch(e)
	    	{
	    		reject(e);
	    	}
	    });
	});
};
exports.sayPrivate=function(request)
{
	if(request.method!=="POST")return "post as {url,target,text}";
	else return new Promise(function(resolve,reject)
	{
		var param = '';
	    request.on('data', function (data) {param += data});
	    request.on('end', function ()
	    {
	    	try
	    	{
	    		param=JSON.parse(param);
		    	Operator.sendPrivateMessage(param.url,param.target,param.text);
		    	resolve("ok");
	    	}
	    	catch(e)
	    	{
	    		reject(e);
	    	}
	    });
	});
};
exports.whois=function(request)
{
	if(request.method!=="POST")return "post as {url,target,text}";
	else return new Promise(function(resolve,reject)
	{
		var param = '';
	    request.on('data', function (data) {param += data});
	    request.on('end', function ()
	    {
	    	try
	    	{
	    		param=JSON.parse(param);
		    	Operator.whois(param.url,param.target);
		    	resolve("ok");
	    	}
	    	catch(e)
	    	{
	    		reject(e);
	    	}
	    });
	});
};