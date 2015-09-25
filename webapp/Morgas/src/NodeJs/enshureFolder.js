var fs=require("fs");
var path=require("path");
var joinPath=path.join.apply.bind(path.join,path);

module.exports=function(folderpath)
{
	var parts=folderpath.split(/[/\\]/);
	if(parts[parts.length-1]==="")parts.pop();// remove trailing
	if(parts[0]==="")
	{//supposedly unix absolute path
		parts.shift();
		parts[0]="/"+parts[0];
	}
	var i=parts.length+1;
	while(i>1&&!fs.existsSync(joinPath(parts.slice(0,i-1)))) i--;
	for(;i<=parts.length;i++) fs.mkdirSync(joinPath(parts.slice(0,i)));
};