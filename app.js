request = require('request');
fs = require('fs');
path = require('path');

var accessToken = process.env.NEST_ACCESS_TOKEN;
var snapshotUrl = process.env.NEST_SNAPSHOT_URL;

function saveSnapshot(filename) {
  return new Promise(function(fulfill, reject) {

    if (!snapshotUrl) {
      err = 'NEST_SNAPSHOT_URL not set - Exiting'; 
      console.log(err);
      reject(err);
    }

    request(snapshotUrl, function() {
      console.log(filename + " saved");
      fulfill();
    }) 
      .on('error', reject)
      .pipe(fs.createWriteStream(filename))
  });
}

function burstCapture(numCaptures, period, baseDir) {
  if (!baseDir) baseDir = "images";
  if (!period) period = 1000;
  var captureCount = 0;
  
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir);
  }

  capture = async function() {
    filename = path.join(baseDir, Math.floor(new Date()) + '.jpg');

    try {
      await saveSnapshot(filename);
    } catch(err) {
      console.log('Could not complete capture: ' + err);
    }

    captureCount++;
    if (captureCount == numCaptures) {
      clearInterval(timeout);
      console.log("Exiting - Attempted " + captureCount + " captures.");
    }
  };
  
  var timeout = setInterval(capture, 3000);
  return timeout;
}

burstCapture(100, 500, 'positive')
