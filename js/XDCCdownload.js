(function(µ,SMOD,GMOD,HMOD,SC){

	let DOWNLOAD=GMOD("NIWA-Download.Download");

	SC=SC({
		rel:"DBRel",
		FIELD:"DBField"
	});

	let XDCCdownload=µ.Class(DOWNLOAD,{
		objectType:"XDCCdownload",
		constructor:function(param)
		{
			param=param||{};

			this.mega(param);

			this.addField("checkName", SC.FIELD.TYPES.BOOL, param.checkName);
			this.addField("appendCRC", SC.FIELD.TYPES.BOOL, param.appendCRC);
			this.addField("sources", SC.FIELD.TYPES.JSON, param.sources);
			this.availableSources=[];
		},
		filterSources:function(aktiveSources)
		{
			if(this.sources.every(s=>s.failed)) this.sources.forEach(s=>s.failed=false);//when every source failed try all again

			let sourcesMap=this.sources.filter(s=>!s.failed).reduce((map,source)=>map.set(source.user+"@"+source.network,source),new Map());
			for(let aktiveSource of aktiveSources)
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
			let name=this.name;
			if((name.indexOf("%20")!==-1&&name.indexOf(" ")===-1)||(name.indexOf("%5B")!==-1&&name.indexOf("[")===-1))
				name=decodeURIComponent(name);
			name=name.replace(/_/g," ");
			name=name.replace(/(?:(\D)\.+|\.+(?=\D))(?=.*\.)/g,"$1 "); //keep dots between numbers and last one
			return name;
		}
	});
	XDCCdownload.states=DOWNLOAD.states;
	XDCCdownload.formatFilesize=DOWNLOAD.formatFilesize

	DOWNLOAD.Package.downloadClass=XDCCdownload;

	SMOD("XDCCdownload",XDCCdownload);

	if(typeof module!=="undefined")module.exports=XDCCdownload;

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
