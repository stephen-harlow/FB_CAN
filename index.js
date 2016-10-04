'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
var phantom = require('phantom');

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
var Nightmare = require('nightmare');
var Caller = function(query, caller){
  var nightmare = Nightmare({ show: false })
  var value = null
  var doc = null
  var night = Nightmare();
  night.goto('https://www.justwatch.com/us/search?q=' + query)
  .wait('.main-content__list-element')
  .evaluate(function () {
    return document.querySelector('.main-content--list').innerHTML;
    // return
  })
  .end()
  .then(function (result) {
    value = result;
    caller(result);
    // console.log(value);
  })
  .catch(function (error) {
    console.error('Search failed:', error);
  });
}


function getText(text){
  var site_content = null;
  var sitepage = null;
  var phInstance = null;
  console.log("Searching")
  Caller(text, function(param){
    console.log("Returning first 100 characters");
    return param.substring(0, 100);
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
      // console(.substring(0, 200));
      sendTextMessage(sender,getText(text)+ "****** echo: " +text.substring(0, 200))
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
