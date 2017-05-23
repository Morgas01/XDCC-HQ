
var SC=µ.shortcut({
	Config:"Config",
	File:"File"
});

var config=SC.Config.parse({
	"create Package":{
		type:"boolean",
		default:true
	},
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
		max:50000,
		default:15000
	},
	"search sources":{
		type:"map",
		model:{
			type:"boolean",
			default:true
		}
	},
	"maximum Downloads":{
		type:"number",
		min:-1,
		default:-1
	}
});

module.exports=µ.getModule("configManager")(config);
module.exports.config=config;

new SC.File("subOffices").listFiles().then(function(subOfficeList)
{

	var searchSources=config.get("search sources");
	for(var subOffice of subOfficeList)
	{
		searchSources.add(subOffice);
	}
});