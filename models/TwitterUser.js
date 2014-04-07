var ignoreRegex = /profile/;

function TwitterUser(data) {
  this._data = data;
}

//Add a static method for processing lots of these
//at once without having to call the constructor
//first
TwitterUser.staticToNeoData = function(data) {
  return TwitterUser.prototype.toNeoData.apply({_data: data});
};

TwitterUser.prototype.toNeoData = function() {
  var outputObj = {};
  var _data = this._data;

  for(var key in _data) {
    if(_data.hasOwnProperty(key)) {

      //skip objects and profile details
      if(typeof _data[key] == 'object' || ignoreRegex.test(key)) {
        continue;
      }

    outputObj[key] = _data[key]
    }
  }

  return outputObj;
};

module.exports = TwitterUser;
