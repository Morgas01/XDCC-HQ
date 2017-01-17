(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		TreeTableData:"gui.TreeTableData",
		selectionTable:"gui.selectionTable",
		Download:"Download",
		OCON:"ObjectConnector",
		adopt:"adopt",
		Promise:"Promise",
		rq:"request"
	});

	var baseColumns={
		"name":"name",
		"filesize":function filesize(cell,data)
		{
			cell.textContent=SC.Download.formatFilesize(data.filesize);
		},
		"progress":function progress(cell,data)
		{
			cell.innerHTML="<progress></progress>";
		},
		speed:function speed(cell,data)
		{
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
		options.DBClasses.push(SC.Download,SC.Download.Package);
		options.DBClasses=new Map(options.DBClasses.map(c=>[c.prototype.objectType,c]));

		var container=document.createElement("div");
		container.classList.add("downloadTable");
		var tableData=new SC.TreeTableData([],(columns||Object.keys(baseColumns)).map(c=>(c in baseColumns)?baseColumns[c]:c));
		var table=null;
		var ocon=new SC.OCON();
		var rowMap=new Map();

		var refreshTable=function()
		{
			return Promise.all(Array.from(options.DBClasses.values())
				.map(DBClass=>ocon.load(DBClass,d=>d.packageID==null))
			)
			.then(Array.prototype.concat.apply.bind(Array.prototype.concat,Array.prototype)) //flatten
			.then(data=>
			{
				tableData.data=data;
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
		}

		var es=new EventSource("event/"+options.eventName);
		window.addEventListener("beforeunload",function(){es.close()})
		es.addEventListener("error",µ.logger.error);
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
				if(options.DBClasses.has(objectType))
				{
					if(Array.isArray(data[objectType])) promises.push(ocon.delete(options.DBClasses.get(objectType),data[objectType]));
					else µ.logger.error(data[objectType]);
				}
			}
			Promise.all(promises).then(refreshTable)
		});
		es.addEventListener("update",function(event)
		{
			var data=JSON.parse(event.data);
			data.downloads=(data.downloads||[]).map(d=>new SC.Download().fromJson(d));
			data.packages=(data.packages||[]).map(d=>new SC.Download.Package().fromJson(d));
			ocon.save(data.downloads.concat(data.packages)).then(updateTable);
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

		return {
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
			"createPacakge":function(name,items)
			{
				return SC.rq({
					url:options.apiPath+"/createPacakge",
					data:JSON.stringify({
						items:prepareItems(items),
						name:name
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
					objectType:target.objectType,
					ID:target.ID
				}
				return SC.rq({
					url:options.apiPath+"/moveTo",
					data:JSON.stringify(data),
					method:"PUT"
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
		}
	};
	downloadTable.baseColumns=Object.keys(baseColumns);
	SMOD("downloadTable",downloadTable);

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);