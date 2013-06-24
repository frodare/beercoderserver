(function () {
	'use strict';

	var facebookParams = {
		clientID: '172792616228097',
		clientSecret: '8c042b4c29d8f8a2f044982c1368857b',
		callbackURL: 'http://www.beercoder.com/auth/facebook/callback'
	};

	var mongoParams = {
		url : "mydb", // "username:password@example.com/mydb"
		collections : ["users", "recipes"]
	};


	var express = require('express'),
		passport = require('passport'),
		FacebookStrategy = require('passport-facebook').Strategy,
		app = express(),
		db = require("mongojs").connect(mongoParams.url, mongoParams.collections);


	var User = {
		findByEmail: function (email, done) {
			db.users.find({email: email}, function(err, users) {
				if(err){
					done(err);
					return;
				}
				if(users && users.length){
					done(null, users[0]);
					return;
				}
				return done();
			});
		}
	};

	passport.serializeUser(function(user, done) {
		console.log('serializeUser', user);
		done(null, user.email);
	});

	passport.deserializeUser(function(email, done) {
		console.log('deserializeUser', email);
		User.findByEmail(email, done);
	});

	passport.use(new FacebookStrategy(facebookParams,function(accessToken, refreshToken, profile, done) {
		/*
		User.findOrCreate(..., function(err, user) {
			if (err) { return done(err); }
			done(null, user);
		});
		*/
		//console.log('Facebook auth, accessToken:', accessToken, 'refreshToken', refreshToken, 'profile', profile);

		var email = profile.emails[0].value,
			user;

		/*
		 * lookup user by email
		 */
		db.users.find({email: email}, function(err, users) {

			if(err){
				done(err);
				return;
			}

			if(!users || !users.length) {
				/*
				 * user not found
				 */
				user = {
					created: new Date().valueOf(),
					id: profile.id,
					email: email,
					username: profile.username,
					displayName: profile.displayName,
					raw: profile	
				};

				db.users.save(user);

				console.log('saving user');

			}else{
				user = users[0];

				console.log('found user', user.email);
			}

			done(null , user);
			
		});


		
	}));






	/*
	 * 
	 * 
	 *  Facebook auth, accessToken: CAACdJ2qClQEBAIk1eGycZBD7AG74HlA0cgqLw8XEGSH3TgcZC5gNn3IqG1vOoZA1LcKbGFmqI9eQqQZCWWJlFGzeGMwK4FhTQiwk3TDr9W65CSjz35gHIl9hmTwVCrHZBH7ePc8BZBd3dwUkcak7MI refreshToken undefined profile 
	 * { provider: 'facebook',
		  id: '100000306353616',
		  username: 'frodare',
		  displayName: 'Charles Howard',
		  name: 
		   { familyName: 'Howard',
		     givenName: 'Charles',
		     middleName: undefined },
		  gender: 'male',
		  profileUrl: 'http://www.facebook.com/frodare',
		  emails: [ { value: 'frodare@gmail.com' } ],
		  _raw: '{"id":"100000306353616","name":"Charles Howard","first_name":"Charles","last_name":"Howard","link":"http:\\/\\/www.facebook.com\\/frodare","username":"frodare","gender":"male","email":"frodare\\u0040gmail.com","timezone":-4,"locale":"en_US","verified":true,"updated_time":"2013-06-13T10:15:10+0000"}',
		  _json: 
		   { id: '100000306353616',
		     name: 'Charles Howard',
		     first_name: 'Charles',
		     last_name: 'Howard',
		     link: 'http://www.facebook.com/frodare',
		     username: 'frodare',
		     gender: 'male',
		     email: 'frodare@gmail.com',
		     timezone: -4,
		     locale: 'en_US',
		     verified: true,
		     updated_time: '2013-06-13T10:15:10+0000' } }


	 * 
	 */
	

	
	app.use(express.static(__dirname + '/beercoder'));

	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.session({ secret: 'keyboard cat' }));
	app.use(passport.initialize());
	app.use(passport.session());
	


	var repoRequest = function (req, res, next) {
		console.log('user: ', req.user);
		//res.send('repo ...');
		res.end();
	};
		
	app.post('/repo', repoRequest);
	app.get('/repo', repoRequest);




	//app.listen('8020');
	app.listen('80');

	/*
	app.post('/login', passport.authenticate('local'), function(req, res) {
		// If this function gets called, authentication was successful.
		// `req.user` contains the authenticated user.
		res.redirect('/users/' + req.user.username);
	});
	*/

	//app.post('/login',  passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login' }));


	// Redirect the user to Facebook for authentication.  When complete,
	// Facebook will redirect the user back to the application at
	//     /auth/facebook/callback
	app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

	// Facebook will redirect the user to this URL after approval.  Finish the
	// authentication process by attempting to obtain an access token.  If
	// access was granted, the user will be logged in.  Otherwise,
	// authentication has failed.
	app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/' }));

}());
