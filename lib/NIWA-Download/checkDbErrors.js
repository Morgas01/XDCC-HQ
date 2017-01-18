(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		rq:"request",
		dlg:"gui.dialog",
		TableData:"gui.TableData",
		Promise:"Promise"
	});

	var cache=null;

	SMOD("checkDbErrors",function checkDbErrors(noCache)
	{
		if(cache==null||noCache)
		{
			cache=SC.rq.json("rest/downloads/manager/errors")
			.then(function(errors)
			{
				if(errors.length>0) return Promise.reject(errors);
			},
			function(networkError)
			{
				return Promise.reject([{error:networkError}]);
			});
		}

		return cache.catch(SC.Promise.pledge(function(signal,errors)
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
	});

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);