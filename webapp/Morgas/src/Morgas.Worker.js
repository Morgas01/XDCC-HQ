(function(µ,SMOD,GMOD,HMOD,SC){
	
	var Listeners=GMOD("Listeners");
	
	SC=SC({
		prom:"Promise",
		rs:"rescope",
		bind:"bind",
	});
	
	var WORKER=µ.Worker=µ.Class(Listeners,{
		init:function(param)
		{
			this.mega(true);
			this.disableListener(".created",true);
			this.createListener("debug error");
			SC.prom.pledgeAll(this,["request"]);
			
			param=param||{};
			param.basePath=param.basePath||WORKER.BASEPATH;
			param.baseScript=param.baseScript||WORKER.BASESCRIPT;
			param.workerBasePath=param.workerBasePath||"../";
			
			this.requests=new Map();
			this.worker=new Worker(param.basePath+param.baseScript);
			this.worker.onmessage=SC.rs(this._onMessage,this);
			this.worker.onerror=SC.rs(this._onError,this);
			
			//init worker
			this.request("init",{
				workerID:WORKER.workerID++,
				basePath:param.workerBasePath,
				morgasPath:param.morgasPath||"Morgas.js",
				logger:{
					send:!param.logger||param.logger.send!==false,
					verbose:param.logger?param.logger.verbose:µ.logger.verbose
				}
			}).complete(SC.rs(function()
			{
				this.disableListener(".created",false);
				this.setState(".created");
			},this));
		},
		_onMessage:function(event)
		{
			if(event.data.request!==undefined)
			{
				if(this.requests.has(event.data.request))
				{
					var signal=this.requests.get(event.data.request);
					clearTimeout(event.data.request);
					(event.data.success ? signal.resolve : signal.reject)(event.data.data);
					this.requests["delete"](event.data.request);
				}
				else
				{
					µ.logger.error(new TypeError("no request "+event.data.request));
				}
			}
			else
			{
				switch(event.data.type)
				{
					case "error":
						this.onError(event.data);
						break;
					case "log":
						µ.logger.log(event.data.verbose,event.data.msg);
						break;
				}
				this.fire(event.data.type,event.data);
			}
		},
		_onError:function(event)
		{
			µ.logger.error(event);
			this.fire("error",event);
		},
		send:function(method,args)
		{
			this.worker.postMessage({method:method,args:[].concat(args)});
		},
		request:function(signal,method,args,timeout)
		{
			var timeoutEvent={
				data:{
					request:null,
					type:"error",
					data:"timeout"
				}
			};
			timeoutEvent.data.request=setTimeout(SC.bind(this._onMessage,this,timeoutEvent),timeout||WORKER.REQUESTTIMEOUT);
			this.requests.set(timeoutEvent.data.request,signal);
			this.worker.postMessage({method:method,args:[timeoutEvent.data.request].concat(args),isRequest:true});
		},
		destroy:function()
		{
			this.worker.terminate();
		}
	});
	WORKER.BASEPATH="../";
	WORKER.BASESCRIPT="Worker/Morgas.BaseWorker.js";
	WORKER.workerID=0;
	WORKER.REQUESTTIMEOUT=60000;
	WORKER.requestUUID=0;
	
	SMOD("Worker",WORKER);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);