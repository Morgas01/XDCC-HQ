(function(µ,SMOD,GMOD,HMOD,SC){
	module("core");
	
	µ.logger.setLevel(µ.logger.LEVEL.trace);
	
	var class1=µ.Class();
	class1.prototype.init=function(val)
	{
		this.value=val
	};
	
	var class2=function()
	{
		class1.apply(this,arguments);
	};
	class2.prototype=Object.create(class1.prototype);
	class2.prototype.constructor=class2;
	class2.prototype.init=function(param)
	{
		this.mega(param.val);
		this.isSubClass=this instanceof class1;
	};
	class2.prototype.increment=function()
	{
		this.value++;
	}
	
	var class3=µ.Class(class2,
	{
		init:function(val)
		{
			this.mega({val:val});
			this.isSubSubClass=this instanceof class2;
		},
		increment:function()
		{
			this.oldValue=this.value;
			this.mega();
		}
	});

	test("class",function()
	{
		propEqual(new class1(10),{value:10},"class creation");
		propEqual(new class2({val:20}),{value:20,isSubClass:true},"class creation 2 + inheritance");
		var c3=new class3(30);
		propEqual(c3,{value:30,isSubClass:true,isSubSubClass:true},"class creation 3 + inheritance");
		c3.increment();
		propEqual(c3,{value:31,oldValue:30,isSubClass:true,isSubSubClass:true},"class mega on method");
	});

	test("shortcut",function()
	{
		var s1=null;
		var context={path:{to:{value:2}}};
		var SC=µ.shortcut({s1:function(){return s1;},s2:"s2"});
		µ.shortcut({s3:"path.to.value"},SC,context);
		µ.shortcut({s4:"path.to.value"},SC,context,true);
		strictEqual(SC.s1,null,"function before set");
		strictEqual(SC.s2,undefined,"module before set");
		strictEqual(SC.s3,2,"context with path");
		strictEqual(SC.s4,2,"context with path and dynamic");
		
		s1={};
		µ.setModule("s2",{});
		context.path.to.value=4;

		strictEqual(SC.s1,s1,"function after set");
		strictEqual(SC.s2,µ.getModule("s2"),"module after set");
		strictEqual(SC.s3,2,"context with path");
		strictEqual(SC.s4,4,"context with path and dynamic");
	});
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);