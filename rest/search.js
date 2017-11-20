let SC=µ.shortcut({
	config:()=>require("./config").config,
	File:"File",
	Promise:"Promise",
	Worker:"nodeWorker",
	Org:"Organizer",
	es:"errorSerializer",
	Download:"NIWA-Download.Download",
	niwaWorkDir:"niwaWorkDir"
});


module.exports=function(request)
{
	if(request.method!=="POST"||!request.data||!request.data.query)
	{
		return `post as json like this:
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
			let source=searchSources.get(s);
			if(!source) searchSources.add(s);
			else return source.get();
			return true;
		});
	})
	.then(function(filteredList)
	{
		µ.logger.info(filteredList,"starting search");
		let queries=[].concat(request.data.query);

		let p=Promise.all(filteredList.map(s=>doSearch(s,queries)))
		.then(combineResults);
		p.then(result=>µ.logger.info(`hunting for "${queries.join()}" complete with ${result.results.length} hits and ${result.errors.length} errors`));
		return p;
	});
};
let doSearch=SC.Promise.pledge(function(signal,subOffice,queries)
{
	µ.logger.info({subOffice:subOffice,queries:queries},`start hunting in subOffice ${subOffice}`);
	let searchTimeout=SC.config.get(["search","search timeout"]).get();
	new SC.Worker({
		loadScripts:"lib/hunter",
		cwd:process.cwd(),
		param:{
			subOffice:subOffice,
			fileExpiration:SC.config.get(["search","file expiration"]).get(),
			searchTimeout:searchTimeout,
			niwaWorkDir:SC.niwaWorkDir,
			context:worker.context
		}
	})
	.ready
	.then(async function()
	{
		let hunter=this;
		let results=[];
		let error=null;
		let index=0;
		for(let query of queries)
		{
			µ.logger.info({query:query},`hunt in ${subOffice} for ${query} [${index++}/${queries.length}]`);
			try
			{
				results.push(...(await hunter.request("search",[query],searchTimeout+1000)));
			}
			catch (e)
			{
				error=e;
				if(error==="timeout") error={message:error};
				else error==SC.es(error);
				error.subOffice=subOffice;
				break;
			}
		}

		µ.logger.info({
			subOffice:subOffice,
			queries:queries,
			results:results.length,
			error:error
		},
		`hunting ended in subOffice ${subOffice}`
		);
		hunter.destroy();
		return {
			results:results,
			error:error
		};
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
let combineResults=function(huntResults)
{
	let rtn={
		results:[],
		errors:huntResults.reduce((a,h)=>(h.error&&a.push(h.error),a),[])
	};

	let org = new SC.Org(huntResults.reduce((a,hr)=>(a.push.apply(a,hr.results),a),[]));
	org.group("names","name",function(subGroup)
	{
		subGroup.group("sources",r=>String.raw`{"network":"${r.network}","user":"${r.user}","packnumber":${r.packnumber||"null"}}`,
		subsubGroup=>subsubGroup.group("subOffices","subOffice"));
	});

	let nameGroups=org.getGroup("names");
	for(let name in nameGroups)
	{
		let pack={
			name:name,
			filesize:null,
			sources:[]
		};
		let sourceGroups=nameGroups[name].getGroup("sources");
		for(let sourceKey in sourceGroups)
		{
			let source=JSON.parse(sourceKey);
			source.channel=sourceGroups[sourceKey].getValues()[0].channel;
			source.subOffices=Object.keys(sourceGroups[sourceKey].getGroup("subOffices"));
			pack.sources.push(source);
		}
		let filesizes=[];
		for(let result of nameGroups[name].getValues())
		{
			let size=SC.Download.parseFilesize(result.filesize);
			if(size>0) filesizes.push(size);
		}
		pack.filesize=filesizes.reduce((a,b)=>a+b,0)/(filesizes.length||1);
		rtn.results.push(pack);

	}
	return rtn;
}