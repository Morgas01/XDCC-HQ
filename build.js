require("Morgas");

var SC=µ.shortcut({
	File:"File",
	util:"File.util",
	Promise:"Promise",
	itAs:"iterateAsync"
});

var root				= new SC.File(__dirname);

/*** dependencies ***/

(new (require("Morgas/dependencyParser"))).addSource("js").addSource("lib").parse(".")
.then(function(result)
{
	root.clone().changePath("ModuleRegister.json").write(JSON.stringify(result.moduleRegister,null,"\t")).then(null,function(err)
	{
		µ.logger.error("could not save ModuleRegister",err);
	});
	root.clone().changePath("ModuleDependencies.json").write(JSON.stringify(result.moduleDependencies,null,"\t")).then(null,function(err)
	{
		µ.logger.error("could not save ModuleDependencies",err);
	});
})
.catch(µ.logger.error);