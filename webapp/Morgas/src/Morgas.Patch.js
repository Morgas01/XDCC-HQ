(function(µ,SMOD,GMOD,HMOD,SC){

	/**Patch Class
	 * Adds functionality to an instance
	 * 
	 * Patches add themself in a the "patches" map of the instance with their patchID
	 * The core patch adds the "patches" map and the functions "hasPatch" and "getPatch"
	 * 
	 * Normaly a Patch does not add functions direct to the instance but uses listeners
	 * 
	 * 
	 * To create a new patch do sth. like this
	 * 
	 * var myPatch=µ.Class(µ.patch,
	 * {
	 * 		patchID:"myPatchID",
	 * 		patch:function(param,noListeners)
	 * 		{
	 * 			this.mega();// in case of µ.Patch its not necessary 
	 * 			//your constructor after instance is created
	 * 		}
	 * }
	 * 
	 * The "patch" function is called on the create event (when the constructor of the instance is finished)
	 * If the instance has no listeners, "noListeners" is true and "patch" was called immediately
	 * 
	 * If you want to override the init function do it like this:
	 * 
	 * var myPatch=µ.Class(mySuperPatch,
	 * {
	 * 		patchID:"myPatchID",
	 * 		init:function(instance,param)
	 * 		{
	 * 			//call constructor of superclass
	 * 			this.mega(instance,param);
	 * 
	 * 			if(this.instance!=null)
	 * 			{
	 * 				//your constructor
	 * 				//post patch:  this.instance.addListener(".created",function(param,noListeners){}) 
	 * 			}
	 * 		},
	 * 		patch:function(param,noListeners)
	 * 		{
	 * 			this.mega(param,noListeners);// in case of µ.Patch its not necessary 
	 * 			//post constructor
	 * 		}
	 * }  
	 */
	var _hasPatch=function hasPatch(patch)
	{
		return this.getPatch(patch)!==undefined;
	};
	var _getPatch=function getPatch(patch)
	{
		return this.patches[patch.patchID||patch.prototype.patchID];
	};
	var _callPatch=function()
	{
		this.patch(this._patchParam,false);
		delete this._patchParam;
	};
	
	var PATCH=µ.Patch=µ.Class(
	{
		//patchID:"myID",		//abstract core patch
		init:function Patchinit(instance,param,doPatchNow)
		{
			if(instance.patches==null)
			{
				instance.patches={};
				instance.hasPatch=_hasPatch;
				instance.getPatch=_getPatch;
			}
			if(!instance.hasPatch(this))
			{
				this.instance=instance;
				instance.patches[this.patchID]=this;
				if(typeof this.instance.addListener==="function")//instanceof Listeners or has Listeners attached
				{
					this._patchParam=param;
					this.instance.addListener(".created:once",this,_callPatch);
					if(doPatchNow) this.patchNow();
				}
				else
				{
					this.patch(param,true);
				}
			}
		},
		patchNow:function()
		{
			if(this.instance.patches[this.patchID]===this&&typeof this.instance.removeListener==="function"&&this.instance.removeListener(".created",this))
			{
				this.patch(this._patchParam,false);
			}
		},
		patch:function patch(param,noListeners){},
		destroy:function()
		{
			if(this.instance.patches[this.patchID]==this) delete this.instance.patches[this.patchID];
			this.mega();
		}
	});
	SMOD("Patch",PATCH);
	PATCH.hasPatch=function(instance, patch)
	{
		if(instance.hasPatch)
			return instance.hasPatch(patch);
		return false;
	};
	PATCH.getPatch=function(instance, patch)
	{
		if(instance&&instance.getPatch)
			return instance.getPatch(patch);
		return null;
	};
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);