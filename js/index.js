(function(µ,SMOD,GMOD,HMOD,SC){

	var Form=GMOD("gui.form");
	var request=GMOD("request");
	var checkDB=GMOD("checkDbErrors");

	var SC=SC({
	    dialog:"gui.dialog"
	});

	var searchWrapper=document.getElementById("searchWrapper");

	var searchForm=Form({
	   type:"array",
	   model:{
		   type:"string",
		   pattern:/.+/
	   },
	   default:[""]
	}, undefined,"Search");
	searchForm.id="searchForm";
	var firstInput=searchForm.querySelector("input")
	firstInput.accessKey="f";
	firstInput.title="Accesskey F";
	firstInput.autofocus=true;
	searchWrapper.appendChild(searchForm);

	var searchSources;
	request.json("rest/config").then(function(data)
	{
		var sourcesConfig={};
		var names=Object.keys(data["search"]["search sources"]).sort((a,b)=>a.toLowerCase()>b.toLowerCase());
		for(var sourceName of names)
		{
			sourcesConfig[sourceName]={
				type:"boolean",
				default:false
			};
		}
		searchSources=Form(sourcesConfig,undefined,"Sources");
		searchSources.id="searchSources";
		searchSources.classList.add("hidden");
		searchWrapper.appendChild(searchSources);
		searchSources.firstElementChild.addEventListener("click",function()
		{
			searchSources.classList.toggle("hidden")
		})
	});

	var searchBtn=document.getElementById("searchBtn");
	searchForm.addEventListener("keydown",function(e)
	{
		if(e.key=="Enter")
		{
			searchBtn.focus();
			//searchBtn.click();
		}
	});
	searchForm.addEventListener("formAdd",function(e)
	{
		e.detail.element.querySelector("input").focus();
	});
	searchForm.addEventListener("paste",function(e){
		var terms=e.clipboardData.getData("text/plain").split("\n");
		if(terms.length>1)
		{
			requestAnimationFrame(function()
			{
				var input=e.target;
				var container=input.parentNode.parentNode;
				for(var term of terms)
				{
					if(input!=null)
					{
						input.value=term;
						var nextWrapper=input.parentNode.nextElementSibling;
						if(nextWrapper) input=nextWrapper.children[1];
						else input=null;
					}
					else container.addField(term);
				}
			});
		}
	})
	searchBtn.addEventListener("click",function()
	{
	    if(searchForm.isValid())
	    {
	        var data={query:searchForm.getConfig().get()};
	        if(!searchSources.classList.contains("hidden"))
	        {
	        	data.sources=Array.from(searchSources.querySelectorAll("input:checked")).map(e=>e.name);
	        }
	        document.getElementById("searchFrame").contentWindow.postMessage(data,"*");
	    }
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
	    		url:"rest/config"
			}).then(function(data)
			{
				element.classList.remove("request");
				element.insertBefore(Form(data.description,data.value),closeBtn);
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

	checkDB();
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);