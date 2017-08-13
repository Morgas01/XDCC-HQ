(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		action:"gui.actionize",
		downloadTable:"NIWA-Download.DownloadTable",
		DBObj:"DBObj",
		XDCCdownload:"XDCCdownload",
		rq:"request",
		checkDB:"NIWA-Download.checkDbErrors",
		dialog:"gui.dialog",
		stree:"gui.selectionTree",
		form:"gui.form"
	});

	var actions=document.getElementById("actions");
	var stats=document.getElementById("stats");
	var downloads=document.getElementById("downloads");

	var networkError=function(error)
	{
		if(error==="cancel") return; // downloadTable dialogs
		µ.logger.error(error);
		var content;
		try
		{
			error=JSON.parse(error.response);
			content=String.raw`<div>${error.name}</div><div>${error.message}</div><div>${error.stack}</div><button data-action="close">OK</button>`;
		}
		catch (e)
		{
			content=(error.response||error)+`<button data-action="close">OK</button>`;
		}
		SC.dialog(content,{modal:true}).classList.add("networkError");
	};

	requestAnimationFrame(()=>
	{ // all scripts executed
		SC.checkDB()
		.then(function()
		{

			SC.action({
				autoTrigger:function(event,target)
				{
					var nextState=target.dataset.state!=="true"
					downloadTable.autoTrigger(nextState)
					.then(function()
					{
						target.dataset.state=nextState;
					},networkError);
				},
				enable:function()
				{
					downloadTable.enableSelected()
					.catch(networkError);
				},
				disable:function()
				{
					downloadTable.disableSelected()
					.catch(networkError);
				},
				reset:function()
				{
					downloadTable.resetSelected()
					.catch(networkError);
				},
				remove:function()
				{
					downloadTable.removeSelected()
					.catch(networkError);
				},
				removeDone:function()
				{
					SC.rq({
						url:"rest/downloads/deleteByState",
						data:JSON.stringify("DONE"),
						method:"DELETE"
					})
					.catch(networkError);
				},
				removeDisabled:function()
				{
					SC.rq({
						url:"rest/downloads/deleteByState",
						data:JSON.stringify("DISABLED"),
						method:"DELETE"
					})
					.catch(networkError);
				},
				removeError:function()
				{
					SC.rq({
						url:"rest/downloads/deleteByState",
						data:JSON.stringify("FAILED"),
						method:"DELETE"
					})
					.catch(networkError);
				},
				listFilenames:function()
				{
					var items=downloadTable.getSelected();
					//TODO
				},
				createPackage:function()
				{
					SC.dialog(String.raw
	`
	<label>
		<span>Package name</span>
		<input type="text" required autofocus/>
	</label>
	<div>
		<button data-action="ok">OK</button>
		<button data-action="close">cancel</button>
	</div>
	`
					,{
						modal:true,
						actions:{
							ok:function()
							{
								var input=this.querySelector("input");
								if(input&&input.validity.valid)
								{
									this.close();
									downloadTable.createPackage(input.value,downloadTable.getSelected(),"Package")
									.catch(networkError);
								}
							}
						}
					});
				},
				addDownload:function(){},
				moveTo:function()
				{
					downloadTable.moveSelected().catch(networkError);
				},
				sort:function()
				{
					downloadTable.sortSelected().catch(networkError);
				}
			},actions);
		});

		var columns=Object.keys(SC.downloadTable.baseColumns).concat([
			function sources(cell,data)
			{
				if(data instanceof SC.XDCCdownload)
				{
					cell.innerHTML='<span>'+data.sources.map(s=>s.user+"@"+s.network).join(" ")+'</span>';
					cell.dataset.title=data.sources.map(s=>s.network+"/"+s.channel+" - "+s.user+":"+s.packnumber+" ("+s.subOffices+")").join("\n");
				}
			}
		]);
		var downloadTable=new SC.downloadTable(columns,{
			DBClasses:[SC.XDCCdownload]
		});
		downloads.appendChild(downloadTable.element);

		SC.rq.json("rest/downloads/autoTrigger")
		.then(function(triggerState)
		{
			var button=document.getElementById("autoTrigger");
			button.dataset.state=triggerState;
			button.disabled=false;
		})
	});

	document.getElementById("configBtn").addEventListener("click",function()
	{
		SC.dialog(function(element)
		{
			element.id="configDialog";
			element.classList.add("request");
			var closeBtn=document.createElement("button");
			closeBtn.textContent="ok";
			closeBtn.dataset.action="close";
			closeBtn.autofocus=true;
			element.appendChild(closeBtn);
			SC.rq.json({
				method:"OPTIONS",
				url:"rest/config/download"
			}).then(function(data)
			{
				element.classList.remove("request");
				element.insertBefore(SC.form(data.description,data.value,undefined,"download"),closeBtn);
				element.addEventListener("formChange",function(event)
				{
					var field=event.target;
					field.disabled=true;
					SC.rq.json({
						url:"rest/config",
						data:JSON.stringify({
							path:event.detail.path.concat(event.detail.key),
							value:event.detail.value
						})
					})
					.then(function(reply)
					{
						if(!reply.result)
						{
							field.setCustomValidity(reply.error);
						}
					})
					.always(()=>
					event.target.disabled=false);
				});
			});
		},{modal:true});
	});

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);