(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		TreeTableData:"gui.TreeTableData",
		selectionTable:"gui.selectionTable",
		DBObj:"DBObj",
		Download:"Download",
		OCON:"ObjectConnector",
		adopt:"adopt",
		Promise:"Promise",
		rq:"request",
		dlg:"gui.dialog",
		stree:"gui.selectionTree",
		TableData:"gui.TableData",
		eq:"equals"
	});

	var baseColumns={
		"icon":function(cell,data)
		{
			cell.classList.add("icon");
			cell.classList.add(data instanceof SC.Download?"download":"package");
		},
		"name":"name",
		"filesize":function filesize(cell,data)
		{
			var filesize;
			if(data instanceof SC.Download) filesize=data.filesize;
			else filesize=0;//TODO
			cell.textContent=SC.Download.formatFilesize(filesize);
		},
		"progress":function progress(cell,data)
		{
			var progress;
			//TODO
			if(data instanceof SC.Download) progress=25;
			else progress=25;
			cell.innerHTML=String.raw
`<div class="progress-wrapper">
	<div class="progress" style="width:${25}%;"></div>
</div>`
			;
		},
		"speed":function speed(cell,data)
		{
			var speed;
			//TODO
			if(data instanceof SC.Download) speed="?";
			else speed="?";
			cell.textContent="? kb/s";
		},
	}

	var downloadTable=function (columns,options)
	{
		options=SC.adopt({
			apiPath:"rest/downloads",
			eventName:"downloads",
			onTableRefresh:null, //function(table)
			DBClasses:[] // download && package
		},options);
		options.DBClasses.unshift(SC.Download,SC.Download.Package);
		options.DBClasses=options.DBClasses.reduce((d,c)=>(d[c.prototype.objectType]=c,d),{});

		var container=document.createElement("div");
		container.classList.add("downloadTable");
		var tableData=new SC.TreeTableData(
			[],
			(columns||Object.keys(baseColumns)).map(c=>(c in baseColumns)?baseColumns[c]:c),
			function(p)
			{
				if(p instanceof SC.Download.Package) return p.getItems();
				return null;
			});
		var table=null;
		var ocon=new SC.OCON();
		var rowMap=new Map();

		var refreshTable=function()
		{
			return Promise.all(Object.keys(options.DBClasses).map(key=>ocon.load(options.DBClasses[key])))
			.then(Array.prototype.concat.apply.bind(Array.prototype.concat,Array.prototype)) //flatten
			.then(data=>
			{
				SC.DBObj.connectObjects(data);
				tableData.data=data.filter(d=>d.packageID==null).sort(SC.Download.sortByOrderIndex);
				var newTable=SC.selectionTable(tableData,null,function(row,item)
				{
					rowMap.set(item.objectType+item.ID,row);
					row.dataset.state=item.state;
					row.dataset.type=item.objectType;
				});
				newTable.noInput=true;
				SC.selectionTable.selectionControl(newTable);

				if(table) table.remove();
				table=newTable;
				container.appendChild(table);

				if(options.onTableRefresh)options.onTableRefresh(table);
			});
		};
		var updateTable=function(items)
		{
			for(var item of items)
			{
				var row=rowMap.get(item.objectType+item.ID);
				if(!row)
				{
					µ.logger.warn("row not found: "+item.objectType+item.ID);
					debugger;
				}
				var cols=Array.slice(row.children,1);
				//cols[0]=cols[0].children[2]
				for(var i=0;i<cols.langth;i++)
				{
					tableData.columns.fn.call(item,cols[i],item);
				}
				row.dataset.state=item.state;
			}
		};
		var updateItems=function(itemDictionary)
		{
			var items=[];
			for(var objectType in itemDictionary)
			{
				if(objectType in options.DBClasses)
				{
					var itemClass=options.DBClasses[objectType];
					for(var item of itemDictionary[objectType])
					{
						items.push(new itemClass().fromJSON(item));
					}
				}
				else µ.logger.error("unknown class: "+objectType);
			}
			return ocon.save(items).then(()=>items);
		};

		var es=new EventSource("event/"+options.eventName);
		window.addEventListener("beforeunload",function(){es.close()})
		es.addEventListener("error",function(error)
		{
			if(es.readyState==EventSource.CLOSED) alert("connection lost");
			µ.logger.error(error);
		});
		es.addEventListener("ping",µ.logger.debug);

		es.addEventListener("init",function(event)
		{
			ocon.db.clear();
			ocon.db.add(JSON.parse(event.data));
			refreshTable();
		});
		es.addEventListener("add",function(event)
		{
			ocon.db.add(JSON.parse(event.data));
			refreshTable();
		});
		es.addEventListener("delete",function(event)
		{
			var data=JSON.parse(event.data);
			var promises=[];
			for(var objectType in data)
			{
				if(objectType in options.DBClasses)
				{
					promises.push(ocon.delete(options.DBClasses[objectType],data[objectType]));
				}
			}
			Promise.all(promises).then(refreshTable)
		});
		es.addEventListener("update",function(event)
		{
			updateItems(JSON.parse(event.data)).then(updateTable);
		});
		es.addEventListener("move",function(event)
		{
			updateItems(JSON.parse(event.data)).then(refreshTable);
		});
		es.addEventListener("sort",function(event)
		{
			updateItems(JSON.parse(event.data)).then(refreshTable);
		});

		var prepareItems=function(items)
		{
			var rtn={};
			for(var item of items)
			{
				if(!rtn[item.objectType])rtn[item.objectType]=[];
				rtn[item.objectType].push(item.ID);
			}
			return rtn;
		};

		var api={
			"getContainer":()=>container,
			"getTable":()=>table,
			"getDb":()=>ocon,
			"disable":function(items)
			{
				return SC.rq({
					url:options.apiPath+"/disable",
					data:JSON.stringify(prepareItems(items)),
					method:"PUT"
				});
			},
			"enable":function(items)
			{
				return SC.rq({
					url:options.apiPath+"/enable",
					data:JSON.stringify(prepareItems(items)),
					method:"PUT"
				});
			},
			"reset":function(items)
			{
				return SC.rq({
					url:options.apiPath+"/reset",
					data:JSON.stringify(prepareItems(items)),
					method:"PUT"
				});
			},
			"createPackage":function(name,items,packageClassName)
			{
				return SC.rq({
					url:options.apiPath+"/createPackage",
					data:JSON.stringify({
						items:prepareItems(items),
						name:name,
						packageClass:packageClassName||"Package"
					}),
					method:"POST"
				});
			},
			"moveTo":function(target,items)
			{
				var data={
					target:null,
					items:prepareItems(items),
				};
				if(target) data.target={
					[target.objectType]:target.ID
				}
				return SC.rq({
					url:options.apiPath+"/moveTo",
					data:JSON.stringify(data),
					method:"PUT"
				});
			},
			"moveSelected":function()
			{
				var selected=table.getSelected();
				if(selected.length==0) return Promise.resolve();
				var packageClasses=Object.keys(options.DBClasses).map(key=>options.DBClasses[key]).filter(c=>c===SC.Download.Package||c.prototype instanceof SC.Download.Package);
				return Promise.all(packageClasses.map(c=>ocon.load(c)))
				.then(Array.prototype.concat.apply.bind(Array.prototype.concat,Array.prototype)) //flatten
				.then(function(packages)
				{
					SC.DBObj.connectObjects(packages);
					return {
						name:"root",
						children:packages.filter(p=>p.packageID==null)
					};
				})
				.then(function(root)
				{
					var tree=SC.stree(root,function(element,package)
					{
						element.textContent=package.name;
						//TODO disable selected packages and its children
					},{
						childrenGetter:c=>c instanceof SC.Download.Package?c.getChildren("subPackages"):c.children,
						radioName:"moveTarget"
					});
					tree.expand(true,true);
					return new SC.Promise(function(signal)
					{
						SC.dlg(function(container)
						{
							container.appendChild(tree);
							var okBtn=document.createElement("button");
							okBtn.textContent=okBtn.dataset.action="OK";
							container.appendChild(okBtn);
							var closeBtn=document.createElement("button");
							closeBtn.textContent=closeBtn.dataset.action="cancel";
							container.appendChild(closeBtn);

						},{
							modal:true,
							actions:{
								OK:function()
								{
									var target=tree.getSelected()[0];
									if(target===root) target=null;
									api.moveTo(target,selected)
									.then(signal.resolve,signal.reject);
									this.close();
								},
								cancel:function()
								{
									this.close();
									signal.reject("cancel");
								}
							}
						});
					});
				});
			},
			"delete":function(items)
			{
				return SC.rq({
					url:options.apiPath+"/delete",
					data:JSON.stringify(prepareItems(items)),
					method:"DELETE"
				});
			},
			"sortSelected":function()
			{
				var selected=table.getSelected()[0];
				var loadPattern={packageID:SC.eq.unset()};
				if(selected instanceof SC.Download.Package) loadPattern={packageID:selected.ID};

				var dbClasses=Object.keys(options.DBClasses).map(key=>options.DBClasses[key]);
				return Promise.all(dbClasses.map(c=>ocon.load(c,loadPattern)))
				.then(Array.prototype.concat.apply.bind(Array.prototype.concat,Array.prototype)) //flatten
				.then(function(downloads)
				{
					downloads.sort(SC.Download.sortByOrderIndex);
					var sortData=new SC.TableData(downloads,["name"]);
					var sortTable=SC.selectionTable(sortData,"sortItems",function(row,data)
					{
						row.dataset.type=data.objectType;
						row.dataset.ID=data.ID;
					});
					sortTable.noInput=true;
					return new SC.Promise(function(signal)
					{
						SC.dlg(function(container)
						{
							container.classList.add("sortDialog");
							container.innerHTML=String.raw
`
<div class="sortWrapper">
	<div class="sortActions">
		<button data-action="first">⤒</button>
		<button data-action="up">↑</button>
		<button data-action="down">↓</button>
		<button data-action="last">⤓</button>
	</div>
</div>
<div class="dialogActions">
	<button data-action="ok">OK</button>
	<button data-action="cancel">Cancel</button>
</div>
`
							;
							container.firstElementChild.appendChild(sortTable);
						},{
							modal:true,
							actions:{
								first:function()
								{
									var selectedRow=sortTable.getSelectedRows()[0];
									if(selectedRow) selectedRow.parentNode.insertBefore(selectedRow,selectedRow.parentNode.firstChild);
								},
								up:function()
								{
									var selectedRow=sortTable.getSelectedRows()[0];
									if(selectedRow) selectedRow.parentNode.insertBefore(selectedRow,selectedRow.previousElementSibling);
								},
								down:function()
								{
									var selectedRow=sortTable.getSelectedRows()[0];
									if(selectedRow&&selectedRow.nextElementSibling) selectedRow.parentNode.insertBefore(selectedRow,selectedRow.nextElementSibling.nextElementSibling);
								},
								last:function()
								{
									var selectedRow=sortTable.getSelectedRows()[0];
									if(selectedRow) selectedRow.parentNode.appendChild(selectedRow);
								},
								ok:function()
								{
									var promise= SC.rq({
										url:options.apiPath+"/sort",
										data:JSON.stringify({
											packageID:(selected instanceof SC.Download.Package)?selected.ID:null,
											items:Array.from(sortTable.lastElementChild.children).map(e=>({objectType:e.dataset.type,ID:e.dataset.ID})),
										}),
										method:"POST"
									}).then(signal.resolve,signal.reject);
									promise.always(this.close);
									return promise;
								},
								cancel:function()
								{
									this.close();
									signal.reject("cancel");
								}
							}
						});
					});
				});
			}
		};
		return api;
	};
	downloadTable.baseColumns=Object.keys(baseColumns);
	SMOD("downloadTable",downloadTable);

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);