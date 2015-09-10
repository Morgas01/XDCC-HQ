(function(µ,SMOD,GMOD,HMOD,SC){
	
	SC=SC({
		adopt:"adopt",
		gp:"goPath",
		org:"Organizer",
		rq:"request"
	});
	
	var pauseBtn=document.getElementById("pause");
	var updatePuseBtn=function(pause)
	{
		if(pause) pauseBtn.textContent=pauseBtn.dataset.action="continue";
		else pauseBtn.textContent=pauseBtn.dataset.action="pause";
	};
	pauseBtn.addEventListener("click",function()
	{
		SC.rq.json("rest/download/pause?action="+pauseBtn.dataset.action);
	});
	SC.rq.json("rest/download/pause").then(updatePuseBtn,µ.logger.error);
	
	var getTimeString=function(ms)
	{
		var time=new Date(ms);
		return ("0"+time.getUTCHours()).slice(-2)+":"+("0"+time.getUTCMinutes()).slice(-2)+":"+("0"+time.getUTCSeconds()).slice(-2)
	}
	
	var createDownloadDom=function(download)
	{
		download.dom={element:document.createElement("fieldset")};
		download.dom.element.classList.add("download")
		download.dom.element.title=download.dom.element.dataset.state=download.state
		download.dom.element.innerHTML=
'\
<legend>'+download.name+'</legend>\
	<div>\
		<progress value="0" max="1"></progress>\
		<span class="speed"></span>\
		<span class="remaining"></span>\
	</div>\
<span class="location"></span>\
<span class="message"></span>\
';
		download.dom.progress  = download.dom.element.querySelector("progress");
		if(download.progress)
		{
			download.dom.progress.value       = download.progress[0];
			download.dom.progress.max         = download.progress[1];
		}
		download.dom.speed     = download.dom.element.querySelector(".speed");
		download.dom.remaining = download.dom.element.querySelector(".remaining");
		download.dom.location  = download.dom.element.querySelector(".location");
		if(download.location) download.dom.location.textContent = download.location;
		download.dom.message   = download.dom.element.querySelector(".message");
		if(download.msg)
		{
			download.dom.message.dataset.type = download.msg.type;
			download.dom.message.textContent  = download.msg.text;
		}
		return download.dom.element;
	}
	var updateDownloadDom=function(download)
	{
		download.dom.element.title=download.dom.element.dataset.state=download.state;
		if(download.lastUpdateTime)
		{
			var averageSpeed=download.progress[0]/(download.updateTime-download.startTime);
			var lastSpeed=(download.progress[0]-download.dom.progress.value)/(download.updateTime-download.lastUpdateTime);
			download.dom.speed.textContent=averageSpeed.toFixed(0)+" kb/s ( "+(isFinite(lastSpeed)?lastSpeed.toFixed(0):0)+" kb/s )";
			
			var averageRemaining=(download.progress[1]-download.progress[0])/averageSpeed;
			var lastRemaining=(download.progress[1]-download.progress[0])/lastSpeed;
			download.dom.remaining.textContent=getTimeString(averageRemaining)+" ( "+(isFinite(lastSpeed)?getTimeString(lastRemaining):"--:--:--")+" )"
		}
		download.dom.progress.value       = download.progress[0];
		download.dom.progress.max         = download.progress[1];
		download.dom.message.dataset.type = download.msg.type;
		download.dom.location.textContent = download.location;
		download.dom.message.dataset.type = download.msg.type;
		download.dom.message.textContent  = download.msg.text;
	}
	
	var es=new EventSource("rest/download/get");
	es.addEventListener("error",µ.logger.error);
	
	es.addEventListener("list",function onList (listEvent)
	{
		es.removeEventListener("list", onList);
		
		var org=new SC.org()
		.map("id",SC.gp.guide("id"));
		
		var onAdd=function(download)
		{
			//TODO check for data.id in org
			org.add([download]);
			document.body.appendChild(createDownloadDom(download))
		};
		
		for(var d of JSON.parse(listEvent.data)) onAdd(d);
		
		es.addEventListener("add",function(addEvent)
		{
			var data=JSON.parse(addEvent.data)
			µ.logger.info("add",data.id);
			onAdd(data);
		});
		
		es.addEventListener("update",function(updateEvent)
		{
			var data=JSON.parse(updateEvent.data);
			µ.logger.info("update",data.id);
			var original=org.getMap("id")[data.id];
			if(!original)
			{
				original=data;
				onAdd(original)
			}
			else
			{
				original.lastUpdateTime=original.updateTime;
				SC.adopt(original,data,true);
			}
			updateDownloadDom(original);
		});
		
		es.addEventListener("remove",function(removeEvent)
		{
			var data=JSON.parse(removeEvent.data);
			µ.logger.info("remove",data.id);
			var original=org.getMap("id")[data.id];
			if(!original)µ.logger.error("could not find original")
			else
			{
				org.remove([original])
				original.dom.element.remove();
			}
		});
		
		es.addEventListener("pause",function(pauseEvent)
		{
			updatePuseBtn(JSON.parse(pauseEvent.data));
		})
	});

	window.addEventListener("beforeunload",function(){es.close()})
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);