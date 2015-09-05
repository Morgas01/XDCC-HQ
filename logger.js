(function(µ,SMOD,GMOD,HMOD,SC){
	
	var path = require("path");
	var bunyan = require('bunyan');
	var enshureFolder = GMOD("enshureFolder");
	var logFolder=path.join(__dirname,"logs");
	enshureFolder(logFolder);
	var errorSerializer=function(error)
	{
		if(error instanceof Error)
			return {
				name:error.name,
				message:error.message,
				stack:error.stack
			};
		return error
	};
	module.exports=function(name)
	{
		return bunyan.createLogger({
			name:name,
			streams:[
				{stream: process.stdout},
				{
					type: "rotating-file",
					path:path.join(logFolder,name+".log"),
					period:"1d",
					count:7
				}
			],
			serializers: {
				error: errorSerializer
			}
		});
	}

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);