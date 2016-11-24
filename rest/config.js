
var SC=µ.shortcut({
	Config:"Config",
	File:"File"
});

var config=SC.Config.parse({
                               
	"append CRC32":{
		type:"boolean",
		default:true
	},
	"check name":{
		type:"boolean",
		default:true
	},
	"clean name":{
		type:"boolean",
		default:true
	},
	"file expiration":{
		type:"number",
		min:0,
		default:6
	},
	"search timeout":{
		type:"number",
		min:500,
		default:15000
	},
	"search sources":{
		type:"map",
		model:{
			type:"boolean",
			default:true
		}
	}
});

module.exports=worker.configManager(config);
module.exports.config=config;

new SC.File("subOffices").listFiles().then(function(subOfficeList)
{

	var searchSources=config.get("search sources");
	for(var subOffice of subOfficeList)
	{
		searchSources.add(subOffice);
	}
});