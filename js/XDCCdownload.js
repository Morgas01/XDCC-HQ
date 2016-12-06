(function(µ,SMOD,GMOD,HMOD,SC){

	var DBObj=µ.getModule("DBObj"),
		FIELD=µ.getModule("DBField");

	SC=SC({
		rel:"DBRel"
	});

	var DOWNLOAD=µ.Class(DBObj,{
		objectType:"Download",
		init:function(param)
		{
			param=param||{};

			this.mega(param);

			this.addField("name",		FIELD.TYPES.STRING	,param.name);
			this.addField("filename",	FIELD.TYPES.STRING	,param.filename);
			this.addField("size",		FIELD.TYPES.INT		,param.size);
			this.addField("filesize",	FIELD.TYPES.INT		,DOWNLOAD.parseFilesize(param.filesize));
			this.addField("state",		FIELD.TYPES.STRING	,param.state||DOWNLOAD.states.PENDING);
			this.addField("message",	FIELD.TYPES.JSON	,param.message);

			this.addField("packageID",	FIELD.TYPES.INT		,param.packageID);
			this.addRelation("package",	DOWNLOAD.Package,SC.rel.TYPES.PARENT,"children","packageID");

			Object.defineProperty(this,"formattedFilesize",{
				configurable:false,
				enumerable:true,
				get:()=>DOWNLOAD.formatFileSize(this.filesize),
			});

			this.addField("sources",	FIELD.TYPES.JSON	,param.sources);

		}
	});
	DOWNLOAD.states={
		DISABLED:"disabled",
		PENDING:"pending",
		RUNNING:"running",
		DONE:"done",
		FAILED:"failed"
	};
	DOWNLOAD.parseFilesize=function(filesize)
	{
		if(typeof filesize=="string")
		{
			var match=/(\d+(?:\.\d+)?)([kmgtp])b?/i.exec(filesize);
			if(match)
			{
				filesize=parseFloat(match[1]);
				switch (match[2])
				{
					case "P":
					case "p":
						filesize*=1E3;
					case "T":
					case "t":
						filesize*=1E3;
					case "G":
					case "g":
						filesize*=1E3;
					case "M":
					case "m":
					default:
						filesize*=1E3;
					case "K":
					case "k":
						filesize*=1E3;
				}
			}
			else filesize=0;
		}
		return filesize;
	};
	DOWNLOAD.formatFilesize=function(filesize)
	{
		if(filesize>1e15) return (filesize/1e12).toFixed(1)+"P";
		else if(filesize>1e12) return (filesize/1e12).toFixed(1)+"T";
		else if(filesize>1e9) return (filesize/1e9).toFixed(1)+"G";
		else if(filesize>1e6) return (filesize/1e6).toFixed(1)+"M";
		else if(filesize>1e3) return (filesize/1e3).toFixed(1)+"K";
		else if (!filesize) return "0";
		else return filesize+"B";
	};

	DOWNLOAD.Package=µ.Class(DBObj,{
		objectType:"Package",
		init:function(param)
		{
			param=param||{};

			this.mega(param);

			this.addField("name",FIELD.TYPES.STRING,param.name);

			this.addRelation("children",DOWNLOAD.Package,SC.rel.TYPES.CHILDREN,"package","children");

			this.addField("packageID",	FIELD.TYPES.INT		,param.packageID);
			this.addRelation("package",		DOWNLOAD.Package,SC.rel.TYPES.PARENT,	"subPackages","packageID");
			this.addRelation("subPackages",	DOWNLOAD.Package,SC.rel.TYPES.CHILDREN,	"package");
		}
	});

	SMOD("Download",DOWNLOAD);
	if(typeof module!=="undefined")module.exports=DOWNLOAD;

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
