(function(µ,SMOD,GMOD,HMOD,SC){
	module("Listeners");
	
	
	test("Listeners",function(assert)
	{
		var foo=new (µ.getModule("Listeners"))();
		
		foo.createListener("event");
		var result=[];
		foo.addListener("event:once",result,function(e){
			this.push("once "+e.value);
		});
		foo.addListener("event:last",result,function(e){
			this.push("last "+e.value);
		});
		foo.addListener("event",result,function(e){
			this.push("normal "+e.value);
		});
		foo.addListener("event:first",result,function(e){
			this.push("first "+e.value);
		});
		
		foo.fire("event",{value:1});
		deepEqual(result,["first 1","normal 1","last 1","once 1"],"scope and order");
		
		foo.fire("event",{value:2});
		deepEqual(result,["first 1","normal 1","last 1","once 1","first 2","normal 2","last 2",],"once removed");
		
		foo.disableListener("event",true);
		ok(foo.isListenerDisabled("event"),"disabled (getter)");
		
		foo.fire("event",{value:3});
		deepEqual(result,["first 1","normal 1","last 1","once 1","first 2","normal 2","last 2"],"disabled");
		
		foo.disableListener("event",false);
		foo.removeListener("event",result,"all");
		foo.addListener("event",result,function(e){
			this.push(e.value);
		});
		foo.fire("event",{value:"cleared"});
		deepEqual(result,["first 1","normal 1","last 1","once 1","first 2","normal 2","last 2","cleared"],"remove listeners");
		
		foo.createListener(".state");
		result=[];
		foo.addListener(".state",result,function(e){
			this.push("before");
		});
		foo.addListener(".state",result,function(e){
			this.push(e.value);
		});
		foo.setState(".state","mystate");
		foo.addListener(".state",result,function(e){
			this.push("after");
		});
		deepEqual(result,["before","mystate","after"],"state");
		
		foo.removeListener("event",result);
		foo.addListener("event",foo,"destroy");
		foo.fire("event");
		ok(true,"destroyed")
	});
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);