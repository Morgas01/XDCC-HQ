(function(µ,SMOD,GMOD,HMOD,SC){
	
	var ORG=GMOD("Organizer");
	SC=SC({
		adopt:"adopt",
		gp:"goPath",
		rq:"request",
		xp:"XDCCPackage",
		gIn:"getInputValues",
		Prog:"Progress",
		config:"config"
	});
	
	var script=document.currentScript;
		
	var container=document.createElement("div");
	container.id="downloadView";
	script.parentNode.insertBefore(container,script.nextSibling);
	container.innerHTML='\
		<div class="control">\
		<button data-action="pause">???</button>\
		<button data-action="removeDone">remove completed downloads</button>\
		<button data-action="removeDisabled">remove disabled downloads</button>\
		<button data-action="addDownload">add download</button>\
		<button data-action="listFilenames">list filenames</button>\
		<select class="activeStyle"></select>\
	</div>\
	<div class="stats">\
		<div>\
			<span>Downloads:</span>\
			<span class="downloadCount">???</span>\
		</div>\
		<div>\
			<span>File size:</span>\
			<span class="fileSize">???</span>\
		</div>\
	</div>\
	<div class="downloads"></div>\
	';
	
	var org=new ORG()
	.map("ID","ID").
	sort("orderIndex",ORG.attributeSort(["orderIndex"]))
	.group("state","state");

//********** Control **********
	
	var pauseBtn=container.querySelector("[data-action=pause]");
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
		removeDisabled:function()
		{
			SC.rq("rest/download/removeDisabled").always(function(result)
			{
				if(result!="ok") openDialog('<div>'+result+'</div>');
			});
		},
		addDownload:function()
		{
			var dialog=openDialog('\
			<form>\
				<table>\
					<tr>\
						<td>Network</td>\
						<td><input name="network" required type="text"></td>\
					</tr>\
					<tr>\
						<td>Channel</td>\
						<td><input name="channel" required type="text" pattern="[#&][^ ,A-Z]+"></td>\
						<td>/[#&amp;][^ ,A-Z]+/</td>\
					</tr>\
					<tr>\
						<td>Bot</td>\
						<td><input name="bot" required type="text"></td>\
					</tr>\
					<tr>\
						<td>packnumber</td>\
						<td><input name="packnumber" required type="number"></td>\
					</tr>\
					<tr>\
						<td>to packnumber</td>\
						<td><input name="toPacknumber" type="number"></td>\
					</tr>\
			</form>\
			');
			var okBtn=document.createElement("button");
			dialog.firstElementChild.insertBefore(okBtn,dialog.firstElementChild.lastElementChild);
			okBtn.textContent="ok";
			okBtn.addEventListener("click",()=>
			{
				if(okBtn.disabled==false)
				{
					okBtn.disabled=true;
					var form=dialog.querySelector("form");
					if(form.checkValidity())
					{
						var data=SC.gIn(form.querySelectorAll("input"),null,true);
						data.toPacknumber=Math.max(data.packnumber,data.toPacknumber);
						var packages=[];
						for(var i=data.packnumber;i<=data.toPacknumber;i++)
						{
							packages.push(new SC.xp({
								network:data.network,
								channel:data.channel,
								bot:data.bot,
								packnumber:i
							}));
						}
						SC.rq({
							urls:["rest/download/add"],
							contentType:"application/json",
							data:JSON.stringify(packages)
						}).then(function(){
							dialog.remove();
							openDialog('<div>successfully added packaged to download queue</div>');
						},
						function(e)
						{
							µ.logger.error(e);
							okBtn.disabled=false;
							//TODO error message
						});
					}
				}
			});
		},
		listFilenames:function()
		{
			openDialog('<textArea rows="26" cols="100">'+org.getSort("orderIndex").map(p=>p.name).join("\n")+'</textArea>')
		}
	};
	container.querySelector(".control").addEventListener("click",function(e)
	{
		if(e.target.dataset.action in controlActions)
		{
			controlActions[e.target.dataset.action](e);
		}
	});
	
	var activeStyle=container.querySelector(".activeStyle");
	activeStyle.innerHTML=Array.prototype.map.call(document.querySelectorAll("link[title]"),l=>'<option value="'+l.title+'">'+l.title+'</option>').join("\n");
	try
	{
		activeStyle.value=localStorage.getItem("activeStyle")||document.selectedStyleSheetSet;
		if(activeStyle.value!=document.selectedStyleSheetSet)
			document.selectedStyleSheetSet=activeStyle.value;
	}
	catch(e)
	{
		µ.logger.info("localStorage not available");
		activeStyle.value=document.selectedStyleSheetSet;
	}
	activeStyle.addEventListener("change",function()
	{
		document.selectedStyleSheetSet=this.value;
		try {localStorage.setItem("activeStyle",this.value);}catch(e){}
	},false);

//********** Downloads **********	
	
//***** actions *****
	
	var downloadsContainer=container.querySelector(".downloads");
	downloadsContainer.addEventListener("click",function(e)
	{
		var action=e.target.dataset.action;
		if(action)
		{
			var downloadID=e.target.parentNode.parentNode.dataset.downloadId;
			e.target.disabled=true;
			SC.rq("rest/download/"+action+"?ID="+downloadID).always(function(result)
			{
				if(result!="ok") openDialog('<div>'+result+'</div>');
				e.target.disabled=false;
			});
		}
	});
	
//***** Drag&Drop *****
	
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
	
//***** data *****
	
	var progress=null;
	
	var onAdd=function(download)
	{
		//TODO check for data.id in org
		download=new SC.xp().fromJSON(download);
		if(progress) download.setProgressCallback(progress.get());
		org.add([download]);
		downloadsContainer.appendChild(download.getDom().element);
	};
	var parseFileSize=function(size)
	{
		return parseFloat(size&&size.replace(/kb?/i,"e3").replace(/mb?/i,"e6").replace(/gb?/i,"e9").replace(/tb?/i,"e12"))||0;
	}
	var formatFileSize=function(size)
	{
		if(size>1e12) return (size/1e12).toFixed(1)+"T";
		else if(size>1e9) return (size/1e9).toFixed(1)+"G";
		else if(size>1e6) return (size/1e6).toFixed(1)+"M";
		else if(size>1e3) return (size/1e3).toFixed(1)+"K";
		else if (!size) return 0;
		else return size+"B";
	}
	var updateStats=function()
	{
		var values=org.getValues();
		var downloads={total:0,done:0,pending:0}, fileSize={total:0,done:0};
		for(var d of values)
		{
			if(d.state===SC.xp.states.DONE) downloads.done++;
			else if(d.state===SC.xp.states.PENDING) downloads.pending++;
			else continue;
			
			downloads.total++;
			if(d.progressMax)
			{
				fileSize.total+=d.progressMax;
				fileSize.done+=d.progressValue;
			}
			else fileSize.total+=parseFileSize(d.size);
		}
		var downloadCount=downloads.done+"/"+downloads.total+" ("+downloads.pending+")";
		container.querySelector(".downloadCount").innerHTML=downloadCount;
		var fileSize=formatFileSize(fileSize.done)+"/"+formatFileSize(fileSize.total)+" ("+formatFileSize(fileSize.total-fileSize.done)+")";
		container.querySelector(".fileSize").innerHTML=fileSize;
		
		if(script.dataset.downloadCount) for(var n of document.querySelectorAll(script.dataset.downloadCount)) n.innerHTML=downloadCount;
		if(script.dataset.fileSize) for(var n of document.querySelectorAll(script.dataset.fileSize)) n.innerHTML=fileSize;
	};
	
	if(script.dataset.progress)
	{
		progress=new SC.Prog({normalize:true});
		for(var e of document.querySelectorAll(script.dataset.progress))
		{
			var p=document.createElement("progress");
			e.appendChild(p);
			progress.add(p);
		}
	}
	
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
		if(!original) onAdd(data);
		else
		{
			var doneNotification=null;
			if(data.state!=original.state)
			{
				switch (data.state)
				{
					case "Done":
						doneNotification=SC.config.notify("download_complete","download complete",data.name)||true;
						break;
					case "Failed":
						SC.config.notify("download_error","download failed",data.name);
						break;
				}
			}
			if(data.message.type!=original.message.type)
			{
				switch(data.message.type)
				{
					case "warning":
						SC.config.notify("download_warning","warning",data.message.text);
						break;
					case "error":
						SC.config.notify("download_warning","error",data.message.text);
						break;
				}
			}
			original.update(data);
			org.update([original]);
			if(doneNotification)
			{
				var states=org.getGroup("state");
				if((!states.Running||states.Running.values.length==0)
					&& (pauseBtn.dataset.value=="continue"||!states.Pending||states.Pending.values.length==0))
				{
					var show=()=>SC.config.notify("download_allComplete"," all downloads complete");
					if(doneNotification===true) show();
					else doneNotification.onshow=show;
				}
			}
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
				if(progress)progress.remove(original.getProgressCallback());
			}
		}
		updateStats();
	});
	es.addEventListener("pause",function(pauseEvent)
	{
		updatePuseBtn(JSON.parse(pauseEvent.data));
	});
	window.addEventListener("beforeunload",function(){es.close()})
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);