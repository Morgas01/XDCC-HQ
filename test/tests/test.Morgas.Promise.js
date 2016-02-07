(function(µ,SMOD,GMOD,HMOD,SC){
	module("Promise");
	var PROM=GMOD("Promise");
	var pledge=PROM.pledge;
	
	asyncTest("call",function()
	{
		new PROM(function(signal)
		{
			ok(true);
			start();
			signal.resolve();
		});
	});
	asyncTest("call arguments",function()
	{
		var scope={};
		new PROM(function(signal,arg,arg2)
		{
			propEqual([arg,arg2],["callarg","callarg2"],"arguments");
			strictEqual(this,scope,"scope");
			start();
			signal.resolve();
		},{args:["callarg","callarg2"],scope:scope});
	});

	asyncTest("on complete",function()
	{
		new PROM(function(signal){signal.resolve("some arg");}).complete(function(arg)
		{
			strictEqual(arg,"some arg");
			start();
		});
	});
	asyncTest("on complete no args",function()
	{
		new PROM().complete(function()
		{
			ok(true);
			start();
		});
	});
	
	asyncTest("chain",function()
	{
		new PROM(function(signal)
		{
			signal.resolve("this");
		})
		.complete(function(arg)
		{
			var rtn=new PROM(function(signal)
			{
				signal.resolve(arg+" is")
			});
			rtn=rtn.complete(function(arg)
			{
				return arg+" chaining";
			});
			return rtn;
		})
		.complete(function(arg)
		{
			strictEqual(arg,"this is chaining");
			start();
		});
	});
	
	asyncTest("on error called",function()
	{
		new PROM(function(signal)
		{
			signal.reject("reason");
		}).error(function(err)
		{
			strictEqual(err,"reason","error called");
			start();
		});
	});
	asyncTest("on error thrown",function()
	{	
		new PROM(function()
		{
			throw("reason");
		}).error(function(err)
		{
			strictEqual(err,"reason","error thrown");
			start();
		});
	});
	asyncTest("on error propagate",function()
	{
		var d1=new PROM(function()
		{
			throw("reason");
		});
		var d2=d1.complete(function()
		{
			return "complete";
		});
		d2.error(function(err)
		{
			strictEqual(err,"reason","error propagated");
			start();
		});
	});
	asyncTest("on abort",function()
	{	
		var d1=new PROM(function(signal)
		{
			signal.onAbort(start);
		});
		d1.error(function(err)
		{
			strictEqual(err.reason,"abort","abort");
		});
		d1.abort();
	});
	asyncTest("on abort time",function()
	{	
		var d1=new PROM(function(signal)
		{
			signal.onAbort(function()
			{
				return new Promise(function(resolve)
				{
					setTimeout(resolve,500);
				})
			});
		});
		d1.error(function(err)
		{
			strictEqual(err.reason,"abort","abort");
			var abortStart=Date.now();
			err.promise.then(function()
			{
				ok(abortStart+500<Date.now(),"time "+(Date.now()-abortStart)+"ms>500ms");
			})
		});
		d1.abort();
	});
	
	asyncTest("pledged function",function()
	{
		var scope={};
		var func=pledge(function(signal,arg)
		{
			strictEqual(this,scope);
			signal.resolve(arg);
		},scope);
		func(3).complete(function(arg)
		{
			strictEqual(arg,3);
			start();
		})
	});
	
	asyncTest("wait for native",function()
	{
		new PROM(function(signal)
		{
			signal.resolve(new Promise(function(resolve,reject)
			{
				resolve("args");
			}));
		}).then(function(fromNative)
		{
			strictEqual(fromNative,"args");
			start();
		});
	});
	
	asyncTest("when all",function()
	{
		new PROM([function(signal)
			{
				signal.resolve("Hello")
			},function(signal)
			{
				signal.resolve("Promise")
			},
			new Promise(function(resolve,reject)
			{//native
				resolve("World");
			}),
			"!"
		])
		.complete(function(){
			strictEqual(Array.slice(arguments).join(" "),"Hello Promise World !");
			start();
		})
	});
	
	asyncTest("simple",function()
	{
		new PROM(function(a,b)
		{
			return a*b
		},{args:[6,7],simple:true}).then(function(result)
		{
			strictEqual(result,42,"simple function");
			start();
		},µ.logger.error);
	});
	
	asyncTest("scope",function()
	{
		var scope={};
		new PROM(function(signal)
		{
			strictEqual(this,scope,"scope first");
			signal.resolve();
		},{scope:scope}).then(function()
		{
			strictEqual(this,scope,"scope second");
		}).then(function()
		{
			strictEqual(this,scope,"scope third");
			start();
		},µ.logger.error);
	});
	
	asyncTest("open",function()
	{
		var scope={};
		var p=PROM.open(scope);
		p.then(function(arg)
		{
			strictEqual(this,scope,"scope first");
			strictEqual(arg,1,"arg first");
			return ++arg;
		}).then(function(arg)
		{
			strictEqual(this,scope,"scope second");
			strictEqual(arg,2,"arg second");
			return ++arg;
		}).then(function(arg)
		{
			strictEqual(this,scope,"scope third");
			strictEqual(arg,3,"arg third");
			start();
		},µ.logger.error);
		p.resolve(1);
	});
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);