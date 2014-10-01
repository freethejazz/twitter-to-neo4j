var multiline = require('multiline');

exports.upsertOne = multiline(function(){/*
  MERGE (n:Person {screen_name: {screenName}})
  ON CREATE SET n={userMap}
  RETURN n
*/});

/*
 * Parameters are:
 *
 * screenName - string, the handle of the person to attach followers to
 * userList - array of objects, people to merge and create relationships
 */
exports.upsertManyAndFollows = multiline(function() {/*
  MERGE (followeeNode:Person {screen_name: {screenName}})
  FOREACH (follower in {userList} |
    MERGE (followerNode:Person {screen_name: follower.screen_name})
    ON CREATE SET followerNode=follower
    MERGE followerNode-[:FOLLOWS]->followeeNode
  )
*/});


/*
 * Parameters are:
 *
 * screenName - string, the handle of the person to attach followers to
 * userList - array of objects, people to merge and create relationships
 */
exports.upsertManyAndFriends = multiline(function() {/*
  MERGE (targetNode:Person {screen_name: {screenName}})
  FOREACH (friend in {userList} |
    MERGE (friendNode:Person {screen_name: friend.screen_name})
    ON CREATE SET friendNode=friend
    MERGE targetNode-[:FOLLOWS]->friendNode
  )
*/});

/*
 * Parameters are:
 *
 * screenName - string, the handle of the person that is at the center of the graph.
 * 
 */
exports.getUnconnectedUsers = multiline(function() {/*
    MATCH (me:Person {screen_name: 'topheman'})-[:FOLLOWS]-(other:Person)
    OPTIONAL MATCH (other)-[r]-(fof)
    WHERE fof <> me
    WITH other, other.followers_count + other.friends_count AS predRels, count(r) as numRels
    WHERE abs(numRels - predRels) > 10 and other.protected = false
    RETURN other.screen_name as sn, numRels, predRels
    ORDER BY predRels asc
*/});
