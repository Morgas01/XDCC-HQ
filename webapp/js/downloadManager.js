(function(µ,SMOD,GMOD,HMOD,SC){
	
	var ORG=GMOD("Organizer");
	SC=SC({
		adopt:"adopt",
		gp:"goPath",
		rq:"request",
		xp:"XDCCPackage"
	});
	
	var org=new ORG()
	.map("ID","ID");

	var pauseBtn=document.querySelector("[data-action=pause]");
	var updatePuseBtn=function(pause)
	{
		if(pause) pauseBtn.textContent=pauseBtn.dataset.value="continue";
		else pauseBtn.textContent=pauseBtn.dataset.value="pause";
	};
	var controlActions={
		pause:function(e)
		{
			SC.rq("rest/download/pause?action="+pauseBtn.dataset.value).always(function(result)
			{
				if(result!="ok") openDialog('<div>'+result+'</div>');
			});
		},
		removeDone:function()
		{
			SC.rq("rest/download/removeDone").always(function(result)
			{
				if(result!="ok") openDialog('<div>'+result+'</div>');
			});
		},
		listFilenames:function()
		{
			openDialog('<textArea rows="26" cols="100">'+org.getValues().map(p=>p.name).join("\n")+'</textArea>')
		}
	};
	document.getElementById("control").addEventListener("click",function(e)
	{
		if(e.target.dataset.action in controlActions)
		{
			controlActions[e.target.dataset.action](e);
		}
	});

	var downloadsContainer=document.getElementById("downloads");
	downloadsContainer.addEventListener("click",function(e)
	{
		var action=e.target.dataset.action;
		if(action)
		{
			var downloadID=e.target.parentNode.parentNode.parentNode.dataset.downloadId;
			SC.rq("rest/download/"+action+"?ID="+downloadID).always(function(result)
			{
				if(result!="ok") openDialog('<div>'+result+'</div>');
			});
		}
	});
	downloadsContainer.addEventListener("dragstart",function(e)
	{
		e.dataTransfer.setData('text/plain',e.target.dataset.downloadId);
		e.dataTransfer.effectAllowed="move";
		e.target.style.opacity=0.5;
	});
	downloadsContainer.addEventListener("dragenter",function(e)
	{
		var target=e.target;
		while(target!=downloadsContainer&&target.parentNode!=downloadsContainer) target=target.parentNode;
		if(e.dataTransfer.getData("text/plain")!=target.dataset.downloadId)
		{
			target.counter=target.counter||0;
			target.counter++
			target.classList.add("dragover");
		}
	});
	downloadsContainer.addEventListener("dragover",function(e)
	{
		var target=e.target;
		while(target!=downloadsContainer&&target.parentNode!=downloadsContainer) target=target.parentNode;
		if(e.dataTransfer.getData("text/plain")!=target.dataset.downloadId)
		{
			e.preventDefault();
		}
	});
	downloadsContainer.addEventListener("dragleave",function(e)
	{
		var target=e.target;
		while(target!=downloadsContainer&&target.parentNode!=downloadsContainer) target=target.parentNode;
		if(e.dataTransfer.getData("text/plain")!=target.dataset.downloadId)
		{
			if(--target.counter==0) target.classList.remove("dragover");
		}
	});
	downloadsContainer.addEventListener("dragend",function(e)
	{
		e.target.style.opacity=null;
	});
	downloadsContainer.addEventListener("drop",function(e)
	{
		e.preventDefault();
		var target=e.target;
		while(target!=downloadsContainer&&target.parentNode!=downloadsContainer) target=target.parentNode;
		SC.rq({
			url:"rest/download/setOrder",
			data:JSON.stringify({
				ID:parseInt(e.dataTransfer.getData("text/plain"),10),
				beforeID:parseInt(target.dataset.downloadId,10)
			})
		});
		target.classList.remove("dragover");
		//Array.prototype.forEach.call(downloadsContainer.querySelectorAll(".dragover"),e=>e.classList.remove("dragover"));
	});
	

	var onAdd=function(download)
	{
		//TODO check for data.id in org
		download=new SC.xp().fromJSON(download);
		org.add([download]);
		downloadsContainer.appendChild(download.getDom().element);
	};
	var parseFileSize=function(size)
	{
		return parseFloat(size.replace(/kb?/i,"e3").replace(/mb?/i,"e6").replace(/gb?/i,"e9").replace(/tb?/i,"e12"))||0;
	}
	var formatFileSize=function(size)
	{
		if(size>1e12) return (size/1e12).toFixed(1)+"T";
		else if(size>1e9) return (size/1e9).toFixed(1)+"G";
		else if(size>1e6) return (size/1e6).toFixed(1)+"M";
		else if(size>1e3) return (size/1e3).toFixed(1)+"K";
		else return size+"B";
	}
	var updateStats=function()
	{
		var downloads={total:org.values.length,done:0,pending:0}, fileSize={total:0,done:0};
		for(var d of org.values)
		{
			if(d.state===SC.xp.states.DONE) downloads.done++;
			if(d.state===SC.xp.states.PENDING) downloads.pending++;
			
			if(d.progressMax)
			{
				fileSize.total+=d.progressMax;
				fileSize.done+=d.progressValue;
			}
			else fileSize.total+=parseFileSize(d.size);
		}
		document.getElementById("downloadCount").innerHTML=downloads.done+"/"+downloads.total+" ("+downloads.pending+")";
		document.getElementById("fileSize").innerHTML=formatFileSize(fileSize.done)+"/"+formatFileSize(fileSize.total)+" ("+formatFileSize(fileSize.total-fileSize.done)+")";
	};
	var es=new EventSource("rest/download/get");
	es.addEventListener("error",µ.logger.error);
	es.addEventListener("ping",µ.logger.debug);
	
	es.addEventListener("list",function onList (listEvent)
	{
		for(var d of org.values) d.dom.element.remove();
		org.clear();
		for(var d of JSON.parse(listEvent.data)) onAdd(d);
		updateStats();
	});
	es.addEventListener("add",function(addEvent)
	{
		var data=JSON.parse(addEvent.data)
		µ.logger.info("add",data.ID);
		onAdd(data);
		updateStats();
	});
	es.addEventListener("update",function(updateEvent)
	{
		var data=JSON.parse(updateEvent.data);
		µ.logger.info("update",data.ID);
		var original=org.getMap("ID")[data.ID];
		if(!original) onAdd(data)
		else
		{
			original.update(data);
			org.update([original]);
		}
		updateStats();
	});
	es.addEventListener("remove",function(removeEvent)
	{
		var data=JSON.parse(removeEvent.data);
		µ.logger.info("remove",data);
		var idMap=org.getMap("ID");
		for(var id of data)
		{
			var original=idMap[id];
			if(!original)µ.logger.error("could not find original")
			else
			{
				org.remove([original])
				original.dom.element.remove();
				updateStats();
			}
		}
	});
	es.addEventListener("pause",function(pauseEvent)
	{
		updatePuseBtn(JSON.parse(pauseEvent.data));
	});
	window.addEventListener("beforeunload",function(){es.close()})
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);