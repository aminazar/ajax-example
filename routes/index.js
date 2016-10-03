var express = require('express');
var router = express.Router();
var pgp = require('pg-promise')();
var passport = require('passport');

var bcrypt = require('bcryptjs');
var db = pgp('postgres://postgres@localhost:5432/clicks');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/register', function(req, res, next){
  bcrypt.genSalt(10,function(err, salt){
    if(err)
      res.status(500).send('error in salt creation: ' + err.message)
    else
    bcrypt.hash(req.body.password, salt, function(err,hash){
      if(err)
        res.status(500).send('error in hash creation '+err.message);
      else{
        console.log(db);
       db.query('insert into users(username,password) values($1,$2)',[req.body.username,hash])
           .then(()=>res.status(200).send('registered.'))
           .catch((err)=>res.status(500).send('registration error', err.message));
      }
    })
  })
});

router.post('/login', passport.authenticate('local'), function(req, res) {res.status(200).send(req.user);})

router.get('/click', function(req, res, next){
  var d = new Date();
  if(req.user)
  db.query('insert into clicks(username,click_time) values($1,$2)',[req.user,d])
      .then(()=>{
        return db.task((t)=>t.batch([
            t.one('select count(*) from clicks'),
            t.one('select * from clicks where click_time = (select max(click_time) from clicks where click_time < $1)', [d]),
            t.one('select count(*) from clicks where username = $1',[req.user]),
            t.one('select max(click_time) from clicks where username = $1 and click_time<$2',[req.user,d])
        ])
        )})
      .then(data=>res.json(data))
      .catch((err)=>res.json({error:err}));
  else
    res.status(403).send('login first!');
});

function login(username, password, done) {
  db.one('select * from users where username=$1',[username])
      .then(function(data) {
        console.log('valid user', data);
        bcrypt.compare(password, data.password,function(err,result) {
              if (!err && result)
                return done(null, data.username);
              else
                return done(null, false);
            })})
        .catch((err2)=>{console.log(err2.message,err2);return done(null,false)});
}

function desUser(id, done) {
  db.one('select username from users where username=$1',[id])
      .then(function(data) {
        done(null, data.username)})
      .catch(function(err){console.log(err.message,err);});
}
module.exports = {router: router, login:login, desUser: desUser};
