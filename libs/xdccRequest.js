(function(µ,SMOD,GMOD,HMOD,SC){
	
	var path = require("path");
	var fs = require("fs");
	var net = require("net");
	var XP=require("../webapp/js/XDCCPackage");
	var logger=require("../logger")("xdccRequest");
	
	SC=SC({
		Promise:"Promise",
		adopt:"adopt",
		es:"enshureFolder",
		crc:"util.crc32"
	});
	
	var DEFAULTS={
		path:"downloads",
		fileSuffix:".part",
		timeout:15000,
		resume:true,
		resumeTimeout:5000,
		checkName:false,
		cleanName:true,
		appendCRC:true,
		progressInterval:500,
		update:µ.constantFunctions.ndef()
	};
	var baseDir=path.resolve(__dirname,"..");
	var extractChecksum=/[\[\(]([0-9A-Z]{8})[\)\]]\./;

    // DCC {command} ("|'){filename}("|') {ip} {port}( {filesize})
    var offerParser = /DCC (\w+) "?'?(.+?)'?"? (\d+) (\d+) ?(\d+)?/;
	var int_to_IP=function (n) {
        var octets = [];

        octets.unshift(n & 255);
        octets.unshift((n >> 8) & 255);
        octets.unshift((n >> 16) & 255);
        octets.unshift((n >> 24) & 255);

        return octets.join(".");
    };
	
	module.exports=function(ircClient,xdccPackage,options)
	{
		options=SC.adopt(SC.adopt({},DEFAULTS,true),options);
		if(xdccPackage.filename)options.appendCRC=false;
		xdccPackage.message={type:"info",text:"starting"};
		xdccPackage.state="Running";
		options.update();
		var log=logger.child({filename:xdccPackage.name,packID:xdccPackage.ID});
		log.info({xdccPackage:xdccPackage,options:options},"start");
		
		return new SC.Promise(function XdccRequest(signal)
		{
			var requestTimer=null;
			var resumeTimer=null;
			var offer={};
			
			var onPrivmsg=function(sender, target, message)
			{
				if(sender === xdccPackage.bot && target === ircClient.nick && message.substr(0, 4) == "DCC ")
				{
		            // Split the string into an array
		            var params = message.match(offerParser);
	
		            if(params != null)
		            {
		                switch (params[1])
		                {
		                    //Got DCC SEND message
		                    case "SEND":
								//clear request timeout
								clearTimeout(requestTimer);
	
		                        offer.filename = params[2];
		                        offer.ip = int_to_IP(parseInt(params[3], 10));
		                        offer.port = parseInt(params[4], 10);
		                        offer.resumepos = null;
		                        xdccPackage.progressMax=parseInt(params[5], 10);
	
		                        //guard against additional sends while waiting for resume support
		                        if(!resumeTimer)
		                        {
		                        	if(!xdccPackage.name||XP.cleanName(offer.filename)===xdccPackage.cleanName)
		                        	{//manually added
		                        		if(!xdccPackage.name) xdccPackage.name=offer.filename;
		                        		if(options.cleanName) xdccPackage.name=xdccPackage.cleanName;
			                        	if(!xdccPackage.filename) xdccPackage.filename=xdccPackage.name;
		                        	}
		                        	else
		                        	{
	                        			log.warn("wrong Name: %s",offer.filename);
	                        			xdccPackage.message.type="warning";
	                        			xdccPackage.message.text="wrong name: "+offer.filename;
		                        		if(options.checkName)
		                        		{
		                    				ircClient.removeListener("ctcp-privmsg", onPrivmsg);
		                    				log.info("end download");
		                    				xdccPackage.state="Failed";
		                        			options.update();
		                        			ircClient.say(xdccPackage.bot, "XDCC CANCEL");
		                    				signal.reject("wrong name");
		                        			return;
		                        		}
		                        		else if (!xdccPackage.filename)
		                        		{
		                        			xdccPackage.filename=options.cleanName ? XP.cleanName(offer.filename) : offer.filename;
		                        		}
	                        			options.update();
		                        	}
		                        	if(!xdccPackage.location)
		                        	{
		                        		xdccPackage.location=options.path;
		                        	}
		                        	xdccPackage.location=path.resolve(baseDir,xdccPackage.location);
			                        // Get the download location
			                        var location = path.resolve(xdccPackage.location,xdccPackage.filename);
		    						
			                        // Check for file existence
		    						fs.stat(location + options.fileSuffix, function (err, stats)
		    						{
			                            // File exists
			                            if (!err && stats.isFile())
			                            {
		                        			log.info("file exists");
			                                if (options.resume)
			                                {
			                                    // Resume download
			                                	log.info("try to resume");
			                                    ircClient.ctcp(xdccPackage.bot, 'privmsg', 'DCC RESUME "' + offer.filename + '" '+ offer.port + ' ' + stats.size);
			                                    offer.resumepos = stats.size;
			                                    //set timeout for resume acceptance
			                                    resumeTimer=setTimeout(function()
			                                    {
			                                        // resume timeout. Delete file and start download
			                                    	log.info("resume timed out");
			                                    	offer.resumepos=0;
					                            	ircClient.removeListener("ctcp-privmsg", onPrivmsg);
			                                        startDownload(signal,xdccPackage,options,offer);
			                                    },options.resumeTimeout);
			                                } else {
			                                    // Dont resume download delete file and start download
			                                	log.info("don't resume");
		                                    	offer.resumepos=0;
				                            	ircClient.removeListener("ctcp-privmsg", onPrivmsg);
		                                        startDownload(signal,xdccPackage,options,offer);
			                                }
			                            } else {
			                                // File dont exists start download
			                            	ircClient.removeListener("ctcp-privmsg", onPrivmsg);
			                                startDownload(signal,xdccPackage,options,offer);
			                            }
			                        });
		                        }
		                        break;
		                    // Got DCC ACCEPT message (bot accepts the resume command)
		                    case "ACCEPT":
		                        // Check accept command params
		                        if (offer.filename == params[2] &&
		                            offer.port == parseInt(params[3], 10) &&
		                            offer.resumepos == parseInt(params[4], 10)) {
	
									//clear timeout for resume acceptance
									clearTimeout(resumeTimer);
	
		                            // Download the file
		                            log.info("resume accepted");
	                            	ircClient.removeListener("ctcp-privmsg", onPrivmsg);
		                            startDownload(signal,xdccPackage,options,offer);
	
		                        }
		                        break;
		                }
		            }
	
				}
			};
			ircClient.on("ctcp-privmsg", onPrivmsg);
			ircClient.say(xdccPackage.bot, "XDCC SEND " + xdccPackage.packnumber);
			signal.onAbort(function()
			{
				ircClient.removeListener("ctcp-privmsg", onPrivmsg);
				ircClient.say(xdccPackage.bot, "XDCC CANCEL");
			});
			requestTimer=setTimeout(function()
			{
				ircClient.removeListener("ctcp-privmsg", onPrivmsg);
				log.warn("request timed out. end download.");
        		
				xdccPackage.message.text="request timeout";
        		xdccPackage.message.type="error";
    			options.update();
    			options.update=µ.constantFunctions.ndef();
				signal.reject("request timeout");
				
			},options.timeout);
		});
	};

	var startDownload = function(signal,xdccPackage,options,offer)
	{
		var log=logger.child({filename:xdccPackage.name,packID:xdccPackage.ID});
		var filePath=path.resolve(xdccPackage.location,xdccPackage.filename+options.fileSuffix);
		if(offer.resumepos===0)
		{
			xdccPackage.crc=null;
			try
			{
				fs.unlinkSync(filePath);
			}
			catch (err){}//TODO handle error
		}
		log.info({resumePos:offer.resumepos,size:xdccPackage.progressMax},"connect")
		
		xdccPackage.progressValue=xdccPackage.progressStart=offer.resumepos||0;
		xdccPackage.startTime=new Date();
		xdccPackage.updateTime=null;
		options.update();
		
        var updateInterval;
		var stream = fs.createWriteStream(filePath, {flags: 'a'});
		stream.on("open", function ()
		{

            var send_buffer = new Buffer(4);
            var received = offer.resumepos;
            var ack = offer.resumepos;
            var crcBuilder=new SC.crc.Builder(xdccPackage.crc);
            var finished=false;
			signal.onAbort(function()
			{
				log.info("download aborted");
				finished=true;
			});

            // Open connection to the bot
            var conn = net.connect(offer.port, offer.ip, function ()
            {
                updateInterval = setInterval(function()
                {
                	xdccPackage.progressValue=received;
                	xdccPackage.updateTime=new Date();
                    options.update();
                },options.progressInterval);
				var text="connected";
                log.info(text);
				if(xdccPackage.message.type!=="info") text=xdccPackage.message.text+"\n"+text;
				xdccPackage.message.text=text;
                options.update();
            });

            // Callback for data
            conn.on("data", function (data)
            {
                received += data.length;

                //support for large files
                ack += data.length;
                while (ack > 0xFFFFFFFF)
                {
                    ack -= 0xFFFFFFFF;
                }

                send_buffer.writeUInt32BE(ack, 0);
                conn.write(send_buffer);

                stream.write(data);

                xdccPackage.crc=crcBuilder.add(data).get();
            });

            // Callback for completion
            conn.on("end", function ()
            {
                // End the transfer

                // Close writestream
                stream.end();
                clearInterval(updateInterval);
            	xdccPackage.progressValue=received;
                xdccPackage.crc=crcBuilder.get();

                var text="";
                
                // Connection closed
                if (received == xdccPackage.progressMax)
                {// Download complete
                	log.info("complete");
            		text="CRC: ";
                	var match=offer.filename.match(extractChecksum);
                	if(match)
                	{
                		if(match[1].toUpperCase()===crcBuilder.getFormatted()) text+="OK";
                		else text+="DIFFERENT -> "+crcBuilder.getFormatted();
                	}
                	else
                	{
                		text+=crcBuilder.getFormatted();
                		if (options.appendCRC)
	                	{
	                		var t=path.parse(xdccPackage.filename);
	                		xdccPackage.filename=t.name+" ["+crcBuilder.getFormatted()+"]"+t.ext;
	                	}
                	}
            		if(xdccPackage.message.type!=="info") text=xdccPackage.message.text+"\n"+text;
            		xdccPackage.message.text=text;
    				xdccPackage.state="Done";
                    fs.rename(filePath, path.resolve(xdccPackage.location,xdccPackage.filename));
        			options.update();
        			options.update=µ.constantFunctions.ndef();
                    signal.resolve();
                }
                else
                {
                	if (received != xdccPackage.progressMax && !finished)
	                {// Download incomplete
	                	text="Server unexpected closed connection";
	                }
	                else if (received != xdccPackage.progressMax && finished)
	                {// Download aborted
	                	text="Server closed connection, download canceled";
	                }
                	log.error(text);
            		if(xdccPackage.message.type!=="info") text=xdccPackage.message.text+"\n"+text;
            		xdccPackage.message.text=text;
            		xdccPackage.message.type="error";
    				xdccPackage.state="Failed";
        			options.update();
        			options.update=µ.constantFunctions.ndef();
            		signal.reject(text);
                }

                conn.destroy();
            });

            // Add error handler
            conn.on("error", function (error)
            {
                // Close writestream
                stream.end();
                clearInterval(updateInterval);

                // Send error message
                log.error({error:error},"download failed");
        		if(xdccPackage.message.type!=="info") xdccPackage.message.text+="\n"+error.message;
        		else xdccPackage.message.text=error.message;
        		xdccPackage.message.type="error";
				xdccPackage.state="Failed";
    			options.update();
    			options.update=µ.constantFunctions.ndef();
                signal.reject(error.message);
                // Destroy the connection
                conn.destroy();

            });
        });
        stream.on("error", function (error)
        {
            // Close writestream
            stream.end();
            clearInterval(updateInterval);

            log.error({error:error},"download failed");
    		if(xdccPackage.message.type!=="info") xdccPackage.message.text+="\n"+error.message;
    		else xdccPackage.message.text=error.message;
    		xdccPackage.message.type="error";
			xdccPackage.state="Failed";
			options.update();
			options.update=µ.constantFunctions.ndef();
            signal.reject(error.message);
        });
	};

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);