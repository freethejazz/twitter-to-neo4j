var config = require('./config');
var connector = require('./support');

function genericErr(err) {
  console.log(err);
}

connector.cypherGetUnconnectedUsersForHandle(config.targetHandle)
  .then(function(list){
    connector.getWebForHandles(list);
  },
genericErr);
