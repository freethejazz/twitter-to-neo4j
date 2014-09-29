var config = require('./config');
var connector = require('./support');

function genericErr(err) {
  console.log(err);
}

connector.cypherGetUnconnectedFriendsForHandle(config.targetHandle)
  .then(function(list){
    console.log(list);
    var newList = list.splice(0, 2);
    return connector.getWebForHandles(newList);
  },
  //.then(connector.getWebForHandle)
  //.then(function() {
  //  console.log('List completed for ' + targetHandle);
genericErr);
