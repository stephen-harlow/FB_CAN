'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
const Nightmare = require('nightmare');
const unirest = require("unirest");

const Fuse = require("fuse.js");
const reqer = unirest("GET", "http://watchi.ly/ajaxSearch.php");

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
var Caller = function(query, caller){

  reqer.query("keywords="+query.split(' ').join("+"));

  reqer.headers({
    "postman-token": "ef3376d0-c06b-4ed0-338e-66e8f0aaef3f",
    "cookie": "__cfduid=d22ea27c19b5706481d59f2f4881ff9611475628843; watchily=ke0402nmnqn8m9cpgu8o73bnc0; _ga=GA1.2.586505558.1475628844; _gat=1",
    "accept-language": "en-US,en;q=0.8",
    "accept-encoding": "gzip, deflate, sdch",
    "referer": "http://watchi.ly/index.php?search=jurassic",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36",
    "x-requested-with": "XMLHttpRequest",
    "accept": "application/json, text/javascript, */*; q=0.01",
    "cache-control": "no-cache",
    "connection": "keep-alive",
    "host": "watchi.ly"
  });

    reqer.send("{\"content_types\":null,\"presentation_types\":null,\"providers\":null,\"genres\":null,\"languages\":null,\"release_year_from\":null,\"release_year_until\":null,\"monetization_types\":[\"flatrate\",\"ads\",\"free\",\"rent\",\"buy\",\"cinema\"],\"min_price\":null,\"max_price\":null,\"scoring_filter_types\":null,\"cinema_release\":null,\"query\":\"jurassic\"}");

  reqer.end(function (res) {
    if (res.error) throw new Error(res.error);

    // console.log(res.body);
    var options = {
      keys: [{
        name: 'mediaEntity.title',
        weight: 0.5
      }, {
        name: 'mediaEntity.directors',
        weight: 0.55
      }, {
        name: 'sources.source',
        weight: 0.45
      }], threshold: 0.5,
    };
    console.log(reqer.options.url)
    // console.log(JSON.stringify(res.body) + "QUER" + query)
    var fuse = new Fuse(res.body, options)
    caller(fuse.search(query));
  });
}

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

        sendTextMessage(sender, "Welcome to the App. Currently, to search movies, type in the movie name and the search query", token)
        continue
    }
  }
  res.sendStatus(200)
})

const token = process.env.ACCESS_TOKEN
function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}
function sendTextMessage(sender, text) {
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
// Spin up the server
app.listen(app.get('port'), function() {
  console.log('running on port', app.get('port'))
})
function GenMainCard(mediaEntity){
  var card = {};
  console.log(mediaEntity)
  card["title"] = mediaEntity.title + "(" + mediaEntity.certification + ")";
  card["subtitle"] = mediaEntity.directors + "(" + mediaEntity.year + ")";
  card["image_url"] = "http://www.imdb.com/title/" + mediaEntity.imdb_id;

  if (mediaEntity.imdb_id != null) {
    var butt = [{
        "type": "web_url",
        "url": card["image_url"],
        "title": "IMDB"
    }]

    card["buttons"] = butt
  }
  return card;

}
function sendGenericMessage(sender, results) {
    var first_item = results[0];
    var ez = []
    ez.push(GenMainCard(first_item.mediaEntity))
    ez.push.apply({
       "title": "First card",
       "subtitle": "Element #1 of an hscroll",
       "image_url": "http://messengerdemo.parseapp.com/img/rift.png",
       "buttons": [{
           "type": "web_url",
           "url": "https://www.messenger.com",
           "title": "web url"
       }, {
           "type": "postback",
           "title": "Postback",
           "payload": "Payload for first element in a generic bubble",
       }],
   }, {
       "title": "Second card",
       "subtitle": "Element #2 of an hscroll",
       "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
       "buttons": [{
           "type": "postback",
           "title": "Postback",
           "payload": "Payload for second element in a generic bubble",
       }],
   })
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements":ez
            }
        }
    }
    /*
    [{
       "title": "First card",
       "subtitle": "Element #1 of an hscroll",
       "image_url": "http://messengerdemo.parseapp.com/img/rift.png",
       "buttons": [{
           "type": "web_url",
           "url": "https://www.messenger.com",
           "title": "web url"
       }, {
           "type": "postback",
           "title": "Postback",
           "payload": "Payload for first element in a generic bubble",
       }],
   }, {
       "title": "Second card",
       "subtitle": "Element #2 of an hscroll",
       "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
       "buttons": [{
           "type": "postback",
           "title": "Postback",
           "payload": "Payload for second element in a generic bubble",
       }],
   }]*/
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
