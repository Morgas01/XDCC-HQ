(function(µ,SMOD,GMOD,HMOD,SC){

	module("util.Progress");
	
	var Progress=GMOD("Progress");

	var generateMessage=function(v,m)
	{
		var msg="[";
		v=v*10/m;
		for(var i=0;i<10;i++)
		 if(i<=v)msg+="|";
		else msg+=" ";
		msg+="] "+v+"/"+m+"="+(v*100/m)+"%";
		return msg;
	}
	
	test("single",function()
	{

		var p=new Progress();

		var steps=[
			[10,100],
			[20,100],
			[50,100],
			[80,100],
			[100,100]
		];
		var parts=[];
		for(var i=0;i<1;i++)
		{
			parts.push(p.get());
		}


		var results=steps.slice();

		p.add(function(v,m)
		{
			deepEqual([v,m],results.shift(),generateMessage(v,m));
		});
		for(var s of steps)
		{
			for(var p of parts)p(s[0],s[1]);
		}
	});

	test("single factor",function()
	{

		var p=new Progress();

		var steps=[
			[10,100],
			[20,100],
			[50,100],
			[80,100],
			[100,100]
		];
		var parts=[];
		for(var i=0;i<1;i++)
		{
			parts.push(p.get(2));
		}


		var results=steps.map(s=>[s[0]*2,s[1]*2]);

		p.add(function(v,m)
		{
			deepEqual([v,m],results.shift(),generateMessage(v,m));
		});
		for(var s of steps)
		{
			for(var p of parts)p(s[0],s[1]);
		}
	});

	test("multi",function()
	{

		var p=new Progress();

		var steps=[
			[10,100],
			[20,100],
			[50,100],
			[80,100],
			[100,100]
		];
		var parts=[];
		for(var i=0;i<3;i++)
		{
			parts.push(p.get());
		}


		var results=[
			[10,100],
			[20,200],
			[30,300],
			[40,300],
			[50,300],
			[60,300],
			[90,300],
			[120,300],
			[150,300],
			[180,300],
			[210,300],
			[240,300],
			[260,300],
			[280,300],
			[300,300]
		];

		p.add(function(v,m)
		{
			deepEqual([v,m],results.shift(),generateMessage(v,m));
		});
		for(var s of steps)
		{
			for(var p of parts)p(s[0],s[1]);
		}
	});

	test("multi factor",function()
	{

		var p=new Progress();

		var steps=[
			[10,100],
			[20,100],
			[50,100],
			[80,100],
			[100,100]
		];
		var parts=[];
		for(var i=0;i<3;i++)
		{
			parts.push(p.get(i+1));
		}

		var results=[
			[10,100],
			[30,300],
			[60,600],
			[70,600],
			[90,600],
			[120,600],
			[150,600],
			[210,600],
			[300,600],
			[330,600],
			[390,600],
			[480,600],
			[500,600],
			[540,600],
			[600,600]
		];

		p.add(function(v,m)
		{
			deepEqual([v,m],results.shift(),generateMessage(v,m));
		});
		for(var s of steps)
		{
			for(var p of parts)p(s[0],s[1]);
		}
	});
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);