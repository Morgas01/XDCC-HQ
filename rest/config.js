
let FS=require("fs");

let SC=µ.shortcut({
	Config:"Config",
	File:"File"
});

let config=SC.Config.parse({
	"search":{
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
		}
	},
	"download":{
		"download folder":{
			type:"string",
			validate:function(path)
			{
				if (FS.existsSync(path)) return true;
				return "path does not exist";
			}
		},
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
		"maximum Downloads":{
			type:"number",
			min:-1,
			default:-1
		}
	}
});

module.exports=µ.getModule("configManager")(config);
module.exports.config=config;

new SC.File("subOffices").listFiles().then(function(subOfficeList)
{
	return module.exports.ready.then(function()
	{
		let searchSources=config.get(["search","search sources"]);
		for(let subOffice of subOfficeList)
		{
			if(!searchSources.get(subOffice)) searchSources.add(subOffice);
		}

		for(let key of searchSources.keys())
		{
			if(subOfficeList.indexOf(key)==-1)
			{
				searchSources.remove(key);
			}
		};
	});
})
.catch(e=>µ.logger.error({error:e},"error adding subOffices"));