//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
/* const encrypt = require("mongoose-encryption");
 */

// const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');



const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.set('view engine', 'ejs');
// const saltRounds = 10;



mongoose.connect("mongodb://127.0.0.1:27017/userDB", {
    useNewUrlParser: true
});
app.use(session({
    secret: "our little secret.",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: [String]
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, { secret: process.env.SECRETS, encryptedFields: ["password"]  });

const User = new mongoose.model("User", userSchema);

// passport.serializeUser(function(user, done) {
//     process.nextTick(function() {
//         done(null, { id: user._id, username: user.username });
//     });
// });
// passport.deserializeUser(function(user, done) {
//     process.nextTick(function() {
//         return done(null, user);
//     });
// });
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRETS,
    callbackURL: "http://localhost:3000/auth/google/secrets",

  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
    
app.get("/", (req, res) => {
    res.render("home");
});
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));
   
app.get('/auth/google/secrets', 
passport.authenticate('google', { failureRedirect: '/login' }),
function(req, res) {
  // Successful authentication, redirect home.
  res.redirect('/secrets');
});
app.get("/login", (req, res) => {
    res.render("login");
});

// req.logout() needs a callback:
app.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    } else {
      res.redirect("/");
    }
  });
});
app.get("/register", (req, res) => {
    res.render("register");
});


  app.get("/secrets",function(req,res){
    User.find({"secret":{$ne:null}})
    .then(function (foundUsers) {
      res.render("secrets",{usersWithSecrets:foundUsers});
      })
    .catch(function (err) {
      console.log(err);
      })
});
  app.get("/submit", function (req, res) {
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
  });
   
  app.post("/submit", function (req, res) {
    console.log(req.user.id);
    User.findById(req.user.id)
      .then(foundUser => {
        if (foundUser) {
          foundUser.secret = req.body.secret;
          return foundUser.save();
        }
        return null;
      })
      .then(() => {
        res.redirect("/secrets");
      })
      .catch(err => {
        console.log(err);
      });
  });
// app.post("/register", (req, res) => {
//     /* bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//         const newUser = new User({
//             email: req.body.username,
//             // password:md5(req.body.password),
//             password:hash,
//         });
//         newUser.save()
//         .then(()=>{
//             res.render("secrets");
//         })
//         .catch((err)=>{
//             console.log(err);
//         });
//     }); */

// }); not working
app.post("/register", function (req, res) {
    User.register(
      { username: req.body.username },
      req.body.password,
      function (err, user) {
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, function () {
            res.redirect("/secrets");
          });
        }
      }
    );
  });

 
// app.post("/login", (req, res) => {
//     /*     const username = req.body.username;
//         const password = req.body.password;
//        User.findOne({email:username})
//         .then((foundUser)=>{
//         if(foundUser){
//             if(foundUser.password === password){
//                 res.render("secrets");
//             }
//         }
//         if(bcrypt.compareSync(req.body.password, foundUser.password)){
//             res.render("secrets");
//           }
//         }
//        })
//        .catch((err)=>{
//         console.log(err);
//        }); */
// })
app.post("/login", function (req, res) {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });
  
 
	req.login(user, function (err) {
        if (err) {
          console.log(err);
        } else {
          passport.authenticate("local")(req, res, function () {
            res.redirect("/secrets");
          });
        }
      });
});

const port = 3000;
app.listen(port, (req, res) => {
    console.log(`server is running at port ${port}`);
})