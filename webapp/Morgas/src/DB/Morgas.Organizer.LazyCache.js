(function(µ,SMOD,GMOD,HMOD,SC){
	 /**
	 * Deprecated
	 *
	var ORG=GMOD("Organizer");

	SC=SC({
		it:"iterate",
		debug:"debug",
		det:"Detache"
	});
	
	 var LC=ORG.LazyCache=µ.Class(ORG,
	 {
		init:function(dbClass,connector)
		{
			this.mega();
			SC.det.detacheAll(this,["get","getUnique"]);
			
			this.dbClass=dbClass;
			this.connector=connector;

			
			var inst=new dbClass();
			for(var f in inst.fields)
			{
				if(inst.fields[f].options.UNIQUE)
				{
					this.map(f,"fields."+f+".value");
					this.maps[f].signals={};
				}
			}
		},
		add:function(items,force)
		{
			var rtn=[];
			var toAdd=[];
			SC.it(items,function(value)
			{
				var id=value.getID();
				if(value instanceof this.dbClass&&id!=null)
				{
					if (this.hasMapKey("ID",id))
					{
						if(force)
						{
							this.values[this.maps.ID.values[id]]=value;
						}
						rtn.push(this.values[this.maps.ID.values[id]]);
					}
					else
					{
						toAdd.push(value);
						rtn.push(value)
					}
				}
			},false,false,this);
			this.mega(toAdd);
			return rtn;
		},
		get:function(signal,pattern,sort,force)
		{
			var key=JSON.stringify(pattern);
			if(!force&&this.filters[key]!=null)
			{
				if(this.filters[key].signals.length==0)
					signal.complete(this.getFilter(key));
				else
					this.filters[key].signals.push(signal);
			}
			else
			{
				if(sort)
					sort="fields."+sort+".value";
				this.filter(key,LC.filterPattern(pattern),sort);
				var signals=this.filters[key].signals=[signal];
				this._load(pattern,signals,false,force);
			}
		},
		getUnique:function(signal,fieldName,value,force)
		{
			if(this.maps[fieldName]!=null)
			{
				if(!force&&this.maps[fieldName].values[value]!=null)
				{
					signal.complete(this.getMapValue(fieldName,value));
				}
				else
				{
					var pattern={};
					pattern[fieldName]=value;
					if(this.maps[fieldName].signals[value]==null)
					{
						var signals=this.maps[fieldName].signals[value]=[signal];
						this._load(pattern,signals,true,force);
					}
					else
					{
						this.maps[fieldName].signals[value].push(signal);
					}
				}
			}
			else
			{
				signal.error("Field "+fieldName+" is not unique");
			}
		},
		_load:function(pattern,signals,single,force)
		{
			SC.debug(["LazyCache._load:",arguments],3);
			var _self=this;
			this.connector.load(this.dbClass,pattern).then(function(results)
			{
				_self.add([].concat(results),force);
				results=single?results[0]:results;
				var signal;
				while(signal=signals.shift())
				{
					signal.complete(results);
				}
			},function(e)
			{
				SC.debug(e,1);
				var signal;
				while(signal=signals.shift())
				{
					signal.complete(single?undefined:[]);
				}
			});
		}
	 });
	LC.filterPattern=function(pattern)
	{
		var newPattern={fields:{}};
		for(var i in pattern)
		{
			newPattern.fields[i]={value:pattern[i]};
		}
		return ORG.filterPattern(newPattern);
	};
	*/
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);