var fs=require("fs");
var path=require("path");

function concatall(results)
{
	return Array.prototype.concat.apply([],results);
}
function getFileList(dirs)
{
	var p=[];
	dirs.forEach(function(dir)
	{
		p.push(new Promise(function(rs)
		{
			fs.readdir(dir,function(err,list)
			{
				if(err) throw err;
				var fList=[];
				list.forEach(function(file)
				{
					if(path.extname(file)===".js")fList.push(path.join(dir,file))
				});
				rs(fList);
			})
		}))
	});
	return Promise.all(p).then(concatall)
}

function mapToMap(arr,map)
{
	var set=new Set();
	for(var a of arr)
	{
		if(!(a in map)) console.warn("module",a,"not found");
		else set.add(map[a]);
	}
	var rtn=[];
	var it=set.values();
	var step=null;
	while(!(step=it.next()).done) rtn.push(step.value);
	return rtn;
}
module.exports=function collectDependencies(dirs)
{
	var depsRegEx=/SC=SC\(((?:[^\)]||\);)+)\);/m;
	return getFileList(dirs).then(function(list)
	{
		var pFile=[];
		list.forEach(function(filePath)
		{
			pFile.push(new Promise(function (rs)
			{
				fs.readFile(filePath,{encoding:"UTF-8"},function(err,data)
				{
					var deps,uses,prov;
					var match=data.match(depsRegEx);
					if(match)
					{
						uses=match[1].match(/"[^"]+"/g);
						if(uses)uses=uses.map(function(a){return a.slice(1,-1)});
						deps=data.slice(0,match.index).match(/GMOD\("[^"]+"\)/g);
						if (deps)deps=deps.map(function(a){return a.slice(6,-2)});
					}
					prov=data.match(/SMOD\("[^"]+"/g);
					if (prov)prov=prov.map(function(a){return a.slice(6,-1)});
					rs({file:filePath.slice(4).replace(/\\/g,"/"),deps:deps,uses:uses,prov:prov});
				});
			}));
		});
		return Promise.all(pFile);
	})
		.then(function(dependencies)
		{
			var moduleFiles={};
			for(var i=0;i<dependencies.length;i++)
			{
				var dep=dependencies[i];
				if(dep.prov)
				{
					for(var p=0;p<dep.prov.length;p++)
					{
						if(dep.prov[p] in moduleFiles) console.warn("module",dep.prov[p],"aleardy defined in",moduleFiles[dep.prov[p]]);
						moduleFiles[dep.prov[p]]=dep.file;
					}
				}
			}
			var rtn={
				modules:moduleFiles,
				dependencies:{}
			};
			for(var i=0;i<dependencies.length;i++)
			{
				var dep=dependencies[i];
				if(dep.file=="Morgas.js")
				{
					rtn.dependencies[dep.file]=true;
				}
				else
				{
					rDep=rtn.dependencies[dep.file]={};
					if(!dep.deps)
					{
						rDep.deps=["Morgas.js"];
					}
					else
					{
						rDep.deps=mapToMap(dep.deps,moduleFiles,dep.file);
						rDep.deps.unshift("Morgas.js");
					}
					if(dep.uses)
					{
						rDep.uses=mapToMap(dep.uses,moduleFiles);
						if(Array.isArray(rDep.deps))
						{
							for(var d=0;d<rDep.deps.length;d++)
							{
								var index=rDep.uses.indexOf(rDep.deps[d]);
								if(index!==-1)rDep.uses.splice(index,1);
							}
						}
					}
				}
			}
			return rtn;
		});
};