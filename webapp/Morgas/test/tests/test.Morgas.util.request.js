(function(µ,SMOD,GMOD,HMOD,SC){

	module("util.Request");
	
	var REQ=GMOD("request");
	var RJS=GMOD("request.json");

	asyncTest("request",function()
	{
		REQ("resources/request.json").then(function(text)
		{
			strictEqual(text,'{\r\n	"name":"test response",\r\n	"value":"something"\r\n}',"response");
			start();
		});
	});
	asyncTest("request fallback",function()
	{
		REQ(["bad/url","resources/request.json"]).then(function(text)
		{
			strictEqual(text,'{\r\n	"name":"test response",\r\n	"value":"something"\r\n}',"fallback response");
			start();
		});
	});
	asyncTest("request json",function()
	{
		RJS("resources/request.json").then(function(json)
		{
			deepEqual(json,{"name":"test response","value":"something"},"response");
			start();
		});
	});
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);