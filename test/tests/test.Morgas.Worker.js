(function(µ,SMOD,GMOD,HMOD,SC){

	module("Worker");
	
	var WORKER=GMOD("Worker");
	
	var worker=null;
	asyncTest("init",function()
	{
		worker=new WORKER({basePath:"../src/"});
		worker.addListener(".created",null,function()
		{
			ok(true,"created");
			start();
		})
	});
	asyncTest("util test",function()
	{
		worker.send("loadScripts","Morgas.util.crc32.js");
		worker.request("util",["util.crc32","123456789"]).then(function(result)
		{
			strictEqual(result,0xCBF43926,"util result");
			start();
		},function(error)
		{
			µ.logger.error(error);
			ok(false,error)
			start();
		});
	});
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);