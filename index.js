'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
const Nightmare = require('nightmare');
const unirest = require("unirest");
const fs = require("fs");
const Fuse = require("fuse.js");
const reqer = unirest("POST", "https://api.justwatch.com/titles/en_US/popular");
const token = process.env.ACCESS_TOKEN

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
  res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
  if (req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    res.send(req.query['hub.challenge'])
  }
  res.send('Error, wrong token')
})
app.post('/webhook/', function (req, res) {


  let messaging_events = req.body.entry[0].messaging
  for (let i = 0; i < messaging_events.length; i++) {
    let event = req.body.entry[0].messaging[i]
    let sender = event.sender.id
    if (event.message && event.message.text) {
      let text = replaceAll(event.message.text, " ", "+")
      console.log(text);
      console.log("Searching")
      Caller(text, function(param){
        console.log("Returning Characters");
        sendGenericMessage(sender, param)
      });
      // console(.substring(0, 200));

    }
    if (event.postback) {
      let text = JSON.stringify(event.postback)

      sendTextMessage(sender, "Welcome to the App. Currently, to search movies, type in the movie name", token)
      continue
    }
  }
  res.sendStatus(200)
})
// Spin up the server
app.listen(app.get('port'), function() {
  console.log('running on port', app.get('port'))
})

function replaceAll(str, find, replace) {//Replace ALL Function
  return str.replace(new RegExp(find, 'g'), replace);
}
String.prototype.toProperCase = function () {
  return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};//Used for Buy
Array.prototype.unique = function() {
    return this.reduce(function(accum, current) {
        if (accum.indexOf(current) < 0) {
            accum.push(current);
        }
        return accum;
    }, []);
}
var Caller = function(query, caller){

  reqer.headers({
    "cache-control": "no-cache",
    "accept-language": "en-US,en;q=0.8",
    "accept-encoding": "gzip, deflate, br",
    "referer": "https://www.justwatch.com/us?providers=itu,ply,vdu,nfx,amp,amz,mbi,crk,rlz,hlu,pls,fnd,hbn,epx,sho,stz,msf,tbv,amc,tcw,viewyahoo",
    "content-type": "application/json;charset=UTF-8",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36",
    "origin": "https://www.justwatch.com",
    "accept": "application/json, text/plain, */*"
  });
  reqer.send("{\"content_types\":null,\"presentation_types\":null,\"providers\":null,\"genres\":null,\"languages\":null,\"release_year_from\":null,\"release_year_until\":null,\"monetization_types\":[\"flatrate\",\"ads\",\"free\",\"rent\",\"buy\",\"cinema\"],\"min_price\":null,\"max_price\":null,\"scoring_filter_types\":null,\"cinema_release\":null,\"query\":\"" + query.split(' ').join(" ") + "\"}");
  reqer.end(function (res) {
    if (res.error) throw new Error(res.error);
    // console.log(res.body);
    /**
    *
    */
    var options = {
      keys: [{
        name: 'title',
        weight: 0.5
      }, {
        name: 'credits.name',
        weight: 0.55
      }, {
        name: 'sources.source',
        weight: 0.45
      }], threshold: 0.5,
    };//Search WEIGHT
    var fuse = new Fuse(res.body["items"], options)
    var s = fuse.search(query)[0]
    console.log("\n\n\n" + s);
    caller(s);
  });
}



function sendTextMessage(sender, text) {
  //Basic Text Message
  let messageData = { text:text }
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:token},
    method: 'POST',
    json: {
      recipient: {id:sender},
      message: messageData,
    }
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending messages: ', error)
    } else if (response.body.error) {
      console.log('Error: ', response.body.error)
    }
  })
}

function GenMainCard(mediaEntity){
  var card = {};
  card["title"] = mediaEntity.title + " (" + mediaEntity.original_release_year + ")";
  console.log(mediaEntity.credits.length)
  if(mediaEntity.credits.length > 2){
    var nums = Math.min(mediaEntity.credits.length, 3) //Only take top 3 Actors for Subtitle
    var start = 0;
    var subtitle = ""
    while(start != nums){
      subtitle = subtitle + "" + mediaEntity.credits[start].name;//Append Name
      if(start != nums-1){
        subtitle += ", "; //If not at the end, add a comma
      }
      start = start + 1; //Increment and repeat
    }
    card["subtitle"] = subtitle;//Set

  }
  else{
    card["subtitle"] = "Search Result"; //If there are no actors
  }
  card["image_url"] = "https://static.justwatch.com"+mediaEntity["poster"].replace("{profile}", "s592/")//Get the Larger version of the Poster

  if (mediaEntity.full_path != null) { //Source and Cite
    var butt = [{
      "type": "web_url",
      "url": "https://www.justwatch.com" + mediaEntity.full_path,
      "title": "View on JustWatch"
    }]

    card["buttons"] = butt
  }
  return card

}
function genSource(Entity, providers){
  console.log(Entity)
  var ret = {};
  var given_id = Entity.provider_id;
  var arrFound = providers.filter(function(item) {
    return item.id == given_id;
  })[0];
  ret["image_url"] = arrFound["icon_url"]
  ret["title"] = arrFound["clear_name"]
  var base = "";
  var type = "";
  if(typeof Entity.retail_price !== "undefined"){
    base = " $" + Entity.retail_price + ""
    type = " " + Entity.presentation_type.toUpperCase()
  }
  var extra = "";
  if(Entity.monetization_type.toProperCase() != "Flatrate"){
    extra = ":";
  }
  ret.buttons = [{
    "type": "web_url",
    "url": Entity["urls"]["standard_web"],
    "title":  Entity.monetization_type.toProperCase()
  }]
  return [ret, Entity.monetization_type.toProperCase() + extra + base + type];
}

function sendGenericMessage(sender, results) {
  var providers = JSON.parse(fs.readFileSync('prov.json', 'utf8'));

  var s = results;
  if(s == null){
    return sendTextMessage(sender, "No Results");
  }
  var arrayLength = s["offers"].length;
  var buttons = []
  buttons.push(GenMainCard(s))
  var text = "";
  var searched = []
  for (var i = 0; i < arrayLength; i++) {
    var arr = genSource(s["offers"][i], providers)
    var source = arr[0]
    var expert = arr[1]
    var arrFound = buttons.filter(function(item) {
      return item.title == source.title;
    });
    if(arrFound.length > 0 ){
      if(source.buttons[0].title == "Flatrate"){
        continue
      }
      console.log(arrFound)
      var ind = buttons.indexOf(arrFound[0]);
      if(buttons[ind].buttons.length < 3){ //Limit to 3 buttons, otherwise, there must be a new name
        var flag = false;
        for (var j = 0; j < buttons[ind].buttons.length; j++) {
          if(buttons[ind].buttons[j].title == source.buttons[0].title && buttons[ind].subtitle.indexOf(expert) == -1){ //there are multiple of the same thing
            flag = true;
            buttons[ind].subtitle += ", " + expert
            searched.push(expert);
          }
        }
        if(flag == false){
          buttons[ind].buttons.push(source.buttons[0])
          buttons[ind].subtitle += ", " + expert;
          searched.push(expert);

        }
      }
      else{
        source.subtitle = expert
        searched.push(expert);

        buttons.push(source)
      
      }
    }
    else{
      if(buttons.length > 0 && source.title == "Flatrate"){
        continue
      }
      else{
        source.subtitle = expert
        searched.push(expert);

        buttons.push(source)

      }
    }
    if(source.subtitle != null){
      if(source.subtitle.indexOf("Flatrate") == -1){
        var uniqueArray = searched.unique();

        uniqueArray.sort(function(a, b){
            a = a.replace(/[[$0-9.]]/, '');
            b = b.replace(/[[$0-9.]]/, '');
            if( parseInt(a) < parseInt(b) ) return -1;
            if( parseInt(a) > parseInt(b) ) return 1;
            return 0;
        });

        source.subtitle = uniqueArray.join(", ")
      // if(source.subtitle.substr(source.subtitle.length-1,source.subtitle.length) == ','){
      //   source.subtitle = source.subtitle.substr(0, source.subtitle.length-2)
      // }
    }
  }
  }
  console.log(JSON.stringify(s))

  if(buttons.length > 10){
    buttons = buttons.slice(0, 10);
  }
  let messageData = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements":buttons
      }
    }
  }

  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:token},
    method: 'POST',
    json: {
      recipient: {id:sender},
      message: messageData,
    }
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending messages: ', error)
    } else if (response.body.error) {

      console.log('Error: ', response.body.error)
    }
  })


}
