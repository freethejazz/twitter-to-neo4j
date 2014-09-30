# Twitter to Neo4j

A hack to pull down a web of twitter friends and followers into Neo4j via Node.js

### Prerequisites

* An instance of Neo4j(>=2.0) running locally. ([http://www.neo4j.org/download](http://www.neo4j.org/download))
* A Twitter account
* A Twitter dev account ([https://dev.twitter.com/](https://dev.twitter.com/))
* Set up a Twitter dev application([http://app.twitter.com/](http://app.twitter.com/)) and get your API key, API secret, Access token, and Access token secret.  (All under the API Keys tab of your application)
* Add a `config.js` file in the root directory of the app, using the following template:
```
module.exports = {
  twitterAuth: {
    consumer_key: '',
    consumer_secret: '',
    access_token: '',
    access_token_secret: ''
  },
  neo4j: {
    dbPath: 'http://localhost:7474'
  },
  targetHandle: ''
};
```


### Usage

1. Run `node app` from the project's root directory.
1. Watch the console output, or go have a sandwich (depending on how many friends/followers the user has).

The way we've authenticated with the twitter API, rate limits kick in after 15 requests of a particular type(friend or follower).  The limit resets every 15 minutes.

Have fun!

### Extending your graph
To get friends/followers of other people in the graph, simply change the `targetHandle` to whomever you're curious about.
If you want to get _all_ of the connections out to the next depth, i.e. (you)->(friend)->(friendOfFriend), that would be really tedious.
Instead, run `node depthOne`. The script looks at your current graph to find friends and followers that appear to be incomplete.
To judge completeness, I'm looking at the count of friends and followers twitter provides when you initially pull down the user
and comparing with the actual number of relationships that node has in the graph. If it's off by more than 50, it's incomplete
and will start pulling down the web of relationships for that handle.

This will take a long time.

### Analytics

If you've pulled your extended twitter graph in, you might be tempted to do some analysis on it. Here are some examples of questions and the cypher to answer them.


#### Of my followers, who are the most influential?
Here, my definition of 'influential' is someone who has more followers than friends by 300 or greater.
```
match (me:Person {screen_name: '<your_twitter_handle>'})<-[s:FOLLOWS]-(m:Person)
WHERE m.followers_count > m.friends_count
AND m.followers_count > 300
RETURN m,s,me
LIMIT 50
```

#### Which of my followers are interested in <something>
In this case, I'll search for JavaScript (and some capitalization alternatives).
```
MATCH (other)-[r:FOLLOWS]->(me {screen_name: '<your_twitter_handle>'})
WHERE other.description =~ '.*[Jj]ava[Ss]cript.*'
RETURN other,r,me
LIMIT 10
```

### Feedback is welcome
This can be in the form of github issues, pull requests, tweets [@freethejazz](http://www.twitter.com/freethejazz), emails to my twitter handle @ that big G email provider, complaints written on $20 dollar bills mailed to me in Chicago, etc.
