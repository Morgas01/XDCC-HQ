(function(µ,SMOD,GMOD,HMOD,SC){

	var util=µ.util=µ.util||{};
	var uObj=util.object=util.object||{};
	
	var arrayNotation=/(.+)\[(\d*)\]/;

	/** goPath
	 * Goes the {path} from {obj} checking all but last step for existance.
	 * 
	 * goPath(obj,"path.to.target") === goPath(obj,["path","to","target"]) === obj.path.to.target
	 * 
	 * when creating is enabled use "foo[]" or "foo[2]" instead of "foo.2" to create an array 
	 * 
	 * @param {any} obj
	 * @param {string|string[]} path
	 * @param {boolean} (create=false) create missing structures
	 */
	uObj.goPath=function(obj,path,create)
	{
		var todo=path;
		if(typeof todo=="string")todo=todo.split(".");
		else todo=todo.slice();
		
		while(todo.length>0&&obj)
		{
			if(create&&!(todo[0] in obj))
			{
				var match=todo[0].match(arrayNotation);
				if(match)
				{
					todo[0]=match[1];
					if(match[2]!=="") todo.splice(1,0,match[2]);
					obj[todo[0]]=[];
				}
				else obj[todo[0]]={};
			}
			obj=obj[todo.shift()];
		}
		if(todo.length>0)
		{
			return undefined
		}
		return obj;
	};
	/**
	 * 
	 * @param {string|string[]} path
	 * @returns function 
	 */
	uObj.goPath.guide=function(path)
	{
		return function(obj){return uObj.goPath(obj,path)};
	};
	SMOD("goPath",uObj.goPath);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);