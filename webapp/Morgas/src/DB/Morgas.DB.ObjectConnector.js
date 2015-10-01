(function(µ,SMOD,GMOD,HMOD,SC){
	/**
	 * Depends on	: Morgas DB 
	 * Uses			: 
	 *
	 * DB.Connector for simple Javascript object
	 *
	 */
	var DBC		=GMOD("DBConn");
	var ORG		=GMOD("Organizer");
	
	SC=SC({
		eq:"equals",
		find:"find"
	});
	
	var getDb=function()
	{
		return new ORG().group("objectType","objectType",function(tDb)
		{
			tDb.map("ID","fields.ID");
		});
	};
	
	var OCON=DBC.ObjectConnector=µ.Class(DBC,
	{
		db:getDb(),
		init:function(local)
		{
			this.mega();
			if(!local)
			{
				this.db=getDb();
			}
		},
		save:function(signal,objs)
		{
			objs=[].concat(objs);
			var sortedObjs=DBC.sortObjs(objs);
			
			for(var objectType in sortedObjs.fresh)
			{
				var objs=sortedObjs.fresh[objectType],
				ids=this._getNextID(objectType);
				for(var i=0;i<objs.length;i++)
				{
					var id=(i<ids.length?ids[i]:ids[ids.length-1]+i-ids.length+1);
					objs[i].setID(id);
					this.db.add([{objectType:objs[i].objectType,fields:objs[i].toJSON()}]);
				}
			}
			
			var updates=[];
			for(var objectType in sortedObjs.preserved)
			{
				var objs=sortedObjs.preserved[objectType],
				ids=this.db.getGroupPart("objectType",objectType).getMap("ID");
				for(var i=0;i<objs.length;i++)
				{
					var found=ids[objs[i].getID()];
					if(found)
					{
						found.fields=objs[i].toJSON();
						updates.push(found)
					}
				}
			}
			this.db.update(updates);

			for(var objectType in sortedObjs.friend)
			{
				var objs=sortedObjs.friend[objectType],
					tDb=this.db.getGroupPart("objectType",objectType),
					tDbValues=tDb ? tDb.getValues():null,
					newFriends=[];

				for(var i=0;i<objs.length;i++)
				{
					var json={fields:objs[i].toJSON()};
					if(!tDbValues||SC.find(tDbValues,json))
					{
						json.objectType=objs[i].objectType;
						newFriends.push(json);
					}
				}
				this.db.add(newFriends);
			}
			signal.resolve();
		},
		load:function(signal,objClass,pattern,sort)
		{
			var tDb=this.db.getGroupPart("objectType",objClass.prototype.objectType);
			if(!tDb) return signal.resolve([]);
			var patternKey=null;
			switch(typeof pattern)
			{
				case "object":
					patternKey=JSON.stringify(pattern);
					pattern={fields:pattern};
					break;
				case "function":
					patternKey=pattern;
					pattern={fields:pattern};
					break;
				default:
					patternKey=pattern;
					break;
			}
			if(!tDb.hasFilter(patternKey)) tDb.filter(patternKey,pattern);
			var pDb=tDb.getFilter(patternKey);
			var rtn;
			if(sort)
			{
				sort=[].concat(sort).map(s=>"fields."+s);
				var sortKey=JSON.stringify(sort);
				if(!pDb.hasSort(sortKey)) pDb.sort(sortKey,ORG.attributeSort(sort));
				rtn=pDb.getSort(sortKey);
			}
			else rtn=pDb.getValues();
			rtn=rtn.map(r=>new objClass().fromJSON(r.fields));
			signal.resolve(rtn);
		},
		"delete":function(signal,objClass,toDelete)
		{
			toDelete=SC.find(this.db.values,{objectType:objClass.prototype.objectType,fields:DBC.getDeletePattern(objClass,toDelete)},true);
			this.db.remove(toDelete);
			signal.resolve();
		},
		destroy:function()
		{
			if(this.db!==OCON.prototype.db)
			{
				this.db.clear();
			}
			this.db=null;
			this.save=this.load=this["delete"]=µ.constantFunctions.ndef;
		},
		_getNextID:function(objectType)
		{
			var rtn=[],
			tDb=this.db.getGroupPart("objectType",objectType);
			if(!tDb)return [0];
			var ids=Object.keys(tDb.getIndexMap("ID"));
			var i=0;
			for(;ids.length>0;i++)
			{
				var index=ids.indexOf(""+i);
				if(index===-1) rtn.push(i);
				else ids.splice(index,1);
			}
			rtn.push(i);
			return rtn;
		}
	});
	
	SMOD("ObjectConnector",OCON);
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);