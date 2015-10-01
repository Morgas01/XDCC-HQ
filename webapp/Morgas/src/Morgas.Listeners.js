(function(µ,SMOD,GMOD,HMOD,SC){
	
	/**Listener Class
	 * Holds Arrays of functions to fire or fire once when "fire" is called
	 * When fired and a listening function returns false firing is aborted
	 * When added a type can be passed:
	 * 		"first" function gets prepended
	 * 		"normal" function gets appended (default)
	 * 		"last" function gets appended
	 * 		"once" function is removed after call 
	 * 			(will only be called when previous listeners haven't abort firing.
	 * 			cant abort other "once" listening functions)
	 *  
	 * Can be disabled
	*/
	var LISTENER=µ.Listener=µ.Class(
	{
		init:function ListenerInit()
		{
			this.listeners=new Map(); //TODO use WeakMap when its capable of iterations
			this.disabled=false;
		},
		addListener:function addListener(fn,scope,type)
		{
            var fnType=typeof fn;
			if(fnType==="function"||fnType==="string")
			{
                scope=scope||this;
                var entry=null;
                if(this.listeners.has(scope))
                {
                    entry=this.listeners.get(scope);
                    if(entry.first.has(fn)||entry.normal.has(fn)||entry.last.has(fn)||entry.once.has(fn))
                    {
                        return null;//already listens
                    }
                }
                else
                {
                    entry={first:new Set(),normal:new Set(),last:new Set(),once:new Set()};
                    this.listeners.set(scope,entry);
                }
				if(type)
				{
					type=type.toLowerCase();
				}
				switch(type)
				{
					case "first":
						entry.first.add(fn);
						break;
					case "normal":
                    default:
                        entry.normal.add(fn);
                        break;
					case "last":
						entry.last.add(fn);
						break;
					case "once":
						entry.once.add(fn);
                        break;
				}
				return fn;
			}
			return null;//no function
		},
        addListeners:function addListeners(fns,scope,type)
        {
            fns=[].concat(fns);
            var rtn=[];
            for(var i=0;i<fns.length;i++)
            {
                rtn.push(this.addListener(fns[i],scope,type));
            }
            return rtn;
        },
		removeListener:function removeListener(fn,scope)
		{
            //TODO remove fn from all scopes
			var timesFound=0;
            var entry=this.listeners.get(scope);
            if(entry)
            {
                if(typeof fn=="string"&&fn.toLowerCase()=="all")
                {
                    timesFound=entry.first.size+entry.normal.size+entry.last.size+entry.once.size;
                    this.listeners.delete(scope);
                }
                else
                {
                    if(entry.first.delete(fn))
                    {
                        timesFound++;
                    }
                    if(entry.normal.delete(fn))
                    {
                        timesFound++;
                    }
                    if(entry.last.delete(fn))
                    {
                        timesFound++;
                    }
                    if(entry.once.delete(fn))
                    {
                        timesFound++;
                    }
                    if(entry.first.size===0&&entry.normal.size===0&&entry.last.size===0&&entry.once.size===0)
                    {
                        this.listeners.delete(scope);
                    }
                }
                return timesFound;
            }
            else if (typeof fn=="string"&&fn.toLowerCase()=="all"&&scope===undefined)
            {
            	this.listeners.clear();
            	return -1;//unknown count
            }
            return null;
		},
		removeListeners:function removeListeners(fns,scope)
		{
			fns=[].concat(fns);
			var rtn=[];
			if(fns.length==0)fns.push("all");
			for(var i=0;i<fns.length;i++)
			{
				rtn.push(this.removeListener(fns[i],scope));
			}
			return rtn;
		},
		fire:function fire(source,event)
		{
			event=event||{};
			event.source=source;
			if(!this.disabled)
			{
				var run=true;
                for(var step of this.listeners)
                {
                	var scope=step[0],entry=step[1];
                    var it=entry.first.values();
                    var step=undefined;
                    var value=undefined;
                    while(run&&(step=it.next(),value=step.value,!step.done))
                    {
                        if(typeof value==="string")
                        {
                            value=scope[value];
                        }
                        run=false!==value.call(scope,event);
                    }
                    it=entry.normal.values();
                    while(run&&(step=it.next(),value=step.value,!step.done))
                    {
                        if(typeof value==="string")
                        {
                            value=scope[value];
                        }
                        run=false!==value.call(scope,event);
                    }
                    it=entry.last.values();
                    while(run&&(step=it.next(),value=step.value,!step.done))
                    {
                        if(typeof value==="string")
                        {
                            value=scope[value];
                        }
                        run=false!==value.call(scope,event);
                    }
                    it=entry.once.values();
                    while((step=it.next(),value=step.value,!step.done))
                    {
                        if(typeof value==="string")
                        {
                            value=scope[value];
                        }
                        value.call(scope,event);
                    }
                    entry.once.clear();
                    if(entry.first.size===0&&entry.normal.size===0&&entry.last.size===0 &&this.listeners)//if destroyed while firing
                    {
                        this.listeners["delete"](scope);
                    }
                }
				return run;
			}
			return null;
		},
		setDisabled:function setDisabled(bool){this.disabled=bool===true;},
		isDisabled:function isDisabled(){return this.disabled;},
		destroy:function()
		{
			this.removeListeners();
			this.mega();
		}
	});
	SMOD("Listener",LISTENER);
	
	/** StateListener Class
	 * Listener that fires only when "setState" is called
	 * When state is set it fires added listening functions with last arguments immediately
	 * reset trough "resetState";
	 */
	var STATELISTENER=LISTENER.StateListener=µ.Class(LISTENER,
	{
		init:function StateListenerInit()
		{
			this.mega();
			this.state=null;
			this.stateDisabled=false;
			this.disabled=true
		},
		setDisabled:function setDisabled(bool){this.stateDisabled=bool===true;},
		isDisabled:function isDisabled(){return this.stateDisabled;},
		setState:function setState(source,event)
		{
			this.state=event||{};
			this.state.source=source;

			var rtn=false;
			if(!this.stateDisabled)
			{
				this.disabled=false;
				rtn=this.fire(this,this.state);
				this.disabled=true
			}
			return rtn;
		},
		resetState:function resetState(){this.state=null;},
		getState:function getState(){return this.state},
		addListener:function addListener(fn,scope,type)
		{
			var doFire=this.state&&!this.stateDisabled;
			if(doFire)
			{
				fn.apply(scope,this.state);
			}
			if(!(doFire&&typeof type=="string"&&type.toLowerCase()=="once"))
			{
				return this.mega.apply(this,arguments);
			}
			return null;
		},
		destroy:function()
		{
			this.resetState();
			this.mega();
		}
	});
	SMOD("StateListener",STATELISTENER);
	
	/** Listeners Class
	 * Manages several Listener instances
	 * provides a "createListener" function:
	 * 		prefix "." indicates a StateListener
	 * 	when adding a listening function the type
	 * 	can be passed followed after the name separated by ":" 
	 */
	var LISTENERS=µ.Listeners=µ.Class(
	{
		rNames:/[\s|,]+/,
		rNameopt:":",
		init:function ListenersInit(dynamic)
		{
			this.listeners={};
			this.createListener(".created destroy");
			this.dynamicListeners=dynamic===true;
		},
		createListener:function createListener(types)
		{
			var typeArr=types.split(this.rNames);
			var fnarr=[].slice.call(arguments,1);
			for(var i=0;i<typeArr.length;i++)
			{
				var name_type=typeArr[i].split(this.rNameopt);
				if(this.listeners[name_type[0]]==null)
				{
					if(name_type[0][0]=='.')
					{
						this.listeners[name_type[0]]=new STATELISTENER({});
					}
					else
					{
						this.listeners[name_type[0]]=new LISTENER({});	
					}
				}
			}
		},
		addListener:function addListener(types,scope/*,functions...*/)
		{
			if(this.dynamicListeners) this.createListener(types);
			var typeArr=types.split(this.rNames);
			var fnarr=[].slice.call(arguments,2);
			for(var i=0;i<typeArr.length;i++)
			{
				var name_type=typeArr[i].split(this.rNameopt);
				if(this.listeners[name_type[0]]!==undefined)
				{
					this.listeners[name_type[0]].addListeners(fnarr,scope,name_type[1]);
				}
			}
		},
		removeListener:function removeListener(names,scope/*,functions...*/)
		{
			var removeCount=0;
			if(names.toLowerCase()=="all")
			{
				for(var i in this.listeners)
				{
					removeCount+=this.listeners[i].removeListeners(names,scope);
				}
			}
			else
			{
				var nameArr=names.split(this.rNames);
				var fnarr=[].slice.call(arguments,2);
				for(var i=0;i<nameArr.length;i++)
				{
					var name=nameArr[i];
					if(this.listeners[name]!==undefined)
					{
						removeCount+=this.listeners[name].removeListeners(fnarr,scope);
					}
				}
			}
			return removeCount;
		},
		fire:function fire(name,event)
		{
			event=event||{};
			event.type=name;
			if(this.listeners[name])
			{
				return this.listeners[name].fire(this,event);
			}
			return undefined
		},
		disableListener:function disableListener(names,bool)
		{
			if(names.toLowerCase()=="all")
			{
				for(var i in this.listeners)
				{
					this.listeners[i].setDisabled(bool);
				}
			}
			else
			{
				var nameArr=names.split(this.rNames);
				for(var i=0;i<nameArr.length;i++)
				{
					var lstnr=this.listeners[nameArr[i]];
					if(lstnr!=null)
						lstnr.setDisabled(bool);
				}
			}
		},
		isListenerDisabled:function isDisabled(name)
		{
			var lstnr=this.listeners[name];
			if(lstnr===undefined) return undefined;
			else return lstnr.isDisabled();
		},
		setState:function setState(name,state)
		{
			var event={value:state};
			event.type=name;
			var lstnr=this.listeners[name];
			if (lstnr&&lstnr instanceof STATELISTENER)
			{
				return lstnr.setState(this,event);
			}
			return undefined;
		},
		resetState:function resetState(names)
		{
			if(names.toLowerCase()=="all")
			{
				for(var i in this.listeners)
				{
					if(this.listeners[i] instanceof STATELISTENER)
					this.listeners[i].resetState();
				}
			}
			else
			{
				var nameArr=names.split(this.rNames);
				for(var i=0;i<nameArr.length;i++)
				{
					var lstnr=this.listeners[nameArr[i]];
					if(lstnr!=null&&lstnr instanceof STATELISTENER)
						lstnr.resetState();
				}
			}
		},
		getState:function getState(name)
		{
			var lstnr=this.listeners[name];
			if(lstnr!=null&&lstnr instanceof STATELISTENER) return lstnr.getState();
			return undefined;
		},
		destroy:function()
		{
			this.fire("destroy");
			for(var i in this.listeners)
			{
				this.listeners[i].destroy();
				delete this.listeners[i];
			}
			this.mega();
		}
	});
	SMOD("Listeners",LISTENERS);
	LISTENERS.attachListeners=function attachListeners(instance)
	{
		for(var i in LISTENERS.prototype)
		{
			if (!(i in instance))
				instance[i]=LISTENERS.prototype[i];
		}
		LISTENERS.prototype.init.call(instance);
		instance.setState(".created");
	};
	SMOD("attachListeners",LISTENERS.attachListeners);
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);