(function MorgasInit(oldµ){
	Morgas={version:"0.4"};
	µ=Morgas;
	/**
	 * revert "µ" to its old value
	 */
	µ.revert=function()
	{
		return µ=oldµ;
	};
	
	µ.constantFunctions={
		"ndef":function(){return undefined},
		"nul":function(){return null},
		"f":function(){return false},
		"t":function(){return true;},
		"zero":function(){return 0;},
		"boolean":function(val){return !!val},
		"pass":function(a){return a}
	};

	/** Modules
	 *	Every class and utility function should define a Module, which can
	 *	be replaced by any other function or class that has similar structure.
	 *
	 *	However they should NEVER only define a Module! It should only be used to
	 *	shortcut paths and ensure flexibility.
	 */
	(function(){
		var modules={};
		µ.setModule=function(key,value)
		{
			if(modules[key])
			{
				µ.logger.warn(new µ.Warning("module "+key+" is overwritten"));
			}
			return modules[key]=value;
		};
		µ.hasModule=function(key)
		{
			return !!modules[key];
		};
		µ.getModule=function(key)
		{
			if(!modules[key])
				µ.logger.info(new µ.Warning("module "+key+" is not defined\n use µ.hasModule to check for existence"));
			return modules[key];
		};
	})();
	
	/**
	 * log message if it's verbose is >= the current verbose.
	 * If a message is a function its return value will be logged.
	 * 
	 * Set µ.logger.out to any function you like to log the events and errors.
	 * µ.logger.out will be called with (verbose level, [messages...])
	 */
	µ.logger={
		log:function(verbose,msg/*,msg...*/)
		{
			if(!verbose)
			{
				verbose=0;
			}
			if(µ.logger.verbose>=verbose)
			{
				if(typeof msg == "function") msg=[].concat(msg());
				else msg=Array.prototype.slice.call(arguments,1);
				
				µ.logger.out(verbose,msg);
			}
		},
		LEVEL:{
				//OFF:0,
				error:10,
				warn:20,
				info:30,
				debug:40,
				trace:50
		},
		verbose:30,
		getLevel:function(){return µ.logger.verbose},
		setLevel:function(level){µ.logger.verbose=level},
		/**
		 * @param {number}	verbose
		 * @param {any[]}	msg
		 */
		out:function(verbose,msg)
		{
			var fn=console.log;
			switch(verbose)
			{
				case 10:
					fn=console.error;
					break;
				case 20:
					fn=console.warn;
					break;
				case 30:
					fn=console.info;
					break;
			}
			fn.apply(console,msg);
		}
	};
	//create methods for each level (e.g. µ.logger.warn)
	for(var level in µ.logger.LEVEL)(function(level)
	{
		µ.logger[level]=function()
		{
			var args=Array.prototype.slice.call(arguments);
			args.unshift(µ.logger.LEVEL[level]);
			µ.logger.log.apply(null,args);
		}
	})(level);
	
	/** shortcut
	 * creates an object that will evaluate its values defined in {map} on its first call.
	 * when {context} is provided and {map.value} is not a function it will treated as a path from {context}
	 *
	 * uses goPath
	 *
	 * map:	{key:("moduleOrPath",function)}
	 * context: any (optional)
	 * target: {} (optional)
	 *
	 * returns {key:value}
	 */
	µ.shortcut=function(map,target,context,dynamic)
	{
		if(!target)
		{
			target={};
		}
		for(var m in map){(function(path,key)
		{
			var value=undefined;
			Object.defineProperty(target,key,{
				configurable:false,
				enumerable:true,
				get:function()
				{
					if(value==null||dynamic)
					{
						if(typeof path=="function")
							value=path(context);
						else if(context&&µ.hasModule("goPath"))
							value=µ.getModule("goPath")(context,path);
						else if (µ.hasModule(path))
							value=µ.getModule(path);
						else
							µ.logger.error(new ReferenceError("shortcut: could not evaluate "+path))
					}
					return value;
				}
			});
		})(map[m],m)}
		return target;
	};
	
	/** Class function
	 * Designed to create JavaScript Classes
	 * 
	 *  It does the inheritance, checks for arguments,
	 *  adds the core patch to it and calls the init() method.
	 *  
	 *  
	 *  To create a class do this:
	 *  
	 *  myClass=µ.Class(mySuperClass,myPrototype)
	 *  
	 *  OR
	 *  
	 *  myClass=µ.Class(mySuperClass)
	 *  myClass.protoype.init=function()
	 *  {
	 *  	//call constructor of superclass
	 *  	mySuperClass.prototype.init.call(this,arg1,arg2...);
	 *  	//or this.mega();
	 *  
	 *  	//your constructor
	 *  }
	 *  
	 *  You also can derive this classes with "ordinary" classes like this:
	 *  
	 *  myClass=µ.Class(mySuperClass,myPrototype)
	 *  mySubClass=function()
	 *  {
	 *  	//whatever you like
	 *  }
	 *  mySubClass.protoytpe=new myClass(µ._EXTEND);
	 *  mySubClass.prototype.constructor=mySubClass;
	 *  
	 *  @param	superClass	(optional)	default: µ.BaseClass
	 *  @param	prototype	(optional)
	 */
	var CLASS=µ.Class=function ClassFunc(superClass,prot)
	{
		var newClass = function ClassConstructor()
		{
			this.init.apply(this,arguments);
			if(µ.hasModule("Listeners")&&this instanceof µ.getModule("Listeners"))
			{
				this.setState(".created");
			}
		};

		if(typeof superClass !== "function")
		{
			prot=superClass;
			superClass=BASE;
		}
		if(superClass) //only undefined when creating BaseClass
		{
			newClass.prototype=Object.create(superClass.prototype);
			newClass.prototype.constructor=newClass;
		}
		
		for(var i in prot)
		{
			newClass.prototype[i]=prot[i];
		}
		return newClass;
	};
	
	µ.Warning=µ.Class(Error,{
		init:function(msg,data)
		{
			this.name = 'warning';
			this.message = msg || 'Default Message';
			this.stack = (new Error()).stack;
			this.data=data;
		}
	});
	
	/** Base Class
	 *	allows to check of being a class ( foo instanceof µ.BaseClass )
	 *	provides mega and basic destroy method
	 */
	var BASE=µ.BaseClass=CLASS(
	{
		init:function baseInit(){},
		mega:function mega()
		{
			var isFirstCall=false,rtn;
			if(this.__magaKey===undefined)
			{
				isFirstCall=true;
				searchPrototype:for(var prot=Object.getPrototypeOf(this);prot!==null;prot=Object.getPrototypeOf(prot))
				{
					for(var i=0,names=Object.getOwnPropertyNames(prot);i<names.length;i++)
					{
						if(this.mega.caller===prot[names[i]])
						{
							Object.defineProperties(this,{
								__megaKey:{configurable:true,writable:true,value:names[i]},
								__megaProt:{configurable:true,writable:true,value:prot}
							});
							break searchPrototype;
						}
					}
				}
				if(this.__megaKey===undefined)
				{
					µ.logger.error(new ReferenceError("caller was not a member"));
					return;
				}
			}
			while((this.__megaProt=Object.getPrototypeOf(this.__megaProt))!==null&&!this.__megaProt.hasOwnProperty(this.__megaKey));
			var error=null;
			try
			{
				if(this.__megaProt===null)
				{
					µ.logger.error(new ReferenceError("no mega found for "+this.__megaKey));
				}
				else
				{
					rtn=this.__megaProt[this.__megaKey].apply(this,arguments);
				}
			}
			catch (e){error=e;}
			if(isFirstCall)
			{
				delete this.__megaKey;
				delete this.__megaProt;
				if(error)µ.logger.error(error);
			}
			if(error) throw error;
			return rtn;
		},
		destroy:function()
		{
			if(this.patches)for(var p in this.patches)this.patches[p].destroy();
			for(var i in this)
			{
				delete this[i];
			}
		}
	});
})(this.µ);
