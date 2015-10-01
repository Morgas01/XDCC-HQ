var path=require("path");
var fs=require("fs");
require(path.join("..","Morgas"));

var moduleRegister = require("../Morgas.ModuleRegister");

var oldhasModule=µ.hasModule;
var oldGetModule=µ.getModule;

µ.hasModule=function(key)
{
	if(key in moduleRegister|| fs.existsSync(path.resolve(__dirname,key+".js")))return true;
	return false;
}
µ.getModule=function(key)
{
	if(!oldhasModule(key))
	{
		if(key in moduleRegister)require(path.join("..",moduleRegister[key]));
		else
		{
			try
			{
				µ.setModule(key,require("./"+key));
			}
			catch(e)
			{
				µ.logger.error(new µ.Warning("could not load nodejs module "+key,e));
			}
		}
	}
	return oldGetModule(key);
};

/* polyfills */

Array.slice=Array.prototype.slice.call.bind(Array.slice);