var SC=µ.shortcut({
	config:()=>require("./config").config,
	itAs:"iterateAsync",
	File:"File",
	Promise:"Promise",
	Worker:"nodeWorker",
	Org:"Organizer",
	es:"errorSerializer",
	Download:"NIWA-Downloads.Download",
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
		searchSources=SC.config.get(["search","search sources"]);
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
		µ.logger.info(filteredList,"starting search");
		var queries=[].concat(request.data.query);

		var p=Promise.all(filteredList.map(s=>doSearch(s,queries)))
		.then(combineResults);
		p.then(result=>µ.logger.info(`hunting for "${queries.join()}" complete with ${result.results.length} hits and ${result.errors.length} errors`));
		return p;
	});
};
var doSearch=SC.Promise.pledge(function(signal,subOffice,queries)
{
	µ.logger.info({subOffice:subOffice,queries:queries},`start hunting in subOffice ${subOffice}`);

	new SC.Worker("lib/hunter",{
		subOffice:subOffice,
		fileExpiration:SC.config.get(["search","file expiration"]),
		searchTimeout:SC.config.get(["search","search timeout"])
	}).ready()
	.then(function()
	{
		var hunter=this;
		var p= SC.itAs(queries,function(index,query)
		{
			µ.logger.info({query:query},`hunt in ${subOffice} for ${query} [${index}/${queries.length}]`);
			return hunter.request("search",query,50000);
		})
		.then(results=>({results:Array.prototype.concat.apply([],results)}),//flatten
		function(results)
		{
			var rtn={results:null,error:results.pop()};
			if(rtn.error==="timeout") rtn.error={message:rtn.error};
			rtn.results=Array.prototype.concat.apply([],results);
			rtn.error.subOffice=subOffice;
			return rtn;
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
	.then(signal.resolve,
	function(error)
	{
		error=SC.es(error);
		error.subOffice=subOffice;
		µ.logger.error(error);
		signal.resolve({
			results:null,
			error:SC.es(error)
		})
	});
});
var combineResults=function(huntResults)
{
	var rtn={
		results:[],
		errors:huntResults.reduce((a,h)=>(h.error&&a.push(h.error),a),[])
	};

	var org = new SC.Org(huntResults.reduce((a,hr)=>(a.push.apply(a,hr.results),a),[]));
	org.group("names","name",function(subGroup)
	{
		subGroup.group("sources",r=>String.raw`{"network":"${r.network}","user":"${r.user}","packnumber":${r.packnumber||"null"}}`,
		subsubGroup=>subsubGroup.group("subOffices","subOffice"));
	});

	var nameGroups=org.getGroup("names");
	for(var name in nameGroups)
	{
		var pack={
			name:name,
			filesize:null,
			sources:[]
		};
		var sourceGroups=nameGroups[name].getGroup("sources");
		for(var sourceKey in sourceGroups)
		{
			var source=JSON.parse(sourceKey);
			source.channel=sourceGroups[sourceKey].getValues()[0].channel;
			source.subOffices=Object.keys(sourceGroups[sourceKey].getGroup("subOffices"));
			pack.sources.push(source);
		}
		var filesizes=[];
		for(var result of nameGroups[name].getValues())
		{
			var size=SC.Download.parseFilesize(result.filesize);
			if(size>0) filesizes.push(size);
		}
		pack.filesize=filesizes.reduce((a,b)=>a+b,0)/(filesizes.length||1);
		rtn.results.push(pack);

	}
	return rtn;
}