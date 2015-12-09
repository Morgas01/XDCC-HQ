(function(µ,SMOD,GMOD,HMOD,SC){
	
	µ.util=µ.util||{};

	SC=SC({
		prom:"Promise"
	});
	
	var doRequest=function(signal,param)
	{
		if(param.urls.length==0) signal.reject(new µ.Warning("no Url"));
		else
		{
			var url=param.urls.shift();
			var req=new XMLHttpRequest();
			req.open(param.method,url,true,param.user,param.password);
			req.responseType=param.responseType;
			req.onload=function()
			{
				if (req.status == 200)
				{
					signal.resolve(req.response);
				}
				else
				{
					var w=new µ.Warning(req.status,{url:url,xhr:req});
					µ.logger.error(w);
					if(param.urls.length==0) signal.reject(w);
					else doRequest(signal,param);
				}
			};
			req.onerror=function(error)
			{
				var w=new µ.Warning("Network Error",{url:url,xhr:req,error:error});
				µ.logger.error(w);
				if(param.urls.length==0) signal.reject(w);
				else doRequest(signal,param);
			};
			if(param.progress)
			{
				req.onprogress=param.progress;
			}
			signal.onAbort(function(){
				param.urls.length=0;
				req.abort();
			});
			req.send(param.data);
		}
	};
	var parseParam=function(param)
	{

		var urls;
		if(typeof param ==="string")
		{
			urls=[param];
		}
		else if (Array.isArray(param))
		{
			urls=param.slice();
		}
		else
		{
			urls=param.urls||[].concat(param.url);
		}
		
		param={
			method:param.method||(param.data?"POST":"GET"),
			user:param.user,//||undefined
			password:param.password,//||undefined
			responseType:param.responseType||"",
			withCredentials:param.withCredentials===true,
			contentType:param.contentType,//||undefined
			data:param.data,//||undefined
			urls:urls
		};
		return param;
	};
	/**
	 * 
	 * @param {string|string[]|requestParam} param
	 * @param {any} scope
	 * @returns {Morgas.Promise}
	 */
	REQ=µ.util.Request=function Request_init(param,scope)
	{
		param=parseParam(param);
		return new SC.prom(doRequest,{args:param,scope:scope});
	};
	SMOD("request",REQ);

	REQ.json=function Request_Json(param,scope)
	{

		param=parseParam(param);
		param.responseType="json";
		return REQ(param,scope);
	};
	SMOD("request.json",REQ.json);
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);