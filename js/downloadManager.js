(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		action:"gui.actionize",
		downloadTable:"downloadTable",
		DBObj:"DBObj",
		Download:"Download",
		XDCCdownload:"XDCCdownload",
		rq:"request",
		checkDB:"checkDbErrors",
		dlg:"gui.dialog",
		stree:"gui.selectionTree"
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
		SC.dlg(content,{modal:true}).classList.add("networkError");
	};

	SC.checkDB()
	.then(function()
	{

		SC.action({
			enable:function()
			{
				downloadTable.enable(downloadTable.getTable().getSelected())
				.catch(networkError);
			},
			disable:function()
			{
				downloadTable.disable(downloadTable.getTable().getSelected())
				.catch(networkError);
			},
			remove:function()
			{
				downloadTable.delete(downloadTable.getTable().getSelected())
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
				var items=downloadTable.getTable().getSelected();

			},
			createPackage:function()
			{
				SC.dlg(String.raw
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
								downloadTable.createPackage(input.value,downloadTable.getTable().getSelected(),"Package")
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

	var downloadTable=SC.downloadTable(SC.downloadTable.baseColumns.concat([
		function sources(cell,data)
		{
			if(data instanceof SC.XDCCdownload)
			{
				cell.innerHTML='<span>'+data.sources.map(s=>s.bot+"@"+s.network).join(" ")+'</span>';
				cell.dataset.title=data.sources.map(s=>s.network+"/"+s.channel+" - "+s.bot+":"+s.packnumber+" ("+s.subOffices+")").join("\n");
			}
		}
	]),{
		apiPath:"rest/downloads/manager",
		DBClasses:[SC.XDCCdownload]
	});
	downloads.appendChild(downloadTable.getContainer());

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);