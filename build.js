var fs=require("fs");
var path=require("path");

var removeFolder=require("./src/NodeJs/removeFolder");
var minify=require("./minify");

removeFolder("build");

require("./parseDependencies")(["src","src/DB"]).then(function(result)
{
	fs.writeFile("src/Morgas.ModuleRegister.json",JSON.stringify(result.modules,null,"\t"),function(err)
	{
		if(err) console.error("could not save ModuleRegister",err);
	});
	fs.writeFile("src/Morgas.Dependencies.json",JSON.stringify(result.dependencies,null,"\t"),function(err)
	{
		if(err) console.error("could not save Dependencies",err);
	});

	require("./src/Morgas.js");

	require("./src/Morgas.DependencyResolver.js");
	var resolver=new µ.DependencyResolver(result.dependencies);

	files=Object.keys(resolver.config);
	for(var i=0;i<files.length;i++)
	{
			minify(files[i],[files[i]]);
	}

	minify("Morgas_CORE.js",["Morgas.js"]);
	minify("Morgas_DB.js",["DB/Morgas.DB.js","DB/Morgas.DB.ObjectConnector.js","DB/Morgas.DB.IndexedDBConnector.js","DB/Morgas.Organizer.LazyCache.js"]);
	minify("Morgas_FULL.js",Object.keys(resolver.config));
}).catch(function(error)
{
	console.error("build failed!",error,error.stack);
});