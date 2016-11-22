var SC=µ.shortcut({
	File:"File",
	FileUtils:"File.util",
	DBC:"DB/jsonConnector",
	XDCCdownload:require.bind(null,"../js/XDCCdownload"),
	DBObject:"DBObject"
});

var rotationErrors=null;

var dbConnector=SC.FileUtils.enshureDir("storage").then(function()
{
	return new SC.DBC(this.changePath("downloads.json")).open()
})
.then(function(result)
{
	if(result.others)
	{
		rotationErrors=result.others.map(other=>({error:worker.errorSerializer(other.error),file:other.file.getAbsolutePath()}));
		rotationErrors.push({file:result.file,error:"loaded"});
		µ.logger.warn({errors:errors},"errors loading file "+file.getAbsolutePath());
	}
	return this;
});


module.exports={
	errors:function()
	{
		return rotationErrors;
	},
	list:function()
	{
		return dbConnector.then(function(dbc)
		{
			return new SC.Promise([dbc.load(SC.XDCCdownload),dbc.load(SC.XDCCdownload.Package)])
			.then(function(downloads,packages)
			{
				var all=downloads.concat(packages);
				SC.DBObject.connectObjects(all);
				return all.filter(o=>o.packageID==null);
			})
		});
	}
}