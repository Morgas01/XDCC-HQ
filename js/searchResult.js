(function(µ,SMOD,GMOD,HMOD,SC){

	var goPath=GMOD("goPath");

	SC=SC({
		TableData:"gui.TableData",
		selectionTable:"gui.selectionTable",
		form:"gui.form",
		action:"gui.actionize",
		org:"Organizer",
		dlg:"gui.dialog",
		fuzzy:"fuzzySearch",
		XDCCdownload:"Download",
		rq:"request",
		menu:"gui.menu"
	});

	var helper=document.createDocumentFragment();

	var filterGroups={
		subber:p=>
		{
			var m=p.name.match(/^\[([^\]]+)/);
			if(m)return m[1];
			return "no subber found";
		},
		bot:p=>p.sources.map(s=>s.user),
		resolution: p=>
		{
			var m=p.name.match(/(\d+x(\d+)|(\d+)p)/);
			if (m==null) return "unknown";
			return m.slice(-2).join("")+"p";
		},
		network:p=>p.sources.map(s=>s.network),
	}

	var searchResult=function(container,data)
	{
		container.classList.add("searchResult");
		container.innerHTML=String.raw
`
<div class="errors"></div>
<div class="actions">
	<input type="text" placeholder="filter"> <button data-action="filter">filter</button>
	<button data-action="showIrcCmd">show irc command</button>
	<button data-action="download">download</button>
</div>
<div class="results">
	<div class="tableWrapper"></div>
</div>
`		;
		var errors=container.children[0];
		var actions=container.children[1]
		var results=container.children[2];
		var tableWrapper=results.children[0];

		createErrorMenu(errors,data.errors)
		SC.action({
        	downloadList:function(event,button)
        	{
        		button.disabled=true;
				return SC.rq({
					url:"rest/downloads/add",
					data:'{"XDCCdownload":['+atob(button.dataset.listParam)+']}'
				})
        		.then(function()
        		{
        			SC.dlg('<div><span class="dialog-icon">&#10071;</span> added list to download queue</div><button data-action="close" autofocus>ok</button>',
        				{modal:true,target:container}
					);
					button.textContent=button.dataset.action="retry";
        		},
        		function(e)
        		{
        			µ.logger.error(e);
        			SC.dlg('<div><span class="dialog-icon">&#10060;</span> error while adding list to download queue:\n'+(e.response||e.message)+'</div><button data-action="close">ok</button>',
        				{modal:true,target:container}
					);
        		})
        		.always(()=>button.disabled=false);
        	},
        	retry:function()
        	{
        		//TODO
        	}
		},errors)

		var tableData=new SC.TableData(data.results,[
			"name",
			{
				name:"filesize",
				fn:function(cell,data)
				{
					cell.textContent=SC.XDCCdownload.formatFilesize(data.filesize);
				}
			},
			{
				name:"sources",
				fn:function(cell,data)
				{
					cell.textContent=data.sources.map(s=>s.user+"@"+s.network).join(" ");
					cell.dataset.title=data.sources.map(s=>s.network+"/"+s.channel+" - "+s.user+":"+s.packnumber+" ("+s.subOffices+")").join("\n");
				}
			}
		]);
		var table=SC.selectionTable(tableData);
		table.noInput=true;
		SC.selectionTable.selectionControl(table);
		tableWrapper.appendChild(table);

		var tableBody=table.children[1];
		var rows=Array.from(tableBody.children);
		table.addEventListener("select",function()
		{
			for(var row of rows)
			{
				if(!row.parentNode) row.children[0].checked=false;
			}
		});

		var organizer=new SC.org(data.results);
		var manualFilter=null;
		var sort=null;

		var filtersConfig={};
		for(var group in filterGroups)
		{
			organizer.group(group,filterGroups[group]);

			filtersConfig[group]={
				type:"select",
				multiple:true,
				default:[],
				values:Object.keys(organizer.getGroup(group)).sort()
			};
		}

		var filters=SC.form(filtersConfig,undefined,"filters");

		var updateFilter=function()
		{
			var filterValues=filters.getConfig().get();
			var filtered=organizer.combine(false,sort);

			if(manualFilter) filtered.filter(manualFilter);

			for(var group in filterGroups)
			{
				if(filterValues[group].length>0)
				{
					var groupFiltered=organizer.combine(true);
					filterValues[group].forEach(part=>groupFiltered.group(group,part));
					filtered.combine(groupFiltered);
				}
			}

			filtered.getIndexes().forEach(index=>helper.appendChild(rows[index]));

			while(tableBody.firstChild) tableBody.removeChild(tableBody.firstChild);
			tableBody.appendChild(helper);

		};

		filters.addEventListener("change",updateFilter);
		results.appendChild(filters);

		SC.action({
        	filter:function(event,target)
        	{
        		var manualFilterValue=target.previousElementSibling.value;
        		if(manualFilterValue)
        		{
					if(!organizer.hasFilter(manualFilterValue))
					{
						var scorer=SC.fuzzy.scoreFunction(manualFilterValue);
						var helperMap=new Map();
						var getScore=function(d)
						{
							if(!helperMap.has(d)) helperMap.set(d,scorer(d.name));
							return helperMap.get(d);
						}
						organizer.filter(manualFilterValue,d=>getScore(d).reduce((a,b)=>a+b)>0);
						organizer.sort(manualFilterValue,(a,b)=>SC.fuzzy.sortScore(getScore(a),getScore(b)));
					}
					manualFilter=sort=manualFilterValue;
					for(var c of table.querySelectorAll(".ASC")) c.classList.remove("ASC");
					for(var c of table.querySelectorAll(".DESC")) c.classList.remove("DESC");
				}
				else manualFilter=null;
				updateFilter();
        	},
        	showIrcCmd:function()
        	{
        		var networks=new SC.org(table.getSelected())
        		.group("network","network",child=>child.group("channel","channel",child=>child.group("bot","user"))).getGroup("network");

				var content="<pre>";
				for(var n in networks)
				{
					var channels=networks[n].getGroup("channel");
					for(var c in channels)
					{
						var channel=channels[c];
						content+=n+"/"+c+"\n";
						var bots=channel.getGroupValues("bot");
						for(var b in bots)
						{
							var bot=bots[b];
							content+="/msg "+b+" XDCC BATCH "+bot.map(p=>p.packnumber).join(",")+"\n";
						}
						content+="\n";
					}
				}
				content+='</pre><button data-action="close">ok</button>';
        		SC.dlg(content,{modal:true,target:container});
        	},
        	download:function(event,button)
        	{
        		var selectedDownloads=table.getSelected();
        		if(selectedDownloads.length==0) return;

        		button.disabled=true;
        		SC.rq.json("rest/config/download/create%20Package")
        		.then(createPackage=>
        		{
        			if(createPackage)
        			{
        				var match=selectedDownloads[0].name.match(/[\s_]?([^\[\]\(\)]*?)(?:[\s_]+(?:-|ep))?[\s_]*\d+/i);
        				var packageName=match?match[1].replace(/_/g," "):selectedDownloads[0].name;
        				return new Promise(function(resolve,reject)
        				{
								SC.dlg(String.raw
`
<label>
	<span>Package name</span>
	<input type="text" required value="${packageName}"/>
</label>
<div>
	<button data-action="ok" autofocus>OK</button>
	<button data-action="cancel">add without package</button>
</div>
`
							,{
								modal:true,
								target:container,
								actions:{
									ok:function()
									{
										var input=this.querySelector("input");
										if(input&&input.validity.valid)
										{
											this.close();
											resolve(input.value);
										}
									},
									cancel:function()
									{
										this.close();
										reject();
									}
								}
							});
        				});
        			}
        			return Promise.reject();
        		})
        		.then(function(packageName)
        		{
        			return SC.rq({
						url:"rest/downloads/addWithPackage",
						data:JSON.stringify({
							packageName:packageName,
							packageClass:"Package",
							downloads:{
								XDCCdownload:selectedDownloads
							}
						})
					});
        		},
        		function()
        		{
        			return SC.rq({
						url:"rest/downloads/add",
						data:JSON.stringify({XDCCdownload:selectedDownloads})
					});
        		})
        		.then(function()
        		{
        			SC.dlg('<div><span class="dialog-icon">&#10071;</span> added downloads to queue</div><button data-action="close" autofocus>ok</button>',
        				{modal:true,target:container}
					);
        		},
        		function(e)
        		{
        			µ.logger.error(e);
        			SC.dlg('<div><span class="dialog-icon">&#10060;</span> error while adding downloads:\n'+(e.response||e.message)+'</div><button data-action="close">ok</button>',
        				{modal:true,target:container}
					);
        		})
        		.always(()=>button.disabled=false);
        	}
		},actions);

		var tableHeader=table.children[0];
		tableHeader.addEventListener("click",function(event)
		{
			var column=event.target;
			var columnName=column.dataset.translation;
			if(columnName&&columnName!="sources");
			{
				var column=event.target;
				if(column.classList.contains("ASC"))
				{
					column.classList.remove("ASC");
					column.classList.add("DESC");
					sort="!"+columnName;
					if(!organizer.hasSort(sort)) organizer.sort(sort,SC.org.attributeSort([column.dataset.translation],true));
				}
				else if(column.classList.contains("DESC"))
				{
					column.classList.remove("DESC");
					sort=null;
				}
				else
				{
					column.classList.add("ASC");
					sort=columnName;
					if(!organizer.hasSort(sort)) organizer.sort(sort,SC.org.attributeSort([column.dataset.translation],false));
				}
				updateFilter();
			}
		});
		tableHeader.querySelector("[data-translation=name]").click();

		return container;
	};

	createErrorMenu=function(container,errors)
	{
		if(errors.length>0)
		{
			errors=errors.map(e=>
			{
				if(e.listParam)
				{
					return {
						html:e.subOffice,
						children:[
							{
								html:'<div>no list available</div>'+
									'<button data-action="downloadList" data-list-param="'+btoa(JSON.stringify(e.listParam))+'">download list</button>',
								text:e.text
							}
						]
					}
				}
				return {
					html:e.subOffice,
					children:[
						{
							html:'<div>'+e.message+'</div>'+
								'<div class="stack">'+(e.stack||"")+'</div>',
							text:e.text
						}
					]
				};
			});
			errors=[{
				html:errors.length+" errors",
				children:errors
			}];

			var menu=SC.menu(errors,(dom,error)=>
			{
				if(error.text)dom.textContent=error.text;
				else dom.innerHTML=error.html;
			});
			container.appendChild(menu);
		}
	};

	SMOD("searchResult",searchResult);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);