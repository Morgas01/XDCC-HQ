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

			this.appOrigin=param.appOrigin||null;

			this.addField("name",		FIELD.TYPES.STRING	,param.name);
			this.addField("filename",	FIELD.TYPES.STRING	,param.filename);
			this.addField("filepath",	FIELD.TYPES.STRING	,param.filepath);
			this.addField("filesize",	FIELD.TYPES.INT		,DOWNLOAD.parseFilesize(param.filesize));
			this.addField("state",		FIELD.TYPES.STRING	,param.state||DOWNLOAD.states.PENDING);
			this.addField("messages",	FIELD.TYPES.JSON	,param.messages||[]); //{String[]}
			this.addField("dataSource",	FIELD.TYPES.JSON	,param.dataSource); // information to start download String = {url:"string"}
			this.addField("orderIndex",	FIELD.TYPES.INT		,param.orderIndex);

			this.size=param.size||0; // current filesize

			this.addRelation("package",	DOWNLOAD.Package	,SC.rel.TYPES.PARENT,"children","packageID");

			Object.defineProperty(this,"formattedFilesize",{
				configurable:false,
				enumerable:true,
				get:()=>DOWNLOAD.formatFileSize(this.filesize),
			});

		},
		addMessage:function(text,time)
		{
			if(!time)time=Date.now();
			this.messages.push({text:text,time:time});
		},
		toJSON:function()
		{
			var jsonObject=DBObj.prototype.toJSON.call(this);
			jsonObject.size=this.size;
			return jsonObject;
		},
		fromJSON:function(jsonObject)
		{
			DBObj.prototype.fromJSON.call(this,jsonObject);
			this.size=jsonObject.size||0;
			return this;
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
	DOWNLOAD.sortByOrderIndex=function sortByOrderIndex(item1,item2) // ASC null last
	{
		var a=item1.orderIndex,b=item2.orderIndex;
		if(a==null)
		{
			if(b==null) return 0;
			else return 1;
		}
		else if (b==null) return -1;
		else return a-b;
	};

	DOWNLOAD.Package=µ.Class(DBObj,{
		objectType:"Package",
		init:function(param)
		{
			param=param||{};

			this.mega(param);

			this.addField("name",		FIELD.TYPES.STRING	,param.name);
			this.addField("orderIndex",	FIELD.TYPES.INT		,param.orderIndex);

			this.addRelation("children",	DOWNLOAD.Package.downloadClass,	SC.rel.TYPES.CHILD,	"package");

			this.addRelation("package",		DOWNLOAD.Package,				SC.rel.TYPES.PARENT,"subPackages","packageID");
			this.addRelation("subPackages",	DOWNLOAD.Package,				SC.rel.TYPES.CHILD,	"package");
		},
		getItems:function()
		{
			return this.getChildren("subPackages").concat(this.getChildren("children")).sort(DOWNLOAD.sortByOrderIndex);
		}
	});
	DOWNLOAD.Package.downloadClass=DOWNLOAD;

	SMOD("Download",DOWNLOAD);
	if(typeof module!=="undefined")module.exports=DOWNLOAD;

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);
