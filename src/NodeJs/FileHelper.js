(function(µ,SMOD,GMOD,HMOD,SC){

	µ.NodeJs=µ.NodeJs||{};

	var FS=require("fs");
	var PATH=require("path");
	
	var regexLike=/^\/((?:[^\/]||\\\/)+)\/([gimy]*)$/;
	var convertRegex=function(pattern)
	{
		if(pattern instanceof RegExp || !regexLike.test(pattern)) return pattern;
		else
		{
			var match=pattern.match(regexLike);
			return new RegExp(match[1],match[2]);
		}
	}
	
	var FH=µ.NodeJs.FileHelper=µ.Class({
		extractChecksum:/[\[\(]([0-9a-zA-Z]{8})[\)\]]\..{3,4}$/,
		init:function(dir)
		{
			this.dir=PATH.resolve(dir||"./");
			this.selected=[];
		},
		ls:function(addition)
		{
			if(addition)return FS.readdirSync(PATH.resolve(this.dir,addition));
			return FS.readdirSync(this.dir);
		},
		changeDir:function(dir)
		{
			this.selected.length=0;
			this.dir=PATH.resolve(this.dir,dir);
		},
		_getFiles:function(pattern,files)
		{
			pattern=convertRegex(pattern);
			if(pattern instanceof RegExp)
			{
				return (files||this.ls()).filter(function(a){return pattern.test(a)});
			}
			else if (!pattern) return [];
			else if(pattern==="all")
			{
				return files||this.ls();
			}
			else if(pattern==="empty")
			{
				var dir=this.dir;
				return (files||this.ls()).filter(function(a)
				{
					var s=FS.statSync(PATH.resolve(dir,a))
					return s&&s.size==0&&s.isFile()
				});
			}
			else if (pattern==="noCRC")
			{
				return (files||this.ls()).filter((a)=>!a.match(this.extractChecksum));
			}
			else if (pattern==="selected")
			{
				return this.selected
			}
			else
			{
				pattern=pattern.toLowerCase()
				return (files||this.ls()).filter(function(a){return a.toLowerCase().indexOf(pattern)!==-1});
			}
		},
		isEmpty:function(fileName)
		{
			var size=FS.statSync(PATH.resolve(this.dir,fileName)).size;
			console.log("size:"+size);
			return size==0;
		},
		select:function(pattern)
		{
			return this.selected=this._getFiles(pattern);
		},
		selectAdd:function(pattern)
		{
			return this.selected=this.selected.concat(this._getFiles(pattern));
		},
		deselect:function(pattern)
		{
			var l=this._getFiles(pattern,this.selected);
			return this.selected=this.selected.filter(function(a){return l.indexOf(a)==-1});
		},
		rename:function(pattern,replacement)
		{
			pattern=convertRegex(pattern)
			var rtn=[];
			for(var i=0;i<this.selected.length;i++)
			{
				var file=this.selected[i].replace(pattern,replacement)
				if(file!==this.selected[i])
				{
					rtn.push([this.selected[i],file]);
					FS.renameSync(PATH.resolve(this.dir,this.selected[i]),PATH.resolve(this.dir,file));
					
					this.selected[i]=file;
				}
			}
			return rtn;
		},
		calcCRC:function(filename,progress)
		{
			return new (GMOD("Promise"))((signal)=>
			{
				var filePath=PATH.resolve(this.dir,filename);
				var stats=null;
				try
				{
					stats=FS.statSync(filePath);
				}
				catch(e)
				{
					signal.reject(e);
					return;
				}
				var dataRead=0;
				var builder=new (GMOD("util.crc32")).Builder();
				var stream=FS.createReadStream(filePath);
				stream.on("data",function(data)
				{
					builder.add(data);
					dataRead+=data.length;
					if(progress)progress(dataRead,stats.size);
				});
				stream.on("end",function()
				{
					signal.resolve(("00000000"+builder.get().toString(16).toUpperCase()).slice(-8));
				});
				stream.on("error",signal.reject);
			});
		},
		checkCRC:function(cb,progress)
		{
			var rtn=[];
			var todo=this.selected.slice();
			while(todo.length>0&&!todo[0].match(this.extractChecksum))
			{
				rtn.push([todo.shift(),null,null]);
				if(cb)cb(rtn[rtn.length-1]);
			}
			if(todo.length==0) return rtn;
			
			return new (GMOD("Promise"))((signal)=>
			{
				var next=(csm)=>
				{
					rtn.push([todo[0],csm,csm===todo[0].match(this.extractChecksum)[1].toUpperCase()]);
					if(cb)cb(rtn[rtn.length-1]);
					todo.shift();
					while(todo.length>0&&!todo[0].match(this.extractChecksum))
					{
						rtn.push([todo.shift(),null,null]);
						if(cb)cb(rtn[rtn.length-1]);
					}
					if(todo.length>0)
					{
						this.calcCRC(todo[0],progress).always(next);
					}
					else
						signal.resolve(rtn);
				}
				this.calcCRC(todo[0],progress).always(next);
			});
		},
		appendCRC:function(cb)
		{
			var rtn=[];
			while(this.selected.length>rtn.length&&this.selected[rtn.length].match(this.extractChecksum))
			{
				rtn.push([this.selected[rtn.length],this.selected[rtn.length]]);
				if(cb)cb(rtn[rtn.length-1]);
			}
			
			return new (GMOD("Promise"))((signal)=>
			{
				if(this.selected.length===rtn.length) signal.resolve(rtn);
				else
				{
					var next=(csm)=>
					{
						var fileName=this.selected[rtn.length];
						var fext=PATH.extname(fileName);
						var newFileName=fileName.slice(0,-fext.length)+"["+csm+"]"+fext;
						FS.renameSync(PATH.resolve(this.dir,fileName),PATH.resolve(this.dir,newFileName));
						this.selected[rtn.length]=newFileName;
						rtn.push([fileName,newFileName]);
						if(cb)cb(rtn[rtn.length-1]);

						while(this.selected.length>rtn.length&&this.selected[rtn.length].match(this.extractChecksum))
						{
							rtn.push([this.selected[rtn.length],this.selected[rtn.length]]);
							if(cb)cb(rtn[rtn.length-1]);
						}
						if(this.selected.length>rtn.length)
						{
							this.calcCRC(this.selected[rtn.length]).always(next);
						}
						else
							signal.resolve(rtn);
					}
					this.calcCRC(this.selected[rtn.length]).always(next);
				}
			});
		},
		"delete":function(pattern)
		{
			if(pattern)this.select(pattern);
			for(var i=0;i<this.selected.length;i++)
			{
				FS.unlinkSync(PATH.resolve(this.dir,this.selected[i]));
			}
			var deleted=this.selected;
			this.selected=[];
			return deleted;
		},
		moveToDir:function(dir)
		{
			var target=PATH.resolve(this.dir,dir);
			try
			{
				FS.mkdirSync(target);
			}
			catch(e)
			{
				if(e.code!=="EEXIST")throw e;
			}
			for(var i=0;i<this.selected.length;i++)
			{
				FS.renameSync(PATH.resolve(this.dir,this.selected[i]),PATH.resolve(target,this.selected[i]));
			}
			this.selected.length=0;
		},
		
		cleanNames:function()
		{
			var rtn=[];
			for(var i=0;i<this.selected.length;i++)
			{
				var file=this.selected[i];
				var entry=[file];
				
				file=file.replace(/_/g," ");
				file=file.replace(/\.(?![^\.]+$)/g," ");
				if(file.indexOf("%20")!==-1||file.indexOf("%5B")!==-1) file=decodeURIComponent(file);
				if(file.match(/\[\d\]\./))
				{
					var originalName=file.replace(/\[\d\]\./,".");
					if(this._getFiles(originalName).length>0)
					{

						if(this._getFiles("empty",[originalName]).length>0)
						{
							FS.unlinkSync(PATH.resolve(this.dir,originalName));
							file=originalName;
							entry.push(" - is dublicate but original was empty");
						}
						else if(this._getFiles("empty",[this.selected[i]]).length>0)
						{
							FS.unlinkSync(PATH.resolve(this.dir,this.selected[i]));
							entry.push(" - is dublicate and empty");
							entry.push(" - delete");
							rtn=rtn.concat(entry);
							continue;
						}
						else entry.push(" - is dublicate but original was found");
					}
					else file=originalName;
				}
				
				if(file!==this.selected[i])
				{
					entry.push(" - rename to : "+file);
					rtn=rtn.concat(entry);
					FS.renameSync(PATH.resolve(this.dir,this.selected[i]),PATH.resolve(this.dir,file));
					this.selected[i]=file;
				}
			}
			return rtn
		},
		mergeParts:function()
		{
			var rtn=[];
			var selectedParts=this.selected.filter(function(a){return a.match(/\.part$/)});
			while(selectedParts.length>0)
			{
				var selectedPart=selectedParts.shift();
				var match=selectedPart.match(/^(.+).(\d{5}).(.+).(part)$/);
				var parts=this._getFiles(match[1]);
				var fileName=match[1]+"."+match[3];
				for(var p=0;p<parts.length;p++)
				{
					FS.appendFileSync(PATH.resolve(this.dir,fileName),FS.readFileSync(PATH.resolve(this.dir,parts[p])));
					var index=selectedParts.indexOf(parts[p]);
					if(index!==-1) selectedParts.splice(index,1);
				}
				
				rtn.push(fileName);
			}
			return rtn;
		}
	});
	SMOD("FileHelper",FH);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);