(function(µ,SMOD,GMOD,HMOD,SC){
	
	SC=SC({
		rs:"rescope",
		adopt:"adopt"
	});
	
	var util=µ.util=µ.util||{};
	
	var DEFAULTS={
		normalize:false,
		ignoreFactors:false,
	};
	
	util.Progress=µ.Class({
		init:function(options)
		{
			SC.rs.all(this,["update"]);
			
			this.options=SC.adopt.setDefaults(DEFAULTS,options);
			this.progressors=new Map();
			this.state={
				value:null,
				max:null
			};
			this.cbs=new Set();
		},
		get:function(factor)
		{
			var state={
				value:null,
				max:null,
				factor:factor||1
			};
			var fn=(value,max)=>
			{
				state.value=value;
				state.max=max;
				this.update();
			};
			this.progressors.set(fn,state);
			return fn;
		},
		remove:function(fn)
		{
			this.progressors.delete(fn);
			this.update();
		},
		update:function(value,max)
		{
			this.state.value=this.state.max=0;
			var count=0;
			for(var step of this.progressors.values())
			{
				count++;
				var v=step.value||0;
				var m=step.max||0;
				if(this.options.normalize&&m!=0)
				{
					v=v*100/m;
					m=100;
				}
				if(!this.options.ignoreFactors)
				{
					v*=step.factor;
					m*=step.factor;
				}
				this.state.value+=v;
				this.state.max+=m;
			}
			for(var cb of this.cbs)
			{
				if(typeof cb==="function")cb(this.state.value,this.state.max);
				else
				{
					cb.value=this.state.value;
					cb.max=this.state.max;
				}
			}
		},
		/**
		 * @param {function|HTMLProgressElement} cb
		 */
		add:function(cb)
		{
			this.cbs.add(cb);
		}
	});
	SMOD("Progress",util.Progress);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);