(function(µ,SMOD,GMOD,HMOD,SC){
	/**
	 * Depends on	: Morgas DB 
	 * Uses			: 
	 *
	 * DB.Connector for simple Javascript object
	 *
	 */
	var DBC=GMOD("DBConn");
	SC=SC({
		prom:"Promise",
		it:"iterate",
		eq:"equals",
		
		DBObj:"DBObj",
		DBFriend:"DBFriend"
	});
	
	var ICON=DBC.IndexedDBConnector=µ.Class(DBC,{

		init:function(dbName)
		{
			this.mega();
			this.name=dbName;

			SC.prom.pledgeAll(this,["_open"]);
		},
		
		save:function(signal,objs)
		{
			objs=[].concat(objs);
			var sortedObjs=ICON.sortObjs(objs);
			var classNames=Object.keys(sortedObjs);
			this._open(classNames).then(function(db)
			{
				var transactions=SC.it(sortedObjs,SC.prom.pledge(function(tSignal,objectType,objects)
				{
					var trans=db.transaction(objectType,"readwrite");
					trans.onerror=function(event)
					{
						µ.logger.error(event);
						db.close();
						tSignal.resolve(event);
					};
					trans.oncomplete=function(event)
					{
						µ.logger.info(event);
						db.close();
						tSignal.resolve();
					};
					
					var store = trans.objectStore(objectType);
					SC.it(objects,function(i,object)
					{
						var obj=object.toJSON(), method="put";
						if(obj.ID===undefined)
						{
							delete obj.ID;
							method="add";
						}
						var req=store[method](obj);
						req.onerror=µ.logger.error;
						req.onsuccess=function(event)
						{
							µ.logger.debug(event);
							object.setID&&object.setID(req.result);//if (!(object instanceof DBFRIEND)) {object.setID(req.result)} 
						}
					});
				}),true);
				signal.resolve(new SC.prom(transactions));
			},signal.reject);
		},
		load:function(signal,objClass,pattern)
		{
			this._open().then(function(db)
			{
				if(!db.objectStoreNames.contains(objClass.prototype.objectType))
				{
					db.close();
					signal.resolve([]);
				}
				else
				{
					var trans=db.transaction(objClass.prototype.objectType,"readonly"),
					rtn=[];
					trans.onerror=function(event)
					{
						µ.logger.error(event);
						db.close();
						signal.reject(event);
					};
					trans.oncomplete=function()
					{
						db.close();
						signal.resolve(rtn);
					};

					var store = trans.objectStore(objClass.prototype.objectType);
					if(typeof pattern.ID==="number"|| (Array.isArray(pattern.ID) && pattern.ID.length>0))
					{
						var reqs=SC.it([].concat(pattern.ID),function(index,ID)
						{
							var req=store.get(ID);
							req.onerror=function(event)
							{
								µ.logger.error(event);
							};
							req.onsuccess=function(event)
							{
								µ.logger.debug(event);
								if(SC.eq(req.result,pattern))
								{
									var inst=new objClass();
									inst.fromJSON(req.result);
									rtn.push(inst);
								}
							}
						});
					}
					else
					{
						var req=store.openCursor();
						req.onerror=function(event)
						{
							µ.logger.error(event);
							db.close();
							signal.reject(event);
						};
						req.onsuccess=function(event)
						{
							if(req.result)
							{
								if(SC.eq(req.result.value,pattern))
								{
									var inst=new objClass();
									inst.fromJSON(req.result.value);
									rtn.push(inst);
								}
								req.result["continue"]();
							}
						}
					}
				}
			},signal.reject);
		},
		"delete":function(signal,objClass,toDelete)
		{
			var _self=this,
			objectType=objClass.prototype.objectType,
			collectingIDs=null;
			if(typeof toDelete==="number"||toDelete instanceof SC.DBObj||toDelete instanceof SC.DBFriend||Array.isArray(toDelete))
			{
				var ids=DBC.getDeletePattern(objClass,toDelete).ID;
				collectingIDs=SC.prom.resolve(ids);
			}
			else
			{
				collectingIDs=this._open().then(function(db){return new Promise(function(rs,rj)
				{
					var _collectingSelf=this,
					ids=[],
					trans=db.transaction(objectType,"readonly");
					trans.onerror=function(event)
					{
						µ.logger.error(event);
						db.close();
						rj(event);
					};
					trans.oncomplete=function()
					{
						db.close();
						rs(ids);
					};

					var store = trans.objectStore(objectType);
					var req=store.openCursor();
					req.onerror=function(event)
					{
						µ.logger.error(event);
						db.close();
						rj(event);
					};
					req.onsuccess=function(event)
					{
						if(req.result)
						{
							if(SC.eq(req.result.value,toDelete))
							{
								ids.push(req.result.key);
							}
							req.result["continue"]();
						}
					}
					
				})});
			}
			collectingIDs.then(function(ids)
			{
				if(ids.length>0)
				{
					return _self._open().then(function(db)
					{
						var trans=db.transaction(objClass.prototype.objectType,"readwrite");
						trans.onerror=function(event)
						{
							µ.logger.error(event);
							db.close();
							signal.reject(event);
						};
						var store = trans.objectStore(objectType);
						
						var reqs=SC.it(ids,SC.prom.pledge(function(rSignal,index,ID)
						{
							var req=store["delete"](ID);
							req.onerror=function(event)
							{
								µ.logger.error(event);
								rSignal.resolve(ID);
							};
							req.onsuccess=function(event)
							{
								µ.logger.debug(event);
								rSignal.resolve();
							}
						}));
						return new SC.prom(reqs).then(function()
						{
							db.close();
							//TODO replace with Array.slice
							signal.resolve(Array.prototype.slice.call(arguments));
						},µ.logger.error);
					});
				}
				else
				{
					signal.resolve(false);
				}
			},function(event){
				db.close();
				signal.reject(event);
			});
		},
		destroy:function()
		{
			//TODO destructor
			this.mega();
		},
		_open:function(signal,classNames)
		{
			var _self=this;
			var req=indexedDB.open(this.name);
			req.onerror=function(event){
				signal.reject(event);
			};
			req.onsuccess=function()
			{
				var toCreate=[],
				db=req.result,
				version=req.result.version;
				for(var i=0;classNames&&i<classNames.length;i++)
				{
					if(!db.objectStoreNames.contains(classNames[i]))
					{
						toCreate.push(classNames[i]);
					}
				}
				if(toCreate.length===0)
				{
					signal.resolve(db);
				}
				else
				{
					var req2=indexedDB.open(_self.name,version+1);
					req2.onerror=function(event){
						signal.reject(event);
					};
					req2.onupgradeneeded=function()
					{
						for(var i=0;i<toCreate.length;i++)
						{
							req2.result.createObjectStore(toCreate[i],{keyPath:"ID",autoIncrement:true});
						}
					};
					req2.onsuccess=function()
					{
						_self.version=req2.result.version;
						signal.resolve(req2.result);
					};
					db.close();
				}
			}
		}
	});
	ICON.isAvailable=function()
	{

	};
	ICON.sortObjs=function(objs)
	{
		var rtn={};
		for(var i=0;i<objs.length;i++)
		{
			var obj=objs[i],
			objType=obj.objectType;
			
			if(rtn[objType]===undefined)
			{
				rtn[objType]=[];
			}
			rtn[objType].push(obj);
		}
		return rtn;
	};
	SMOD("IndexedDBConnector",ICON);	
	SMOD("IDBConn",ICON);
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);