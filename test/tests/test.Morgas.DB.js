(function(µ,SMOD,GMOD,HMOD,SC){
	var DBObj=GMOD("DBObj"),
	FIELD=GMOD("DBField"),
	REL=GMOD("DBRel");
	var testObject=µ.Class(DBObj,{
		objectType:"testObject",
		init:function(param)
		{
			param=param||{};
			
			this.mega(param);
			
			this.addField("testInt",	FIELD.TYPES.INT		,param.testInt		);
			this.addField("testDouble",	FIELD.TYPES.DOUBLE	,param.testDouble	);
			this.addField("testBool",	FIELD.TYPES.BOOL	,param.testBool		);
			this.addField("testString",	FIELD.TYPES.STRING	,param.testString	);
			this.addField("testJSON",	FIELD.TYPES.JSON	,param.testJSON		);
//			this.addField("testBlob",	FIELD.TYPES.BLOB	,param.testBlob		);
			this.addField("testDate",	FIELD.TYPES.DATE	,param.testDate 	);

			this.addField("testParent_ID",FIELD.TYPES.INT);

			this.addRelation("parentRel",	testObject,	REL.TYPES.PARENT,	"childRel",	"testParent_ID");
			this.addRelation("childRel",	testObject,	REL.TYPES.CHILD,	"parentRel"	);
			this.addRelation("friendRel",	testObject,	REL.TYPES.FRIEND,	"friendRel"	);
		}
	});
	window.DBTest=function(dbConn,extra)
	{
		sessionStorage.clear(); //clear to ensure execution order

		var obj1=new testObject({
			testInt:10,
			testDouble:1.1,
			testBool:true,
			testString:"testString",
			testJSON:{test:"json",success:true,score:10},
			testDate:new Date()
		}),
		obj2=new testObject({
			testInt:20,
			testString:"testString",
			testBool:true
		}),
		obj3=new testObject({
			testInt:30,
			testString:"testString2",
			testBool:true
		});
		
		obj1.addChild("childRel",obj2);
		obj2.addFriend("friendRel",obj3);

		//tests

		test("save single",function()
		{
			console.log("save single");
			return dbConn.save(obj1).then(function()
			{
				notEqual(obj1.getID(),undefined,"ID generated");
			});
		});
		test("save multiple",function()
		{
			console.log("save multiple");
			obj1.setValueOf("testDouble",1.2);
			return dbConn.save([obj1,obj2,obj3])
			.then(function()
			{
				notEqual(obj1.getID(),undefined,"ID generated");
				notEqual(obj2.getID(),undefined,"ID generated");
				notEqual(obj3.getID(),undefined,"ID generated");
			});
		});
		test("save friendships",function()
		{
			console.log("save friendships");
			return dbConn.saveFriendships(obj2,"friendRel")
			.then(function()
			{
				ok(true);
			});
		});
		test("load single via int",function()
		{
			console.log("load single via int");
			return dbConn.load(testObject,{testInt:10}).then(function(result)
			{
				deepEqual(result[0]&&result[0].toJSON(),obj1.toJSON(),"load single via int");
				equal(result.length,1,"result count");
			});
		});
		test("load multiple via string",function()
		{
			console.log("load multiple via string");
			return dbConn.load(testObject,{testString:"testString"}).then(function(result)
			{
				deepEqual(result[0]&&result[0].toJSON(),obj1.toJSON(),"load multiple via string (1)");
				deepEqual(result[1]&&result[1].toJSON(),obj2.toJSON(),"load multiple via string (2)");
				equal(result.length,2,"result count");
			});
		});
		test("load relations",function()
		{
			console.log("load relations");
			var o1,o2;
			return dbConn.loadFriends(obj3,"friendRel",{testInt:20})
			.then(function(result)
			{
				o2=result[0];
				deepEqual(obj2.toJSON(),o2.toJSON(),"load firend");
				return dbConn.loadParent(o2,"parentRel");
			},µ.logger.error)
			.then(function(result)
			{
				o1=result;
				deepEqual(obj1.toJSON(),o1.toJSON(),"load parent");
			},µ.logger.error)
		});
		test("deleteFriendships",function()
		{
			console.log("deleteFriendships");
			return dbConn.deleteFriendships(obj2,"friendRel")
			.then(function()
			{
				return dbConn.loadFriends(obj3,"friendRel",{testInt:20});
			},µ.logger.error)
			.then(function(result)
			{
				strictEqual(result.length,0,"firendship deleted");
			},µ.logger.error);
		});
		test("delete",function()
		{
			console.log("delete");
			return dbConn["delete"](testObject,obj1)
			.then(function()
			{
				return dbConn.load(testObject,{testInt:10});
			},µ.logger.error)
			.then(function(result)
			{
				strictEqual(result.length,0,"deleted Object");
				return dbConn["delete"](testObject,{testBool:true});
			},µ.logger.error)
			.then(function()
			{
				return dbConn.load(testObject,{testBool:true});
			},µ.logger.error)
			.then(function(result)
			{
				strictEqual(result.length,0,"deleted pattern");
			});
		});
		if(extra)
		{
			extra(dbConn);
		}
	};
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);