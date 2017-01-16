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

		}
	});
	XDCCdownload.states=DOWNLOAD.states;

	DOWNLOAD.Package.downloadClass=XDCCdownload;

	SMOD("XDCCdownload",XDCCdownload);
	if(typeof module!=="undefined")module.exports=XDCCdownload;

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
