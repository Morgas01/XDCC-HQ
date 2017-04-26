require("../lib/NIWA-Download/Download");
var XDCCdownload=require("../js/XDCCdownload");

var manager=new (require("../lib/NIWA-Download/Manager"))({
	DBClassDictionary:[XDCCdownload]
});

module.exports=manager.serviceMethods;

manager.serviceMethods.deleteByState=function(param)
{
	if(param.method!=="DELETE") return "http method must be DELETE";
	if(param.data in XDCCdownload.states) return manager.delete({XDCCdownload:{state:XDCCdownload.states[param.data]}});
	else return "unknown state: "+param.data;
};