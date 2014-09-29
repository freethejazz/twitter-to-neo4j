# Twitter to Neo4j

A hack to pull down a web of twitter friends and followers into Neo4j via Node.js

### Prerequisites

* An instance of Neo4j(>=2.0) running locally. ([http://www.neo4j.org/download](http://www.neo4j.org/download))
* A Twitter account
* A Twitter dev account ([https://dev.twitter.com/](https://dev.twitter.com/))
* Set up a Twitter dev application([http://app.twitter.com/](http://app.twitter.com/)) and get your API key, API secret, Access token, and Access token secret.  (All under the API Keys tab of your application)


### Usage

1. Modify `config.js` on your local machine, substituting in your API credentials, location of your Neo4j instance, and the twitter handle you want to get the graph of.
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

### Feedback is welcome
This can be in the form of github issues, pull requests, tweets [@freethejazz](http://www.twitter.com/freethejazz), emails to my twitter handle @ that big G email provider, complaints written on $20 dollar bills mailed to me in Chicago, etc.
