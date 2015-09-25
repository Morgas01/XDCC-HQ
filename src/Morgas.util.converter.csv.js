(function(µ,SMOD,GMOD,HMOD,SC){

    var util=µ.util=µ.util||{};
    var uCon=util.converter||{};
	uCon.csv={
		to:function(){
			//TODO
		},
		defaultSeperator:",",
		from:function(csvData,columnNames,seperator)
		{
			csvData+="";
			
			seperator=seperator||uCon.csv.defaultSeperator;
			var cellEXP=new RegExp('(?:"((?:[^"]|"")*)"|([^"\r\n'+seperator+']*))'+seperator+'?','g'), cleanUpEXP=/"(")/g;

			var rtn={
				data:[],
				columns:columnNames||[]
			};
			
			var item={_line:"",_overflowCells:[]};
			var cellIndex=0,isFirstLine=!columnNames,match=null;
			while((match=cellEXP.exec(csvData))!==null)
			{
				if(match[0]==="")
				{//line end
					while(csvData[cellEXP.lastIndex]==="\r"||csvData[cellEXP.lastIndex]==="\n") cellEXP.lastIndex++;
					if(isFirstLine) isFirstLine=false;
					else
					{
						for(;cellIndex<rtn.columns.length;cellIndex++)item[rtn.columns[cellIndex]]=null;
						rtn.data.push(item);
						item={_line:"",_overflowCells:[]};
						cellIndex=0;
					}
					if(cellEXP.lastIndex>=csvData.length) break;
				}
				else
				{//next cell
					var value=null;
					if(match[1]) value=match[1].replace(cleanUpEXP,"$1");
					else value=match[2];
					if(isFirstLine)
					{
						rtn.columns.push(value);
					}
					else
					{
						item._line+=match[0];
						if(cellIndex<rtn.columns.length)
						{
							item[rtn.columns[cellIndex]]=value;
						}
						else item._overflowCells.push(value);

						cellIndex++;
					}
				}
			}
			return rtn;
		}
	};
    SMOD("CSV",uCon.csv);

})(Morgas,Morgas.setModule,Morgas.getModule,Morgas.hasModule,Morgas.shortcut);