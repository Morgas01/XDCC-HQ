var fs=require("fs");
var path=require("path");

var enshureFolder=require("./src/NodeJs/enshureFolder");
var uglify=require("uglify-js");

module.exports=function minify(packageName,files,folder)
{
	folder=path.join(folder||"build",packageName);
	enshureFolder(path.dirname(folder));
	files=files.map(function(a){return "src/"+a});
	try
	{
		var minPackage=uglify.minify(files,{outSourceMap: packageName+".map"});
		fs.writeFileSync(folder,minPackage.code);
		fs.writeFileSync(folder+".map",minPackage.map);
	}
	catch (e)
	{
		console.log("could not minify",packageName,e.message,e.filename,e.line);
		try
		{
			var code=files.map(function(f){return fs.readFileSync(f,{encode:"UTF-8"})}).join("\n");
			fs.writeFileSync(folder,code);
		}
		catch(e)
		{
			console.error("could not copy",packageName,e);
		}
	}
};