(function(µ,SMOD,GMOD,HMOD,SC){

	var goPath=GMOD("goPath");
	var Table=GMOD("gui.Table");

	SC=SC({
		TableConfig:"gui.TableConfig.Select",
		form:"gui.form",
		action:"gui.actionize",
		org:"Organizer",
		dlg:"gui.dialog",
		fuzzy:"fuzzySearch",
		XDCCdownload:"XDCCdownload",
		rq:"request",
		menu:"gui.menu"
	});

	var helper=document.createDocumentFragment();

	var SearchResult=µ.Class(Table,{
		init:function()
		{
			this.mega(new SC.TableConfig([
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
			],{
				noInput:true,
				control:true
			}));

			this.element=document.createElement("div");
			this.element.classList.add("searchResult");

			this.errorMenu=document.createElement("div");
			this.errorMenu.classList.add("errorMenu");
			this.element.appendChild(this.errorMenu);
			SC.action({
				downloadList:(event,button)=>
				{
					button.disabled=true;
					var added=this.downloadList({
						network:button.dataset.network,
						channel:button.dataset.channel,
						user:button.dataset.user,
						packnumber:button.dataset.packnumber,
						subOffice:button.dataset.subOffice
					});
					//TODO added.then(()=>button.textContent=button.dataset.action="retry");
					added.catch(()=>button.disabled=false);
				},
				retry:function()
				{
					//TODO
				}
			},this.errorMenu)

			this.actions=document.createElement("div");
			this.actions.classList.add("actions");
			this.element.appendChild(this.actions);

			/** @Type String */
			this.textFilter=null;

			var textFilterWrapper=document.createElement("span");
			this.actions.appendChild(textFilterWrapper);
			var textFilter=document.createElement("input");
			textFilter.type="text";
			textFilter.placeholder="filter text";
			textFilterWrapper.appendChild(textFilter);
			var textFilterButton=document.createElement("button");
			textFilterButton.dataset.action="filter";
			textFilterButton.textContent="filter";
			textFilterButton.type="button";
			textFilterWrapper.appendChild(textFilterButton);
			textFilter.addEventListener("keydown",e=>{if(e.key=="Enter")textFilterButton.focus()});

			var showIcrCmdButton=document.createElement("button");
			showIcrCmdButton.dataset.action="showIrcCmd";
			showIcrCmdButton.textContent="show irc command";
			this.actions.appendChild(showIcrCmdButton);

			var downloadBtn=document.createElement("button");
			downloadBtn.dataset.action="download";
			downloadBtn.textContent="download";
			this.actions.appendChild(downloadBtn);


			SC.action({
				filter:()=>this.filter(textFilter.value),
				showIrcCmd:()=>this.showIrcCommands(),
				download:(event,button)=>
				{
					button.disabled=true;
					this.download()
					.always(()=>button.disabled=false);
				}
			},this.actions);

			this.content=document.createElement("div");
			this.content.classList.add("content");
			this.element.appendChild(this.content);

			this.filters=null;

			this.tableWrapper=document.createElement("div");
			this.tableWrapper.classList.add("tableWrapper");
			this.content.appendChild(this.tableWrapper);

			this.errors=[];
			this.organizer=new SC.org();
			for(var [name,fn] of Object.entries(SearchResult.filterGroups)) this.organizer.group(name,fn);
			this.sortKey=null;
		},
		setData:function(data)
		{
			this.errors.length=0;
			this.organizer.clear();
			this.add(data);
			this.getTable();
		},
		add:function(data)
		{
			this.mega(data.results);

			this.errors=data.errors;
			this._createErrorMenu();

			this.organizer.add(data.results);
			this._createFilterGroups();

		},
		getTable:function()
		{
			this.mega();

			this.tableWrapper.appendChild(this.tableElement);
			this.tableHeader=this.tableElement.firstElementChild;
			this.tableBody=this.tableHeader.nextElementSibling;

			this.tableHeader.addEventListener("click",this._onHeaderClick.bind(this));
			//this.tableHeader.querySelector("[data-translation=name]").click();


			return this.tableElement;
		},
		_createErrorMenu:function()
		{
			while(this.errorMenu.firstChild)this.errorMenu.firstChild.remove();

			if(this.errors.length>0)
			{
				var errorNodes=this.errors.map(function(error)
				{
					if(error.listParam)
					{
						return {
							html:error.subOffice,
							children:[
								{
									html:`<div>no list available</div><button data-action="downloadList" data-network="${error.listParam.network}" data-channel="${error.listParam.channel}" data-user="${error.listParam.user}" data-packnumber="${error.listParam.packnumber}" data-sub-office="${error.subOffice}" >download list</button>`,
									text:error.text
								}
							]
						}
					}
					return {
						html:error.subOffice,
						children:[
							{
								html:'<div>'+error.message+'</div>'+
									'<div class="stack">'+(error.stack||"")+'</div>',
								text:error.text
							}
						]
					};
				});
				var errorRoot=[{
					html:errorNodes.length+" errors",
					children:errorNodes
				}];

				var menu=SC.menu(errorRoot,function(dom,error)
				{
					if(error.text)dom.textContent=error.text;
					else dom.innerHTML=error.html;
				});
				this.errorMenu.appendChild(menu);
			}
		},
		_createFilterGroups:function()
		{
			var filterConfig={};
			for(var group in SearchResult.filterGroups)
			{
				this.organizer.group(group,SearchResult.filterGroups[group]);

				filterConfig[group]={
					type:"select",
					multiple:true,
					default:[],
					values:Object.keys(this.organizer.getGroup(group)).sort()
				};
			}

			this.filters=SC.form(filterConfig,undefined,"filters");
			this.filters.addEventListener("change",this.updateFilter.bind(this));
			this.content.appendChild(this.filters);
		},
		updateFilter:function()
		{
			var filterValues=this.filters.getConfig().get();
			var filtered=this.organizer.combine(false,this.sortKey);

			if(this.textFilter) filtered.filter(this.textFilter);

			for(var group in SearchResult.filterGroups)
			{
				if(filterValues[group].length>0)
				{
					var groupFiltered=this.organizer.combine(true);
					filterValues[group].forEach(part=>groupFiltered.group(group,part));
					filtered.combine(groupFiltered);
				}
			}

			while(this.tableBody.firstChild) this.tableBody.removeChild(this.tableBody.firstChild);

			filtered.get().forEach(entry=>this.tableBody.appendChild(this.dataDomMap.get(entry)));
		},
		//errorMenu actions
		downloadList:function(data)
		{
			return SC.rq({
				url:"rest/downloads/addListDownload",
				data:JSON.stringify(data)
			})
			.then(()=>
			{
				SC.dlg('<div><span class="dialog-icon">&#10071;</span> added list to download queue</div><button data-action="close" autofocus>ok</button>',
					{modal:true,target:this.element}
				);
			},
			(e)=>
			{
				µ.logger.error(e);
				SC.dlg('<div><span class="dialog-icon">&#10060;</span> error while adding list to download queue:\n'+(e.response||e.message)+'</div><button data-action="close">ok</button>',
					{modal:true,target:this.element}
				);
			});
		},
		// actions
		filter:function(text)
		{
			if(text)
			{
				if(!this.organizer.hasFilter(text))
				{
					var scorer=SC.fuzzy.scoreFunction(text);
					var helperMap=new Map();// caching
					var getScore=function(d)
					{
						if(!helperMap.has(d)) helperMap.set(d,scorer(d.name));
						return helperMap.get(d);
					}
					this.organizer.filter(text,d=>getScore(d).reduce((a,b)=>a+b)>0);
					this.organizer.sort(text,(a,b)=>SC.fuzzy.sortScore(getScore(a),getScore(b)));
				}
				this.textFilter=this.sortKey=text;
				for(var c of this.tableElement.querySelectorAll(".ASC")) c.classList.remove("ASC");
				for(var c of this.tableElement.querySelectorAll(".DESC")) c.classList.remove("DESC");
			}
			else this.textFilter=null;
			this.updateFilter();
		},
		showIrcCommands:function()
		{
			var networks=new SC.org(this.getSelected())
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
			SC.dlg(content,{modal:true,target:this.element});
		},
		download:function(event,button)
		{
			var selectedDownloads=this.getSelected();
			if(selectedDownloads.length==0) return;

			return SC.rq.json("rest/config/download/create%20Package")
			.then(createPackage=>
			{
				if(createPackage)
				{
					var match=selectedDownloads[0].name.match(/[\s_]?([^\[\]\(\)]*?)(?:[\s_]+(?:-|ep))?[\s_]*\d+/i);
					var packageName=match?match[1].replace(/_/g," "):selectedDownloads[0].name;
					return new Promise((resolve,reject)=>
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
							target:this.element,
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
			function(error)
			{
				debugger;
				if(error!=null) return Promise.reject(error);
				return SC.rq({
					url:"rest/downloads/add",
					data:JSON.stringify({XDCCdownload:selectedDownloads})
				});
			})
			.then(()=>
			{
				SC.dlg('<div><span class="dialog-icon">&#10071;</span> added downloads to queue</div><button data-action="close" autofocus>ok</button>',
					{modal:true,target:this.element}
				);
			},
			(e)=>
			{
				µ.logger.error(e);
				SC.dlg('<div><span class="dialog-icon">&#10060;</span> error while adding downloads:\n'+(e.response||e.message)+'</div><button data-action="close">ok</button>',
					{modal:true,target:this.element}
				);
			});
		},
		_onHeaderClick:function(event)
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
					this.sortKey="!"+columnName;
					if(!this.organizer.hasSort(this.sortKey)) this.organizer.sort(this.sortKey,SC.org.attributeSort([column.dataset.translation],true));
				}
				else if(column.classList.contains("DESC"))
				{
					column.classList.remove("DESC");
					this.sortKey=null;
				}
				else
				{
					column.classList.add("ASC");
					this.sortKey=columnName;
					if(!this.organizer.hasSort(this.sortKey)) this.organizer.sort(this.sortKey,SC.org.attributeSort([column.dataset.translation],false));
				}
				this.updateFilter();
			}
		}
	});

	SearchResult.filterGroups={
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
	};

/*
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
    */
	SMOD("SearchResult",SearchResult);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);