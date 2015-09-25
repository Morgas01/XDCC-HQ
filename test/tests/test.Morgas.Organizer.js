(function(µ,SMOD,GMOD,HMOD,SC){
	module("Organizer");
	
	var ORG=GMOD("Organizer");
	
	test("numbers",function()
	{
		var org=new ORG()
		.sort("ASC",ORG.sortSimple(false))
		.sort("DESC",ORG.sortSimple(true))
		.filter("filter",function(val){return val>4})
		.map("map",µ.constantFunctions.pass)
		.group("%2",a=>a%2);

		org.add([6,2,9,8,1]);
		org.add({a:7,b:5,c:4,d:0,e:3});

		deepEqual(org.getSort("ASC"),[0,1,2,3,4,5,6,7,8,9],"asc");
		deepEqual(org.getSort("DESC"),[9,8,7,6,5,4,3,2,1,0],"desc");
		deepEqual(org.getFilter("filter").getValues(),[6,9,8,7,5],"filter");
		deepEqual(org.getMap("map"),{0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9},"map");
		deepEqual(org.getGroupValues("%2"),{0:[6,2,8,4,0],1:[9,1,7,5,3]},"group");
	});
	
	test("strings",function()
	{
		var org=new ORG()
		.filter("filter",function(val){return /[aiu]/.test(val)})

		org.add(["We","hunt","them","experiment","on","them"]);
		org.add({a:"and",f:"then",h:"we",p:"kill",x:"them"});

		deepEqual(org.getFilter("filter").getValues(),["hunt","experiment","and","kill"],"filter");
	});
	
	test("object",function()
	{
		var data=[
			{
				id:0,
				group:"rabbit",
				data:{value:31},
				active:false
			},
			{
				id:1,
				group:"rabbit",
				data:{value:47},
				active:true
			},
			{
				id:2,
				group:"hedgehog",
				data:{value:11},
				active:false
			},
			{
				id:3,
				group:"hedgehog",
				data:{value:19},
				active:true
			},
			{
				id:4,
				group:["hedgehog","rabbit"],
				data:{value:3},
				active:true
			}
		 ];
		
		var org=new ORG(data)
		.filter("filter",{group:/^h\w+g$/,active:true})
		.map("id map","id")
		.group("animal group","group");

		deepEqual(org.getFilter("filter").getValues(),[data[3]],"filter");
		deepEqual(org.getMap("id map"),{0:data[0],1:data[1],2:data[2],3:data[3],4:data[4]},"map");
		deepEqual(org.getGroupValues("animal group"),{rabbit:[data[0],data[1],data[4]],hedgehog:[data[2],data[3],data[4]]},"group");
		data[0].group="hedgehog";
		data[2].active=true;
		data[2].id=5;
		data[3].data.value=2;
		data[3].active=false;
		org.update([data[0],data[2],data[3]]);
		deepEqual(org.getFilter("filter").getValues(),[data[2]],"filter update");
		deepEqual(org.getMap("id map"),{0:data[0],1:data[1],5:data[2],3:data[3],4:data[4]},"map update");
		deepEqual(org.getGroupValues("animal group"),{rabbit:[data[1],data[4]],hedgehog:[data[0],data[2],data[4],data[3]]},"group update");
		org.remove([data[2],data[3]]);
		deepEqual(org.getFilter("filter").getValues(),[],"filter removed");
		deepEqual(org.getMap("id map"),{0:data[0],1:data[1],4:data[4]},"map removed");
		deepEqual(org.getGroupValues("animal group"),{rabbit:[data[1],data[4]],hedgehog:[data[0],data[4]]},"group removed");
	});

	
	test("object",function()
	{
		var data=[
			{
				id:0,
				group:"rabbit",
				data:{value:31},
				active:false
			},
			{
				id:1,
				group:"rabbit",
				data:{value:47},
				active:true
			},
			{
				id:2,
				group:"hedgehog",
				data:{value:11},
				active:false
			},
			{
				id:3,
				group:"hedgehog",
				data:{value:19},
				active:true
			},
			{
				id:4,
				group:["hedgehog","rabbit"],
				data:{value:3},
				active:true
			}
		 ];
		
		var org=new ORG(data)
		.group("animal group","group");
		var child=org.getGroupPart("animal group","hedgehog")
		.filter("active",{active:false}).getFilter("active")
		.sort("sorted",ORG.sortGetter(a=>a.data.value,false));

		deepEqual(child.getSort("sorted"),[data[2]],"child");
		
		data[2].active=true;
		data[3].active=false;
		org.update([data[2],data[3]]);
		
		deepEqual(child.getSort("sorted"),[data[3]],"child update");
		
		org.remove([data[3]]);
		
		deepEqual(child.getSort("sorted"),[],"child removed");
	});

	test("combine",function()
	{
		var org=new ORG([2,8,4,6,9,3,7,0,1,5])
			.sort("ASC",ORG.sortSimple(false))
			.group("%2",function(a){return a%2==0?"even":"odd"})
			.filter(">=5",function(a){return a>=5});
		var c;
		c=org.combine().filter(">=5");
		deepEqual([c.get(),c.get(true)],[[8,6,9,7,5],[2,4,3,0,1]],"single filter");

		c=org.combine(false,"ASC").filter(">=5");
		deepEqual([c.get(),c.get(true)],[[5,6,7,8,9],[0,1,2,3,4]],"sort filter");

		c=org.combine().group("%2","even");
		deepEqual([c.get(false),c.get(true)],[[2,8,4,6,0],[9,3,7,1,5]],"single group");

		c=org.combine().filter(">=5").group("%2","even");
		deepEqual([c.get(false),c.get(true)],[[8,6],[2,4,9,3,7,0,1,5]],"filter+group");

		c=org.combine(true).filter(">=5").group("%2","even");
		deepEqual([c.get(false),c.get(true)],[[2,8,4,6,9,7,0,5],[3,1]],"some filter+group");

		c=org.combine(true,"ASC").filter(">=5").group("%2","even");
		deepEqual([c.get(false),c.get(true)],[[0,2,4,5,6,7,8,9],[1,3]],"sort some filter+group");

		c=org.combine().filter(">=5").combine(org.combine().group("%2","even"));
		deepEqual([c.get(false),c.get(true)],[[8,6],[2,4,9,3,7,0,1,5]],"combine filter group");

		c=org.combine(true,"ASC").filter(">=5").combine(org.combine().group("%2","even"));
		deepEqual([c.get(false),c.get(true)],[[0,2,4,5,6,7,8,9],[1,3]],"sort some combine filter group");
	});
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);