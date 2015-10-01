(function(µ,SMOD,GMOD,HMOD,SC){
	
	µ.NodeJs=µ.NodeJs||{};
	var util=µ.NodeJs.util=µ.NodeJs.util||{};
	
	
	mdoule.exports=function(options)
	{
		var rtn={};
		var args=process.argv.slice();
		next:for(var o in options)
		{
			var names=options[o].names||[o];
			for(var n=0;n<names.length;n++)
			{
				var index=args.indexOf(names[n]);
				if(index!==-1)
				{
					if(options[o].type==="boolean")
					{
						rtn[o]=true;
						args.splice(index,1);
					}
					else
					{
						rtn[o]=args[index+1]
						args.splice(index,2);
					}
					continue next;
				}
			}
			rtn[o]=options[o].type!=="boolean"&&options[o].value;
		}
		return rtn;
	};
	
	
})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);