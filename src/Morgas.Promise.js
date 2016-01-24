(function(µ,SMOD,GMOD,HMOD,SC){

	SC=SC({
		adopt:"adopt",
		rs:"rescope"
	});
	
	var rescopeApply=function rescopeApply(fn,scope)
	{
		if(fn)return function(arr)
		{
			arr=[].concat(arr);
			return fn.apply(scope,arr);
		};
	};
	/**
	 * Promise wrapper to provide arguments,scope and abort().
	 * scope is also provided to all "child" promises.
	 */
	var PROM=µ.Promise=µ.Class({
		/**
		 * 
		 * @param {any|any[]} fns
		 * @param {object} (opts)
		 */
		init:function(fns,opts)
		{
			SC.rs.all(this,"abort");
			
			opts=SC.adopt({
				scope:null,
				args:[],
				simple:false // set to true to omit the signal in call
			},opts);
			this.scope=opts.scope;
			
			var _rs,abort;
			this.original=new Promise(function(rs,rj)
			{
				_rs=rs;
				abort=rj;
			});
			this._abort=abort;
			
			// prepare functions
			opts.args=[].concat(opts.args);
			var onAbort=(fn)=>this.original.catch((reason)=>{if(reason==="abort")fn()});
			fns=[].concat(fns).map((fn)=>
			{
				if(typeof fn==="function")return new Promise((rs,rj)=>
				{
					var sArgs=opts.args.slice();
					if(!opts.simple)
					{
						var signal={
							resolve:rs,
							reject:rj,
							scope:opts.scope,
							onAbort:onAbort
						};
						sArgs.unshift(signal);
					}
					try
					{
						var result=fn.apply(opts.scope,sArgs);
						if(opts.simple)
						{
							rs(result);
						}
						else if (result)
						{
							µ.logger.warn(new µ.Warning("function has a result but isn't called in simple mode"));
						}
					}
					catch (e)
					{
						µ.logger.error(e);
						rj(e);
					}
				});
				return fn;
			});
			Promise.all(fns).then(_rs,abort);
		},
		rescopeFn:rescopeApply,// first: apply result of Promise.all | then: only rescope
		_wrapNext:function(next)
		{
			return {
				original:next,
				scope:this.scope,
				then:PROM.prototype.then,
				rescopeFn:SC.rs,
				complete:PROM.prototype.complete,
				error:PROM.prototype.error,
				catch:PROM.prototype.error,
				always:PROM.prototype.always,
				_wrapNext:PROM.prototype._wrapNext
			};
		},
		complete:function(fn)
		{
			return this._wrapNext(this.original.then(this.rescopeFn(fn,this.scope)));
		},
		error:function(efn)
		{
			return this._wrapNext(this.original.catch(this.rescopeFn(efn)));
		},
		then:function(fn,efn)
		{
			return this._wrapNext(this.original.then(this.rescopeFn(fn,this.scope),this.rescopeFn(efn)));
		},
		always:function(fn)
		{
			fn=this.rescopeFn(fn,this.scope);
			return this._wrapNext(this.original.then(fn,fn));
		},
		abort:function()
		{
			this._abort("abort");
		},
		destroy:function()
		{
			this.abort();
			this.mega();
		}
	});
	PROM.prototype.catch=PROM.prototype.error;
	PROM.isThenable=function(thenable)
	{
		return thenable&&typeof thenable.then==="function";
	};
	PROM.pledge=function(fn,scope,args)
	{
		if(args===undefined)args=[];
		else args=[].concat(args);
		return function vow()
		{
			// TODO replace with Array.slice
			var vArgs=args.concat(Array.prototype.slice.call(arguments));
			return new PROM(fn,{args:vArgs,scope:scope});
		}
	};
	PROM.pledgeAll=function(scope,keys)
	{
		keys=keys||Object.keys(scope);
		for(var i=0;i<keys.length;i++)
		{
			if(typeof scope[keys[i]]==="function")scope[keys[i]]=PROM.pledge(scope[keys[i]],scope);
		}
	};
	PROM.always=function(fns,opts)
	{
		fns=fns.map(fn=>
		{
			if(fn instanceof PROM) return fn.always(µ.constantFunctions.pass);
			else if (fn instanceof Promise)return fn.then(µ.constantFunctions.pass);
			else return new PROM(fn,opts).always(µ.constantFunctions.pass);
		});
		return new PROM(fns,opts);
	};
	PROM.open=function(scope)
	{
		var rtn=PROM.prototype._wrapNext.call({
			scope:scope
		});
		rtn.original=new Promise((rs,rj)=>{rtn.resolve=rs;rtn.reject=rj});
		return rtn;
	};
	PROM.resolve=function(value,scope)
	{
		var rtn=PROM.prototype._wrapNext.call({
			scope:scope
		});
		rtn.original=Promise.resolve(value);
		return rtn;
	};
	PROM.rejected=function(value,scope)
	{
		var rtn=PROM.prototype._wrapNext.call({
			scope:scope
		});
		rtn.original=Promise.reject(value);
		return rtn;
	};
	
	SMOD("Promise",PROM);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);