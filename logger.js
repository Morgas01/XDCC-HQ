(function(µ,SMOD,GMOD,HMOD,SC){
	
	var path = require("path");
	var bunyan = require('bunyan');
	var enshureFolder = GMOD("enshureFolder");
	var logFolder=path.join(__dirname,"logs");
	enshureFolder(logFolder);

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
				error: module.exports.errorSerializer
			}
		});
	};
	module.exports.errorSerializer=function(error)
	{
		if(error instanceof Error)
			return {
				name:error.name,
				message:error.message,
				stack:error.stack
			};
		return error
	};
	
	var coreLogger=module.exports("core");
	
	µ.logger.out=function(level,msg)
	{
		var fn;
		switch(level)
		{
			case µ.logger.LEVEL.error:
				fn=coreLogger.error;
				break;
			case µ.logger.LEVEL.warn:
				fn=coreLogger.warn;
				break;
			case µ.logger.LEVEL.info:
				fn=coreLogger.info;
				break;
			default:
				fn=coreLogger.debug;
		}
		fn.apply(coreLogger,msg);
	}

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);