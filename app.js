(function () {
	'use strict';

	var facebookParams = {
		clientID: '172792616228097',
		clientSecret: '8c042b4c29d8f8a2f044982c1368857b',
		callbackURL: 'http://www.beercoder.com/auth/facebook/callback'
	};

	var mongoParams = {
		url : "beercoder", // "username:password@example.com/mydb"
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

	app.use(express.static(__dirname + '/beercoder'));
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.session({ secret: 'keyboard cat' }));
	app.use(passport.initialize());
	app.use(passport.session());
	
	app.post(/^\/repo\//, function (req, res, next) {
		if(!req.user){
			res.send(403);
			return;
		}
		next();
	});

	app.post('/repo/status', function (req, res) {

		var data = {
			user: req.user
		};

		//console.log('status request', req.body, data);
		res.json(data);
	});
		
	app.post('/repo/save', function (req, res) {
		//console.log('Save recipe', req.body);

		var recipe = req.body || {};
		recipe.user = req.user.email;

		recipe.revision = (new Date()).getTime();

		db.recipes.save(recipe);

		res.json(req.body);
	});

	app.post('/repo/delete', function (req, res) {
		

		var recipe = req.body || {};
		//recipe.user = req.user.email;

		var filter = {
			$and: [{user: req.user.email}, {_id: recipe._id}]
		};

		if(!recipe._id){
			console.log('No ID given for delete command');
			res.send(500);
		}

		console.log('Delete recipe', filter);

		db.recipes.remove(filter, true);

		res.json(req.body);
	});

	app.post('/repo/list', function (req, res) {
		//console.log('search recipes', req.body);

		var search = req.body || {};
		search.user = req.user.email;

		db.recipes.find(search, function(err, recipes) {
			if(err){
				res.send(500);
				return;
			}
			res.json(recipes);
		});

	});




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
