(function(µ,SMOD,GMOD,HMOD,SC){

	let Tabs=GMOD("gui.tabs");
	let actionize=GMOD("gui.actionize");

	SC=SC({
		rq:"request",
		SearchResult:"SearchResult",
		dlg:"gui.Dialog",
		checkDB:"NIWA-Download.checkDbErrors"
	});

	let STORAGE_NAME="XDCC search history";
	let searchHistory={};

	let tabs=Tabs([]);
	document.body.appendChild(tabs);
	window.addEventListener("message", function(event)
	{
		SC.checkDB(undefined,true).then(function()
		{
			let container=null;
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

				searchHistory[event.data.query+""]=data;
				try{sessionStorage.setItem(STORAGE_NAME,JSON.stringify(searchHistory))}catch(e){}

				let searchResult=new SC.SearchResult();
				container.appendChild(searchResult.element)
				requestAnimationFrame(()=>requestAnimationFrame(()=>//double requestAnimationFrame to wait for render
				{
					searchResult.setData(data);
					container.dataset.state="done";
				}));
			},
			function(error)
			{
				µ.logger.error(error);
				new SC.dlg(JSON.stringify(error.response||error.error||error),{modal:true,target:container});
			});
		});
	},false);


	try
	{
		if(STORAGE_NAME in sessionStorage)
		searchHistory=JSON.parse(sessionStorage.getItem(STORAGE_NAME));
		tabs.addTab(e=>e.innerHTML=String.raw`<span title="old queries">&#128465;</span>`,
		function(oldQueriesContent)
		{
			oldQueriesContent.classList.add("oldQueries");
			oldQueriesContent.innerHTML=Object.entries(searchHistory).map(([name,data])=>String.raw`<button title="${data.results.length+"results"}" data-action="reopen" data-name="${name}">${name}</span>`);
			actionize({
				reopen:function(event,target)
				{
					let name=target.dataset.name;
					tabs.addTab(e=>e.innerHTML=String.raw
`
<span>${name}</span>
<botton data-action="closeTab">&#10060;</button>
`
					,
					function(container)
					{
						container.dataset.state="response";
						let searchResult=new SC.SearchResult();
						container.appendChild(searchResult.element);
						requestAnimationFrame(()=>requestAnimationFrame(()=>//double requestAnimationFrame to wait for render
						{
								searchResult.setData(searchHistory[name]);
								container.dataset.state="done";
						}));
					},true);
				}
			},oldQueriesContent)
		});
	}
	catch (e)
	{
		console.error("sessionStorage not available",e)
	}

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);