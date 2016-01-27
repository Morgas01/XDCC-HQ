(function(µ,SMOD,GMOD,HMOD,SC){
	
	SC=SC({
		it:"iterate"
	});
	/**
	 * holds values an sorted arrays of their indexes.
	 * If values are already indexes use libary
	 *
	 * @param {any} (values=null)
	 * @param {object} (library=null}
	 */
	var SA=µ.SortedArray=µ.Class({
		init:function(values,library)
		{
			this.sorts=new Map();
			this.values=[];
			this.values.freeIndexes=[];
			this.library=library;
			this.add(values);
		},
		hasSort:function(sortName){return this.sorts.has(sortName)},
		sort:function(sortName,sortFn)
		{
			var sort=[];
			this.sorts.set(sortName,sort);
			sort.sortFn=sortFn;
			SC.it(this.values,(index,item)=>this._addToSort(sort,item,index));
			return this;
		},
		add:function(values)
		{
			if(values!=null)
			{
				var indexes=[];
				SC.it(values,(i,item)=>
				{
					var index=this.values.freeIndexes.shift();
					if(index===undefined)index=this.values.length;
					this.values[index]=item;
					indexes.push(index);
					SC.it(this.sorts,(i,sort)=>
					{
						this._addToSort(sort,item,index);
					});
				});
				return indexes;
			}
			return null;
		},
		_addToSort:function(sort,item,index)
		{
			if(!this.library)
			{
				var orderIndex=SA.getOrderIndex(item,this.values,sort.sortFn,sort);
				sort.splice(orderIndex,0,index);
			}
			else
			{
				var orderIndex=SA.getOrderIndex(this.library[item],this.library,sort.sortFn,sort);
				sort.splice(orderIndex,0,item);
			}
		},
		remove:function(values)
		{
			if(values!=null)
			{
				var indexes=[];
				SC.it(values,(i,item)=>
				{
					var valueIndex=this.values.indexOf(item);
					if (valueIndex!==-1)
					{
						var index=null;
						if(this.library)index=item;
						else index=valueIndex;
						if(index!=null)
						{
							SC.it(this.sorts,(i,sort)=>
							{
								var orderIndex=sort.indexOf(index);
								if (orderIndex!==-1) sort.splice(orderIndex,1);
							});
							if(valueIndex===this.values.length-1)this.values.length--;
							else
							{
								delete this.values[valueIndex];
								this.values.freeIndexes.push(valueIndex);
							}
							indexes.push(index);
						}
					}
				});
				return indexes;
			}
			return null;
		},
		update:function(values)
		{
			if(!values)
			{//all
				values=this.values.slice();
				this.clear();
				return this.add(values);
			}
			else
			{
				var indexes=[];
				SC.it(values,(i,item)=>
				{
					var index=this.values.indexOf(item);
					if(index!==-1)indexes.push(index);
				});
				SC.it(this.sorts,(i,sort)=>
				{
					for(var index of indexes)
					{
						if(this.library)index=this.values[index];
						var orderIndex=sort.indexOf(index);
						if(orderIndex!==-1)
						{
							sort.splice(orderIndex,1);
						}
					}
					for(var index of indexes)
					{
						this._addToSort(sort,this.values[index],index);
					}
				});
				return indexes;
			}

		},
		getIndexes:function(sortName)
		{
			if (!this.sorts.has(sortName))return null;
			else return this.sorts.get(sortName).slice();
		},
		get:function(sortName)
		{
			if (!this.sorts.has(sortName))return null;
			else if (this.library) return this.sorts.get(sortName).map(i=>this.library[i]);
			else return this.sorts.get(sortName).map(i=>this.values[i]);
		},
		/**
		 * returns an Array of values without empty entries.
		 * uses libary if there is one
		 * @returns {any[]}
		 */
		getValues:function()
		{
			var rtn=[];
			for(var i in this.values)
			{
				if(i!=="freeIndexes")
				{
					if(this.library) rtn.push(this.library[this.values[i]]);
					else rtn.push(this.values[i]);
				}
			}
			return rtn;
		},
		/**
		 * returns value for the library index.
		 * returns undefined if no library is defined.
		 * @param {number} libaryIndex
		 * @returns {any}
		 */
		getValue:function(libaryIndex)
		{
			if(this.library)return this.library[libaryIndex];
			return undefined;
		},
		clear:function()
		{
			this.values.length=this.values.freeIndexes.length=0;
			SC.it(this.sorts,(i,sort)=>sort.length=0);
			return this;
		},
		destroy:function()
		{
			this.values.length=this.values.freeIndexes.length=0;
			this.sorts.clear();
			this.mega();
		}
	});

	
	/**
	 * get index of the {item} in the {source} or {order} defined by {sort}
	 * 
	 * @param {any} item		
	 * @param {any[]} source
	 * @param {function} sort	(item, source item ) returns 1,0,-1 whether item is higher,equal,lower than source item
	 * @param {number[]} order	Array of sorted indexes of source
	 *
	 * @returns	number
	 */
	SA.getOrderIndex=function(item,source,sort,order)
	{
		//start in the middle
		var length=(order?order:source).length;
		var jump=Math.ceil(length/2);
		var i=jump;
		var lastJump=null;
		while(jump/*!=0||NaN||null*/&&i>0&&i<=length&&!(jump===1&&lastJump===-1))
		{
			lastJump=jump;
			var compare=order?source[order[i-1]] : source[i-1];
			//jump half the size in direction of this sort			(if equals jump 1 to conserv the order)
			jump=Math.ceil(Math.abs(jump)/2)*Math.sign(sort(item,compare)) ||1;
			i+=jump;
			if((i<1||i>length)&&Math.abs(jump)>1)i=Math.max(1,Math.min(length,i));
		}
		i=Math.min(Math.max(i-1,0),length);
		return i
	};
	
	/**
	 * sort simply by using > or < 
	 * @param {boolean} DESC
	 */
	SA.simple=function(DESC)
	{
		return function(a,b){return (DESC?-1:1)*( (a>b) ? 1 : (a<b) ? -1 : 0)};
	};

	/**
	 * sort the values returned by getter simply by using > or < 
	 * @param {function} getter
	 * @param {boolean} DESC
	 */
	SA.simpleGetter=function(getter,DESC)
	{
		return function(_a,_b)
		{
			var a=getter(_a),b=getter(_b);
			return (DESC?-1:1)*( (a>b) ? 1 : (a<b) ? -1 : 0);
		};
	};
	
	SMOD("SortedArray",SA);
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);