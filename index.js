'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
const Nightmare = require('nightmare');
const unirest = require("unirest");
const fs = require("fs");
const Fuse = require("fuse.js");
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
    if (event.message && event.message.text || event.postback) {
      if (event.postback) {
        if(event.postback.payload.split("::-[]")[0] == "DECIDER"){
          console.log("PASSING THROUGH: " + event.postback.payload)
          SearchforTitle(event.postback.payload.split("::-[]")[1], sender, true, parseInt(event.postback.payload.split("::-[]")[2]))
        }
        else{
        let text = JSON.stringify(event.postback)

        sendTextMessage(sender, "Welcome to the App. Currently, to search movies, type in the movie name", "REGULAR")
        continue
        }
      }
      else{
        // let text = replaceAll(event.message.text, " ", "+")
        SearchforTitle(event.message.text, sender, false, 0)

      }

      // console(.substring(0, 200));

    }

  }
  res.sendStatus(200)
})
function SearchforTitle(title, sender, pass, spec_id){
  console.log(title);
  console.log("Searching")
  Caller(title, sender, pass, spec_id, function(param){
    console.log("Returning Characters");
    sendGenericMessage(sender, param)
  });
}
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
var Caller = function(query, sender, pass, spec_id, caller){
  const reqer = unirest("POST", "https://api.justwatch.com/titles/en_US/popular");

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
    if (res.error) {
      Caller(query, caller);
    }
    // console.log(res.body);
    /**
    *
    */
    var options = {
      include: ["score"],
      keys: [{
        name: 'title',
        weight: 0.5
      },{
        name: 'original_release_year',
        weight: .45
      }, {
        name: 'credits.name',
        weight: 0.55
      }, {
        name: 'sources.source',
        weight: 0.45
      }], threshold: 0.5,
    };//Search WEIGHT
    //13 Title, 7 for " (YEAR)"
    var s = res.body["items"]

    if(pass){
      s = s.filter(function (el) {
        return el..id == spec_id;
      });
    }
    if(s.length == 1 || (pass && s.length > 0)){
      caller(s[0]);
    }
    else if(s.length > 1){
      var fuse = new Fuse(s, options)

      s = fuse.search(query)
      var viable =  s.slice(0, Math.min(8, s.length));
      var butts = []
      for (var i = 0; i < viable.length; i++) {
        //::-[]
        var norm = viable[i].item.title
        var mainer = GenMainCard(viable[i].item)
        var yearer = " (" + viable[i].item.original_release_year + ")"
        var id = viable[i].item.id;
        var seper = "::-[]"
        var button = [{
            "type":"postback",
            "title":"Choose This Movie",
            "payload":"DECIDER" + seper + norm + yearer + seper + id
          }]
          mainer.buttons = button;
          butts.push(mainer)
        // viable[i]
      }
      var load = {
        "template_type": "generic",
        "elements":butts
      }
      var textual = "These are the top results that I have come up with. Do these match what you are looking for? If not, you can always repeat your search with a different title."
      let messageData = { text:textual }

      sendPayload(sender, messageData, "NO_PUSH")
      sendMessageWithLoad(sender, load);
    }


  });
}



function sendTextMessage(sender, text, notetype) {
  //Basic Text Message
  let messageData = { text:text }
  sendPayload(sender, messageData, notetype)
}

function GenMainCard(mediaEntity){
  var card = {};
  card["title"] = mediaEntity.title + " (" + mediaEntity.original_release_year + ")";
  if(mediaEntity.credits != null && mediaEntity.credits.length > 0){
    console.log(mediaEntity.credits.length)

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
  if(mediaEntity.poster != null){
    card["image_url"] = "https://static.justwatch.com"+mediaEntity["poster"].replace("{profile}", "s592/")//Get the Larger version of the Poster
  }
  else{
    card.subtitle += "(No Image Available)"
  }
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
  var ret = {};
  var given_id = Entity.provider_id;
  var arrFound = providers.filter(function(item) {
    return item.id == given_id;
  })[0];
  ret["image_url"] = arrFound["icon_url"]
  ret["title"] = arrFound["clear_name"]
  ret["subtitle"] = ""
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

    return sendTextMessage(sender, "No Results", "REGULAR");
  }
  if(s.item != null){
    s = s.item;  var providers = JSON.parse(fs.readFileSync('prov.json', 'utf8'));

  }
  console.log("_____________ DEBUGGING ________________")
  var arrayLength = s["offers"].length;
  var buttons = []
  buttons.push(GenMainCard(s))
  var text = "";
  var searched = []
  for (var i = 0; i < arrayLength; i++) {
    var arr = genSource(s["offers"][i], providers)
    var source = arr[0]

    var expert = arr[1]
    var ind = -1;

    var arrFound = buttons.filter(function(item) {
      return item.title == source.title;
    });
    if(arrFound.length > 0){
      ind = buttons.indexOf(arrFound[0])
    }

    if(arrFound.length > 0 ){

      if(source.buttons[0].title == "Flatrate"){
        continue
      }
      if(buttons[ind].buttons.length < 3){ //Limit to 3 buttons, otherwise, there must be a new name
        var flag = false;
        for (var j = 0; j < buttons[ind].buttons.length; j++) {
          if(buttons[ind].buttons[j].title == source.buttons[0].title){ //there are multiple of the same thing
            flag = true;
            searched.push(expert);
          }
        }
        if(flag == false){
          buttons[ind].buttons.push(source.buttons[0])

          searched.push(expert);


        }
      }
    }
    else{
      if(buttons.length > 0 && source.title == "Flatrate"){
        continue
      }
      else{
        searched.push(expert);
        buttons.push(source)

      }
    }
    if(source.subtitle != null){

      if(ind != -1){
        var uniqueArray = searched.unique();

        buttons[ind].subtitle = uniqueArray.join(", ")
    }


    // if(source.subtitle.substr(source.subtitle.length-1,source.subtitle.length) == ','){
    //   source.subtitle = source.subtitle.substr(0, source.subtitle.length-2)
    // }

  }
  }

  if(buttons.length > 10){
    buttons = buttons.slice(0, 10);
  }
  var load = {
    "template_type": "generic",
    "elements":buttons
  }
  sendMessageWithLoad(sender, load);


}
function sendMessageWithLoad(sender, load){
  let messageData = {
    "attachment": {
      "type": "template",
      "payload": load
    }
  }
  sendPayload(sender, messageData, "")
}
function sendPayload(sender, payload, notetype){
    if(notetype == ""){notetype = "REGULAR"}


  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:token},
    method: 'POST',
    json: {
      recipient: {id:sender},
      message: payload,
      notification_type: notetype
    }
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending messages: ', error)
    } else if (response.body.error) {

      console.log('Error: ', response.body.error)
    }
  })
}
