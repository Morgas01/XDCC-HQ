(function(µ,SMOD,GMOD,HMOD,SC){
	
	var fs=require("fs");
	var path=require("path");
	
	var OCON=GMOD("ObjectConnector");
	
	SC=SC({
		ef:"enshureFolder",
		rs:"rescope"
	});
	
	module.exports=µ.Class(OCON,{
		init:function(filePath,flushTimeout,maxFlushTimeout)
		{
			this.mega(true);

			SC.rs.all(this,["flush"]);
			this.filePath=path.resolve(filePath);
			SC.ef(path.dirname(filePath));
			try
			{
				this.db.add(JSON.parse(fs.readFileSync(filePath)));
			}
			catch (e)
			{
				µ.logger.warn(new µ.Warning("failed to load dbFile "+this.filePath,e));
			}
			this.flushTimer=null;
			this.maxFlushTimer=null;
			this.flushTimeout=flushTimeout||1000;
			this.maxFlushTimeout=maxFlushTimeout||10000;
		},
		save:function(signal,objs)
		{
			this.mega.apply(this,arguments);
			this.startFlushStimer();
		},
		load:function(signal,objClass,pattern,sort)
		{
			this.mega.apply(this,arguments);
			this.startFlushStimer();
		},
		"delete":function(signal,objClass,toDelete)
		{
			this.mega.apply(this,arguments);
			this.startFlushStimer();
		},
		destroy:function()
		{
			this.flush();
			this.mega();
		},
		startFlushStimer:function()
		{
			if(this.flushTimer) clearTimeout(this.flushTimer);
			this.flushTimer=setTimeout(this.flush,this.flushTimeout);
			if(!this.maxFlushTimer) this.maxFlushTimer=setTimeout(this.flush,this.maxFlushTimeout);
		},
		flush:function()
		{
			if(this.flushTimer)
			{//has something to save
				var data=JSON.stringify(this.db.getValues());
				var fp=this.filePath;
				fs.writeFile(fp,data,function(err)
				{
					if(err)µ.logger.error(new µ.Warning("failed to save dbFile "+fp,err));
					else µ.logger.debug("saved dbFile "+fp);
				});
				clearTimeout(this.flushTimer);
				this.flushTimer=null;
				clearTimeout(this.maxFlushTimer);
				this.maxFlushTimer=null;
			}
		}
	});
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);