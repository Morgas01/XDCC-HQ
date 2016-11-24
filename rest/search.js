var SC=µ.shortcut({
	config:()=>require("./config").config,
	itAs:"iterateAsync",
	File:"File",
	Promise:"Promise",
	Worker:"nodeWorker",
	uniquify:"uniquify",
	es:"errorSerializer"
});


module.exports=function(request)
{
	if(request.method!=="POST"||!request.data||!request.data.query)
	{
		return String.raw
`post as json like this:
	{String|String[]} query
	{String|String[]} [sources=null]
`		;
	}
	return new SC.File("subOffices").listFiles().then(function(subOfficeList)
	{
		if(request.data.sources)
		{
			return subOfficeList.filter(s=>request.data.sources.indexOf(s)!=-1);
		}
		searchSources=SC.config.get("search sources");
		return subOfficeList.filter(s=>
		{
			var source=searchSources.get(s);
			if(!source) searchSources.add(s);
			else return source.get();
			return true;
		});
	})
	.then(function(filteredList)
	{
		var queries=[].concat(request.data.query);

		return Promise.all(filteredList.map(s=>doSearch(s,queries)))
		.then(filterResults);
	});
};
var doSearch=SC.Promise.pledge(function(signal,subOffice,queries)
{
	µ.logger.info({subOffice:subOffice,queries:queries},`start hunting in subOffice ${subOffice}`);

	new SC.Worker("libs/hunter",{
		subOffice:subOffice,
		fileExpiration:SC.config.get("file expiration"),
		searchTimeout:SC.config.get("search timeout")
	}).ready()
	.then(function()
	{
		var hunter=this;
		var p= SC.itAs(queries,function(index,query)
		{
			µ.logger.info({query:query},`hunt in ${subOffice} for ${query} [${index}/${queries.length}]`);
			return hunter.request("search",query,SC.config.get("search timeout")*2);
		})
		.then(results=>({results:Array.prototype.concat.apply([],results)}),
		function(results)
		{
			var rtn={results:null,error:results.pop()};
			rtn.results=Array.prototype.concat.apply([],results);
			return rtn;
		})
		.then(function(result)
		{
			result.source=subOffice;
			return result;
		});

		p.always(function(result)
		{
			µ.logger.info({
					subOffice:subOffice,
					queries:queries,
					results:result.results.length,
					error:SC.es(result.error)
				},
				`hunting ended in subOffice ${subOffice}`
			);
			hunter.destroy();
		});
		return p;
	})
	.then(signal.resolve,signal.reject);
});
var filterResults=function(huntResults)
{
	var rtn={
		results:[],
		errors:[]
	};
	for(var i=0;i<huntResults.length;i++)
	{
		rtn.results=rtn.results.concat(huntResults[i].results);
		if(huntResults[i].error) rtn.errors.push({subOffice:huntResults[i].subOffice,error:huntResults[i].error});
	}
	//TODO merge sources
	rtn.results=SC.uniquify(rtn.results,function(p){return p.network+p.bot+p.packnumber+p.name});
	return rtn;
}