var http = require('http');
var https = require('follow-redirects').https;
var path = require('path');

var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var NestStrategy = require('passport-nest').Strategy;
var session = require('express-session');
var fs = require('fs');
var request = require('request');

// This secret is used to sign session ID cookies.
var SUPER_SECRET_KEY = 'keyboard-cat';

// PassportJS options
var passportOptions = {
  failureRedirect: '/auth/failure',
};

// Read Nest API credentials from environment variables.
passport.use(new NestStrategy({
  clientID: process.env.NEST_ID,
  clientSecret: process.env.NEST_SECRET
}));

/**
 * No user data is available in the Nest OAuth
 * service, just return the empty user object.
 */
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

var app = express();

app.use(cookieParser(SUPER_SECRET_KEY));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: SUPER_SECRET_KEY,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

/*
 * Returns a Promise containing the SnapshotUrl
 */
function getSnapshotUrl(token) {
  path = 'https://developer-api.nest.com/devices?auth=' + token;

  return new Promise(function(fulfill, reject) {
    request(path, function(err, res, data) {
      body = JSON.parse(data);
      if ((!body) || (!body['cameras'])) {
        error = 'Error while parsing response: ' + err; 
        console.log(err);
        reject(err);
      }

      cameras = body['cameras'];
      if (Object.keys(cameras).length > 1) {
        console.log('More than one camera detected; choosing first one');
      }

      camera = cameras[Object.keys(cameras)[0]];
      url = camera['snapshot_url'];

      fulfill(url);
    });
  });
}

function downloadImageAndSave(snapshotUrl, filename) {
  request.head(snapshotUrl, function(err, res, body) {
    request(snapshotUrl).pipe(fs.createWriteStream(filename));
  });
}

/**
 * Listen for calls and redirect the user to the Nest OAuth
 * URL with the correct parameters.
 */
app.get('/capture', function(req, res) {
  var token = req.cookies['nest_token'];
  if (!token) {
    console.log('Not signed in.');
    res.redirect('/')
  }
  var filename = 'temp.jpg';
  var snapshotUrl = req.cookies['nest_camera_snapshot_url'];
  if (!snapshotUrl) {
    console.log('Snapshot Url not found');
    getSnapshotUrl(token).then(function(snapshotUrl) {
      res.cookie('nest_camera_snapshot_url', url);
      downloadImageAndSave(snapshotUrl, filename); 
      res.send('Done');
    }, function(err) {
      console.log('Was not able to obtain snapshot URL: ' + err);
    });
  } else {
    downloadImageAndSave(snapshotUrl, filename); 
    res.send('Done');
  }
});

/**
 * Listen for calls and redirect the user to the Nest OAuth
 * URL with the correct parameters.
 */
app.get('/auth/nest', passport.authenticate('nest', passportOptions));

/**
 * Upon return from the Nest OAuth endpoint, grab the user's
 * accessToken and set a cookie so browser can access it, then
 * return the user back to the root app.
 */
app.get('/auth/nest/callback', passport.authenticate('nest', passportOptions),
  function(req, res) {
    res.cookie('nest_token', req.user.accessToken);
    res.redirect('/');
});

/**
 * When authentication fails, present the user with
 * an error requesting they try the request again.
 */
app.get('/auth/failure', function(req, res) {
  console.log('Authentication failed. Status code: ' + res.statusCode);
  res.send('Authentication failed. Please try again.');
});

/**
 * Get port from environment and store in Express.
 */
var port = process.env.PORT || 3000;
app.set('port', port);

/**
 * Create HTTP server.
 */
var server = http.createServer(app);

server.on('listening', function() {
  console.log('Listening on port ' + server.address().port);
});

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
