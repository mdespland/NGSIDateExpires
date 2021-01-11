#!/usr/bin/env node 
'use strict';
const yargs = require('yargs')
const axios = require('axios');
const { exit } = require('yargs');

var Config = {
    OrionService: "",
    OrionServicePath: "",
    OrionAPI: "",
    SearchType: "",
    Days:7
}


async function sendRequest(request, expected) {
    var response;
    if (Config.OrionService != "") request.headers["Fiware-Service"] = Config.OrionService;
    if (Config.OrionServicePath != "") request.headers["Fiware-ServicePath"] = Config.OrionServicePath;
    try {
        response = await axios.request(request);
    } catch (error) {
        return Promise.reject(error)
    }
    if (response.status === expected) {
        return response;
    } else {
        return Promise.reject(response.status + " " + response.statusText)
    }
}

async function searchEntities() {
    var orion = Config.OrionAPI;
    var request = {
        method: 'GET',
        url: orion + "/v2/entities?type="+Config.SearchType+"&attrs=dateCreated,dateExpires&q=!dateExpires",
        headers: {},
        json: true
    };
    try {
        var response = await sendRequest(request, 200);
        return response.data;
    } catch (error) {
        return Promise.reject("No entity found "+console.log(JSON.stringify(error)))
    }
}


async function updateEntity(id, dateExpires) {
    var orion = Config.OrionAPI;
    var attrs={
        "dateExpires": {
          "value": dateExpires,
          "type": "DateTime"
        }
      };
    var request = {
        method: 'POST',
        url: orion + "/v2/entities/"+id+"/attrs",
        headers: {
            "Content-Type": "application/json"
        },
        data: JSON.stringify(attrs),
        json: true
    };
    try {
        var response = await sendRequest(request, 204);
        return true;
    } catch (error) {
        return Promise.reject("Can't update entity: " + error)
    }
}

const argv = yargs
    .option('orion', {
        alias: 'O',
        description: 'Orion target',
        type: 'string',
        requiresArg: true
    })
    .option('type', {
        alias: 'T',
        description: 'The type to update',
        type: 'string',
    })
    .option('days', {
        alias: 'D',
        description: 'Day to add to creation date',
        type: 'number',
    })
    .option('dry', {
        alias: 'd',
        description: 'Dry Run',
        type: 'boolean',
    })
   .help()
    .alias('help', 'h')
    .argv;

if (!argv.orion) {
    console.log("Missing orion server")
    exit(1);
}

if (!argv.type) {
    console.log("Missing type to update")
    exit(1);
}

if (!argv.days) {
    console.log("Missing number of days to add to dateCreated")
    exit(1);
}
Config.OrionAPI=argv.orion;
Config.SearchType=argv.type;
Config.Days=argv.days;


//Search matching entities
(async () => {
    var found=true;
    while (found) {
        found=false;
        var list=await searchEntities();
        list.forEach(entity => {
            var date=new Date(entity.dateCreated.value);
            var expire=new Date(date);
            expire.setDate(date.getDate() + Config.Days);
            
            if (argv.dry) {
                console.log( "Entity "+entity.id+ " of "+ entity.type+ " created : "+ date.toISOString()+ " expire :"+expire.toISOString())
            } else {
                updateEntity(entity.id, expire.toISOString());
                console.log( "Updated Entity "+entity.id+ " of "+ entity.type+ " created : "+ date.toISOString()+ " expire :"+expire.toISOString())
                found=true;
            }
        });
    }
})().catch(error => {
    console.log("An error occurs : " + error)
});