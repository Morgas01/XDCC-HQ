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
			var sourcesMap=this.sources.reduce((map,source)=>map.set(source.bot+"@"+source.network,source),new Map());
			for(var aktiveSource of aktiveSources)
			{
				sourcesMap.delete(aktiveSource.bot+"@"+aktiveSource.network);
			}
			this.availableSources=Array.from(sourcesMap.values());
			return this.availableSources.length>0;
		}
	});
	XDCCdownload.states=DOWNLOAD.states;

	DOWNLOAD.Package.downloadClass=XDCCdownload;

	SMOD("XDCCdownload",XDCCdownload);
	if(typeof module!=="undefined")module.exports=XDCCdownload;

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
