var path = require("path");
var logger=require("../../logger")("download")
var fork=require("child_process").fork;
var downloader=fork(path.join(__dirname,"..","..","downloader"));

var config=require("../../config");
var uuid=0;
var downloads=[];
var active={_count:0};
var eventSources=[];

exports.get=function(request,queryParam,response)
{
	response.writeHead(200, {"Content-Type":"text/event-stream", "Cache-Control":"no-cache", "Connection":"keep-alive"});
	response.write("retry: 10000\n");
	response.write("event: list\n");
	response.write("data: " + JSON.stringify(downloads) + "\n\n");
	
	eventSources.push(response);
	request.connection.addListener("close", function () {
		var index=eventSources.indexOf(response);
		if(index===-1)logger.error("could not find response in eventSources");
		else eventSources.splice(index,1);
	}, false);
}
var notifyEventSources=function(eventType,download)
{
	var data=JSON.stringify(download);
	for(var es of eventSources)es.write("event: "+eventType+"\ndata: "+data+"\n\n");
}
exports.add=function(request)
{
	if(request.method!=="POST")return "post packages in json array";
	else return new Promise(function(resolve,reject)
	{
		var post = '';
	    request.on('data', function (data) {post += data});
	    request.on('end', function ()
	    {
	    	try
	    	{
		    	post=JSON.parse(post);
		    	console.log(post)
		    	for(var d of post)
		    	{
		    		d.id=uuid++;
		    		d.state="pending";
		    		d.msg={type:"info",text:""};
		    		downloads.push(d);
		    		notifyEventSources("add",d);
		    	}
		    	resolve("ok");
		    	startDownloads();
	    	}
	    	catch(e)
	    	{
	    		reject(e);
	    	}
	    });
	});
};

var startDownloads=function()
{
	for(var d of downloads)
	{
		if(d.state=="pending")
		{
			if(active._count<config.maxDownloads)
			{
				if(!active[d.network])active[d.network]={_count:0};
				var net=active[d.network];
				if(net._count<config.maxNetworkDownloads)
				{
					if(!net[d.bot])net[d.bot]=0;
					if(net[d.bot]<config.maxBotDownloads)
					{
						d.progress=[0,1];
						d.state="running";
						d.msg={type:"info",text:"starting"};
						d.startTime=0;
						d.updateTime=0;
						d.location=0;
						
						net[d.bot]++;
						net._count++;
						active._count++;
						
						logger.info({download:d},"run");
						logger.debug("active %d, networt %s %d, bot %s %d",active._count,d.network,net._count,d.bot,net[d.bot]);

			    		notifyEventSources("update",d);
						downloader.send(JSON.stringify(d));
					}
					else d.msg="bot cap reached";
				}
				else d.msg="network download cap reached";
			}
			else d.msg="overall download cap reached";
		}
	}
};

downloader.on("message",function(download)
{
	download=JSON.parse(download);
	for(var d of downloads)
	{
		if(d.id===download.id)
		{
			d.progress=download.progress;
			d.state=download.state;
			d.msg=download.msg;
			d.startTime=download.startTime;
			d.updateTime=download.updateTime;
			d.location=download.location;
    		notifyEventSources("update",d);
			if(d.state==="done")
			{
				active._count--;
				active[d.network]._count--;
				active[d.network][d.bot]--;
				logger.info({download:d},"done");
				logger.debug("active %d, networt %s %d, bot %s %d",active._count,d.network,active[d.network]._count,d.bot,active[d.network][d.bot]);
				startDownloads();
			}
			return true;
		}
	}
	return false;
});