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
	let searchHistory=[];

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
				if(data.results.length>0)
				{
					searchHistory.unshift({query:event.data.query,data:data});
					searchHistory.length=Math.min(searchHistory.length,10);
					try{localStorage.setItem(STORAGE_NAME,JSON.stringify(searchHistory))}catch(e){}
				}

				let searchResult=new SC.SearchResult();
				container.appendChild(searchResult.element)
				requestAnimationFrame(()=>requestAnimationFrame(()=>//double requestAnimationFrame to wait for render
				{
					searchResult.setData(data);
					container.dataset.state="done";
				}));
			})
			.catch(function(error)
			{
				µ.logger.error(error);
				new SC.dlg(JSON.stringify(error.response||error.error||error),{modal:true,target:container});
			});
		});
	},false);


	try
	{
		if(STORAGE_NAME in localStorage)
		searchHistory=JSON.parse(localStorage.getItem(STORAGE_NAME));
		tabs.addTab(e=>e.innerHTML=String.raw`<span title="old queries">&#128340;</span>`,
		function(oldQueriesContent)
		{
			oldQueriesContent.classList.add("oldQueries");
			oldQueriesContent.innerHTML=searchHistory.map(({query,data},index)=>String.raw`<button title="${data.results.length+" results"}" data-action="reopen" data-index="${index}">${query.join("\n")}</span>`).join("");
			actionize({
				reopen:function(event,target)
				{
					let index=target.dataset.index;
					let search=searchHistory[index];
					tabs.addTab(e=>e.innerHTML=String.raw
`
<span>${search.query}</span>
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
								searchResult.setData(search.data);
								container.dataset.state="done";
						}));
					},true);
				}
			},oldQueriesContent);
		});
	}
	catch (e)
	{
		console.error("localStorage not available",e)
	}

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);