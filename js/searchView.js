(function(µ,SMOD,GMOD,HMOD,SC){
	SC=SC({
		tabs:"gui.tabs",
		rq:"request",
		searchResult:"searchResult",
		dlg:"gui.dialog",
		Promise:"Promise",
		TableData:"gui.TableData"
	});

	var dbErrors=SC.rq.json("rest/download/errors")
	.then(function(errors)
	{
		if(errors.length>0) return Promise.reject(errors);
	},
	function(networkError)
	{
		return Promise.reject([{error:networkError}]);
	});
	var errorCheck=function()
	{
		return dbErrors.catch(SC.Promise.pledge(function(signal,errors)
		{
			SC.dlg(function(element)
			{
				element.innerHTML=String.raw
`
<header>the database had some errors:</header>
<div class="actions">
	<button data-action="continue">continue</button>
	<button data-action="abort">abort</button>
</div>
`
				;
				element.appendChild( new SC.TableData(errors,[
					{
						name:"error",
						fn:function(element,error)
						{

							element.textContent=JSON.stringify(error,null,"\t").replace(/(?:[^\\])\\n/g,"\n");
						}
					},
					"file"
				]).getTable()
				);

			},
			{
				modal:true,
				actions:{
					continue:function()
					{
						this.close();
						signal.resolve();
						dbErrors=Promise.resolve();
					},
					abort:function()
					{
						this.close();
						signal.reject();
					}
				}
			}).classList.add("dbError");
		}));
	};

	var tabs=SC.tabs([]);
	document.body.appendChild(tabs);
	window.addEventListener("message", function(event)
	{
		errorCheck().then(function()
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
				var searchResult=SC.searchResult(container,data);
				container.dataset.state="done";
			},
			function(error)
			{
				SC.dlg(error.response||error.error);
			});
		});
	},false);

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);