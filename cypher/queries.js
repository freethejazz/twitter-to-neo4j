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
exports.getRemainingUnconnectedUsers = multiline(function() {/*
    MATCH (me:Person {screen_name: {screenName}})-[:FOLLOWS]-(other:Person)-[r]-(:Person)
    WITH other.screen_name AS sn, other.followers_count + other.friends_count AS predRels, count(r) AS numRels
    ORDER BY numRels
    WHERE abs(predRels - numRels) > 50
    RETURN sn, predRels, numRels
    ORDER BY predRels ASC
*/});
