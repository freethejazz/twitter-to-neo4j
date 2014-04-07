var config = require('./config');
var connector = require('./support');

function genericErr(err) {
  console.log(err);
}

connector.getUserFromTwitter(config.targetHandle)
  .then(connector.cypherUpsertOne)
  .then(connector.getWebForHandle)
  .then(function() {
    console.log('List completed for ' + targetHandle);
}, genericErr);
