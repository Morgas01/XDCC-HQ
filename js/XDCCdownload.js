(function(µ,SMOD,GMOD,HMOD,SC){

	var DOWNLOAD=µ.getModule("Download");

	SC=SC({
		rel:"DBRel",
		FIELD:"DBField"
	});

	var XDCCdownload=µ.Class(DOWNLOAD,{
		objectType:"XDCCdownload",
		init:function(param)
		{
			param=param||{};

			this.mega(param);

			this.addField("sources", SC.FIELD.TYPES.JSON, param.sources);
			this.availableSources=[];
		},
		filterSources:function(aktiveSources)
		{
			var sourcesMap=this.sources.filter(s=>!s.failed).reduce((map,source)=>map.set(source.user+"@"+source.network,source),new Map());
			for(var aktiveSource of aktiveSources)
			{
				if(aktiveSource==null) return false; // started but did not decide a bot jet
				sourcesMap.delete(aktiveSource.user+"@"+aktiveSource.network);
			}
			this.availableSources=Array.from(sourcesMap.values());
			if(this.availableSources.length>0)
			{
				//TODO select best source from activeSources
				this.dataSource=this.availableSources[0];
				return true;
			}
			else
			{
				this.dataSource=null;
				return false;
			}
		},
		getCleanName:function()
		{
			var name=this.name;
			if((name.indexOf("%20")!==-1&&name.indexOf(" ")===-1)||(name.indexOf("%5B")!==-1&&name.indexOf("[")===-1))
				name=decodeURIComponent(name);
			name=name.replace(/_/g," ");
			name=name.replace(/(?:(\D)\.+|\.+(?=\D))(?=.*\.)/g,"$1 "); //keep dots between numbers and last one
			return name;
		}
	});
	XDCCdownload.states=DOWNLOAD.states;

	DOWNLOAD.Package.downloadClass=XDCCdownload;

	SMOD("XDCCdownload",XDCCdownload);
	if(typeof module!=="undefined")module.exports=XDCCdownload;

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
