(function(µ,SMOD,GMOD,HMOD,SC){

	//fun
	µ.logger.info(GMOD("signature"));

	let Form=GMOD("gui.form");
	let request=GMOD("request");
	let checkDB=GMOD("NIWA-Download.checkDbErrors");

	SC=SC({
	    dialog:"gui.Dialog"
	});

	let searchWrapper=document.getElementById("searchWrapper");
	let sourcesWrapper=document.getElementById("sourcesWrapper");

	let searchForm=Form({
	   type:"array",
	   model:{
		   type:"string",
		   pattern:/.+/
	   },
	   default:[""]
	}, undefined,"Search");
	searchForm.id="searchForm";
	let firstInput=searchForm.querySelector("input");
	firstInput.accessKey="f";
	firstInput.title="Accesskey F";
	firstInput.autofocus=true;
	searchWrapper.appendChild(searchForm);

	request.json("rest/config").then(function(data)
	{
		let sourcesConfig={};
		let names=Object.keys(data["search"]["search sources"]).sort((a,b)=>a.toLowerCase()>b.toLowerCase());
		for(let sourceName of names)
		{
			sourcesConfig[sourceName]={
				type:"boolean",
				default:false
			};
		}
		sourcesWrapper.appendChild(Form(sourcesConfig));
	});

	let searchBtn=document.getElementById("searchBtn");
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
		let terms=e.clipboardData.getData("text/plain").split("\n");
		if(terms.length>1)
		{
			requestAnimationFrame(function()
			{
				let input=e.target;
				let container=input.parentNode.parentNode;
				for(let term of terms)
				{
					if(input!=null)
					{
						input.value=term;
						let nextWrapper=input.parentNode.nextElementSibling;
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
	        let data={query:searchForm.getConfig().get()};
	        if(sourcesWrapper.open)
	        {
	        	data.sources=Array.from(sourcesWrapper.querySelectorAll("input:checked")).map(e=>e.name);
	        }
	        document.getElementById("searchFrame").contentWindow.postMessage(data,"*");
	    }
	});


	document.getElementById("configBtn").addEventListener("click",function()
	{
	    new SC.dialog(function(element)
	    {
	    	element.id="configDialog";
	    	element.classList.add("request");
			let closeBtn=document.createElement("button");
			closeBtn.textContent="ok";
			closeBtn.dataset.action="close";
			closeBtn.autofocus=true;
			element.appendChild(closeBtn);
	    	request.json({
	    		method:"OPTIONS",
	    		url:"rest/config"
			}).then(function(data)
			{
				element.classList.remove("request");
				element.insertBefore(Form(data.description,data.value),closeBtn);
				element.addEventListener("formChange",function(event)
				{
					let field=event.target;
					field.disabled=true;
					request.json({
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