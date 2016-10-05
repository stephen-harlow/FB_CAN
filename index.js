'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
const Nightmare = require('nightmare');
const Fuse = require("fuse.js");
const req = unirest("GET", "http://watchi.ly/ajaxSearch.php");

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

  req.query({
    "keywords": query.split("::")[0]
  });

  req.headers({
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

    req.send("{\"content_types\":null,\"presentation_types\":null,\"providers\":null,\"genres\":null,\"languages\":null,\"release_year_from\":null,\"release_year_until\":null,\"monetization_types\":[\"flatrate\",\"ads\",\"free\",\"rent\",\"buy\",\"cinema\"],\"min_price\":null,\"max_price\":null,\"scoring_filter_types\":null,\"cinema_release\":null,\"query\":\"jurassic\"}");

  req.end(function (res) {
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
    var fuse = new Fuse(res.body, options)
    console.log("\n\n\n\n\n\n\n")
    callback(fuse.search(query.split("::")[1]));
  });
}

app.post('/webhook/', function (req, res) {


  let messaging_events = req.body.entry[0].messaging
  for (let i = 0; i < messaging_events.length; i++) {
    let event = req.body.entry[0].messaging[i]
    let sender = event.sender.id
    if (event.message && event.message.text) {
      let text = event.message.text
      console.log(text.substring(0,200));
      console.log("Searching")
      Caller(text, function(param){
        console.log("Returning first 100 characters");
        sendTextMessage(sender,getText(param.substring(0, 100))+ "****** echo: " +text.substring(0, 200))
      });
      // console(.substring(0, 200));

    }

  }
  res.sendStatus(200)
})

const token = process.env.ACCESS_TOKEN
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
