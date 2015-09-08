var path = require("path");
var logger=require("../../logger")("download")
var fork=require("child_process").fork;
var downloader=fork(path.join(__dirname,"..","..","downloader"));

var config=require("../../config");
var downloads=[];
var active={_count:0};

exports.get=function(request)
{
	return downloads;
}
exports.add=function(request)
{
	if(request.method!=="POST")return "post packages in json array";
	else return new Promise(function(resolve,reject)
	{
		var packages = '';
	    request.on('data', function (data) {packages += data});
	    request.on('end', function () {
	    	try{packages=JSON.parse(packages);}
	    	catch(e){return reject(e);}
	    	
	    	for(var p of packages)
	    	{
	    		p.id=downloads.length;
	    		p.state="pending";
	    		p.msg="";
	    		downloads.push(p);
	    	}
	    	resolve("ok");
	    	startDownloads();
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
						d.state="running";
						d.msg="";
						net[d.bot]++;
						net._count++;
						active._count++;
						logger.info({download:d},"run");
						logger.debug("active %d, networt %s %d, bot %s %d",active._count,d.network,net._count,d.bot,net[d.bot]);
						
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
			//TODO event
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