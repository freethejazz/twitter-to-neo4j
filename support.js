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
    // This should never happen
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
  if(rateLimitInfo.remainingRequests === "0") {
    logger('Rate Limit Exceeded, waiting until '+ (new Date(rateLimitInfo.resetMs)));
    return setTimeout(nextMethod, rateLimitInfo.resetMs - Date.now(), optParam);
  } else {
    return nextMethod();
  }
};

var logger = function(msg) {
  console.log(new Date() + ' - ' + msg);
};

/**
 * opts is an object that must have the following keys
 *  - screen_name
 *  - url
 *  - cypherQuery
 *  - onSuccess
 *  - onError
 **/
var createBatchMethod = function(opts) {
  var next_cursor = -1;

  return function batchMethod(){
    logger('Starting HTTP request');

    T.get(opts.url, {screen_name: opts.screenName, count: 200, cursor: next_cursor, skip_status: true}, function(err, reply, resp){
      var rateLimitInfo = getRateLimitInfo(resp), userList;

      if(err) {
        if(err.code == 88) {
          scheduleNextCall(rateLimitInfo, batchMethod);
        } else {
          opts.onError(err);
        }
      } else {
        userList = reply.users.map(TUser.staticToNeoData);

        logger(opts.url + ' request completed, ' + rateLimitInfo.remainingRequests + ' requests remaining before rate limiting');
        logger('Starting DB Query');

        db.query(opts.cypherQuery, {userList: userList, screenName: opts.screenName}, function(err, arr){
            logger('DB request completed');

            if(err) {
              opts.onError(err);
            } else if(reply.next_cursor) {
              next_cursor = reply.next_cursor;

              scheduleNextCall(rateLimitInfo, batchMethod);
            } else {
              opts.onSuccess();
            }
          });
      }
    });
  };
};

connector.getUserFromTwitter = function(handle) {
  var response = Q.defer();

  T.get('users/lookup', {screen_name: handle}, function(err, reply){
    if(err) {
      return response.reject(err);
    }
    response.resolve(new TUser(reply[0]));
  });

  return response.promise;
};

connector.cypherUpsertOne = function(user) {
  var response = new Q.defer();
  var userMap = user.toNeoData();
  db.query(cypherQueries.upsertOne, {userMap: userMap, screenName: userMap.screen_name},
      function(err, arr){
        if(err) {
          response.reject(err);
        } else {
          response.resolve(userMap.screen_name);
        }
      });
  return response.promise;
};

connector.cypherGetUnconnectedUsersForHandle = function(handle) {
  var response = new Q.defer();
  db.query(cypherQueries.getUnconnectedUsers, {screenName: handle},
      function(err, arr){
        if(err) {
          response.reject(err);
        } else {
          response.resolve(arr.map(function(one){ return one.sn; }));
        }
      });
  return response.promise;
};

connector.getWebForHandle = function(screen_name){
  var followerResponse = new Q.defer();
  var friendResponse = new Q.defer();

  logger('getting web for ' + screen_name);

  var getFollowersBatch = createBatchMethod({
    screenName: screen_name,
    url: 'followers/list',
    cypherQuery: cypherQueries.upsertManyAndFollows,
    onSuccess: followerResponse.resolve,
    onError: followerResponse.reject
  });

  var getFriendsBatch = createBatchMethod({
    screenName: screen_name,
    url: 'friends/list',
    cypherQuery: cypherQueries.upsertManyAndFriends,
    onSuccess: friendResponse.resolve,
    onError: friendResponse.reject
  });

  getFollowersBatch();
  getFriendsBatch();

  return Q.all([friendResponse.promise, followerResponse.promise]);
};

connector.getWebForHandles = function(list) {
  if(!list || !list.length || list.length === 0) {
    throw new Error('Must supply a list of handles');
  }

  var idx = 0;
  function getNext() {
    var targetHandle = list[idx];
    if(targetHandle) {
      console.log('Getting web for ' + targetHandle);
      connector.getWebForHandle(targetHandle).then( function(counts) {
        console.log(targetHandle + ' completed.');
        idx++;
        if(list[idx]) getNext();
        else console.log('List completed.');
      }, logger);
    }
  }

  //Kick it off
  getNext();
};
