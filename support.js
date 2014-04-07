var Twit = require('twit');
var Q = require('q');
var TUser = require('./models/TwitterUser');
var cypherQueries = require('./cypher/queries');
var config = require('./config');
var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(config.neo4j.dbPath || 'http://localhost:7474');
var T = new Twit(config.twitterAuth);
var connector = module.exports;

var getRateLimitInfo = function(resp) {
  if(!resp || !resp.headers) {
    // crudely waiting blindly.  The exact time for the rate limit reset is
    // available on the response object, but the twit module doesn't return
    // the response when an error happens.  Issue already logged.
    // https://github.com/ttezel/twit/pull/93
    return {
      remainingRequests: 0,
      resetMs: Date.now() + (5 * 60 * 1000)
    };
  }

  return {
    remainingRequests: resp.headers['x-rate-limit-remaining'],
    resetMs: resp.headers['x-rate-limit-reset'] * 1000 + 1000 // add a 1 second buffer
  };
};

var scheduleNextCall = function(rateLimitInfo, nextMethod, optParam){
  if(rateLimitInfo.remainingRequests == 0) {
    logger('Rate Limit Exceeded, waiting until '+ (new Date(rateLimitInfo.resetMs)));
    return setTimeout(nextMethod, rateLimitInfo.resetMs - Date.now(), optParam);
  } else {
    return nextMethod();
  }
};

var logger = function(msg) {
  console.log(new Date() + ' - ' + msg);
}

connector.getUserFromTwitter = function(handle) {
  var response = Q.defer();

  T.get('users/lookup', {screen_name: handle}, function(err, reply){
    if(err) {
      return response.reject(err);
    }
    response.resolve(new TUser(reply[0]));
  });

  return response.promise;
}

connector.cypherUpsertOne = function(user) {
  var response = new Q.defer();
  var userMap = user.toNeoData();
  db.query(cypherQueries.upsertOne, {userMap: userMap, screenName: userMap.screen_name},
      function(err, arr){
        if(err) {
          response.reject(err)
        } else {
          response.resolve(userMap.screen_name);
        }
      });
  return response.promise;
}

connector.getWebForHandle = function(screen_name){
  var response = new Q.defer();
  var next_cursor = -1;
  logger('getting web for ' + screen_name);

  function getFollowerBatch(){
    logger('Starting HTTP request');

    T.get('followers/list', {screen_name: screen_name, count: 2, cursor: next_cursor, skip_status: true}, function(err, reply, resp){
      var rateLimitInfo = getRateLimitInfo(resp), userList;

      if(err) {
        if(err.code == 88) {
          scheduleNextCall(rateLimitInfo, getFollowerBatch);
        } else {
          response.reject(err);
        }
      } else {
        logger('Follow request completed, ' + rateLimitInfo.remainingRequests + ' requests remaining before rate limiting');

        userList = reply.users.map(TUser.staticToNeoData);

        logger('Starting DB Query');

        db.query(cypherQueries.upsertManyAndFollows, {followers: userList, screenName: screen_name}, function(err, arr){
            logger('DB request completed');

            if(err) {
              response.reject(err)
            } else if(reply.next_cursor) {
              next_cursor = reply.next_cursor;

              scheduleNextCall(rateLimitInfo, getFollowerBatch);
            } else {
              next_cursor = -1;

              return getFriendBatch();
            }
          });
      }
    });
  }

  function getFriendBatch(){
    logger('Starting HTTP request');

    T.get('friends/list', {screen_name: screen_name, count: 200, cursor: next_cursor, skip_status: true}, function(err, reply, resp){
      var rateLimitInfo = getRateLimitInfo(resp), userList;

      if(err) {
        if(err.code == 88) {
          scheduleNextCall(rateLimitInfo, getFriendBatch);
        } else {
          response.reject(err);
        }
      } else {
        userList = reply.users.map(TUser.staticToNeoData);

        logger('Friend request completed, ' + rateLimitInfo.remainingRequests + ' requests remaining before rate limiting');
        logger('Starting DB Query');

        db.query(cypherQueries.upsertManyAndFriends, {friends: userList, screenName: screen_name}, function(err, arr){
            logger('DB request completed');

            if(err) {
              response.reject(err)
            } else if(reply.next_cursor) {
              next_cursor = reply.next_cursor;

              scheduleNextCall(rateLimitInfo, getFriendBatch);
            } else {
              response.resolve();
            }
          });
      }
    });
  }
  getFollowerBatch();
  return response.promise;

}
