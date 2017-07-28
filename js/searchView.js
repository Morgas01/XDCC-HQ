(function(µ,SMOD,GMOD,HMOD,SC){

	var IDBConn=GMOD("IDBConn");

	SC=SC({
		tabs:"gui.tabs",
		rq:"request",
		searchResult:"searchResult",
		dlg:"gui.dialog",
		Promise:"Promise",
		TableData:"gui.TableData",
		checkDB:"checkDbErrors"
	});

	var STORAGE_NAME="XDCC search history";
	var searchHistory={};

	var tabs=SC.tabs([]);
	document.body.appendChild(tabs);
	window.addEventListener("message", function(event)
	{
		SC.checkDB(undefined,true).then(function()
		{
			var container=null;
			tabs.addTab(e=>e.innerHTML=String.raw
`
<span>${event.data.query}</span>
<botton data-action="closeTab">&#10060;</button>
`
			,
			e=>container=e,true);

			container.dataset.state="request";
			SC.rq.json({
				urls:["rest/search"],
				data:JSON.stringify(event.data)
			})
			.then(function(data)
			{
				container.dataset.state="response";
				requestAnimationFrame(()=>
				{
					var searchResult=SC.searchResult(container,data);
					container.dataset.state="done";
				});
			},
			function(error)
			{
				µ.logger.error(error);
				SC.dlg(JSON.stringify(error.response||error.error||error),{modal:true,target:container});
			});
		});
	},false);


	try
	{
		if(STORAGE_NAME in sessionStorage)
		searchHistory=JSON.parse(sessionStorage.getItem(STORAGE_NAME));
	}
	catch (e)
	{
		console.error("sessionStorage not available",e)
	}

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);