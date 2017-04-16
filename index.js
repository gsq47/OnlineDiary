var express=require('express');
var path=require('path');
var bodyParser=require('body-parser');
var crypto=require('crypto');
var mongoose=require('mongoose');
var models=require('./models/models');
var session=require('express-session');
var moment=require('moment');
var checkLogin=require('./checkLogin.js');
var cantBack=require('./cantBackToLoginRes.js');

var User=models.User;
var Note=models.Note;

mongoose.Promise=global.Promise;
mongoose.connect('mongodb://localhost:27017/notes');
mongoose.connection.on('error',console.error.bind(console,'Failed to connect to the database!'));

var error='';
var reg=/^[a-zA-Z0-9_]*$/;
var reg2=/^(?=.*?[a-z])(?=.*?[A-Z])(?=.*?[0-9]).*$/;
var app=express();
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');

app.use(express.static(path.join(__dirname,'public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
	secret:'1234',
	name:'mynote',
	cookie:{maxAge:1000*60*60*24*7},//1000*60*60*24*7 
	resave:false,
	saveUninitialized:true

}));

app.get('/',checkLogin.noLogin);
app.get('/',function(req,res){
	if(req.session.user){
	Note.find({author:req.session.user.username})
	    .exec(function(err,allNotes){
		if(err){
		    console.log(err);
		    return res.redirect('/');
		    }
	console.log(req.session.user);
	console.log(req.body.username);

       		res.render('index',{
		user:req.session.user,
		title:'homepage',
		notes:allNotes
		});
		})
	}
	else{
       		res.render('index',{
		user:req.session.user,
		title:'homepage',
		notes:null
		});
    	}
});
app.get('/register',cantBack.cantback);
app.get('/register',function(req,res){
	console.log("register!");
	res.render('register',{
	user:req.session.user,
	title:'register',
	error:error
	});
	error='';
});
app.post('/register',function(req,res){
	error="";
	var username=req.body.username;
	var password=req.body.password;
	var passwordRepeat=req.body.passwordRepeat;

	if(username.trim().length==0){
	error="The username can not be empty !";
	console.log("Username cannot be empty!");
	return res.redirect('/register');
	}
	if(username.trim().length<3||username.trim().length>20){
	error+="The username length should be in [3-20] !";
	console.log("Username length if out of range!");
	return res.redirect('/register');
	}
	if(!reg.test(username)){
	error+="The username can only be component by zimu number and _ !";
	console.log("Username can only be component by zimu number and _")
	}

	if(password.trim().length==0||passwordRepeat.trim().length==0){
	error+="password cannot be empty !";
	console.log("password cannot be empty!");
	return res.redirect('/register');
	}
	if(password.trim().length<6){
	error+="password cannot be shorter than 6 !";
	console.log("password cannot be shorter than 6!");
	return res.redirect('/register');
	}
	if(!reg2.test(password)){
	error+="password must be component by little big word and number !";
	console.log("password must have little and big word and number!");
	return res.redirect('/register');
	}

	if(password!=passwordRepeat){
	error+="two input of password are different !";
	console.log("two input of password are different!");
	return res.redirect('/register');
	}
	User.findOne({username:username},function(err,user){
       	if(err){
		console.log(err);
		return res.redirect('/register');
	}
       	if(user){
		error+="The username is exist !";
		console.log("The username is exist!");
		return res.redirect('/register');
	}
	var md5=crypto.createHash('md5');
	    md5password=md5.update(password).digest('hex');

	var newUser=new User({
	username:username,
	password:md5password
	});

	newUser.save(function(err,doc){
	if(err){
	console.log(err);
	return res.redirect('/register');
	}

	console.log("register successful!");
	return res.redirect('/');

	});

	});
});
app.get('/login',cantBack.cantback);
app.get('/login',function(req,res){
	console.log("login! ");
	res.render('login',{
	user:req.session.user,
	title:'login',
	error:error
	});
	error='';
	console.log("req.body.username in login app.get : "+req.body.username);
});

app.post('/login',function(req,res){
	var username=req.body.username;
	password=req.body.password;

	error='';
	console.log(req.body);
	User.findOne({username:username},function(err,user){
		if(err){
		console.log(err);
		return res.redirect('/login');
		}
		if(!user){
		console.log("The user is not exist!");
		error="The user is not exist or the password is wrong !";
		//req.session.err="The user is not exist!";
		return res.redirect('/login');
		}
		//console.log("login username: "+username);
		//console.log("login req.body.username: "+req.body.username);
		var md5=crypto.createHash('md5');
		    md5password=md5.update(password).digest('hex');
		if(user.password!=md5password){
		error="The user is not exist or the password is wrong !";
		console.log("wrong password!");
		return res.redirect('/login');
		}
		console.log("login successful!");
		user.password=null;
		delete user.password;
		req.session.user=user;
		return res.redirect('/');

	});

});

app.get('/quit',function(req,res){
	console.log("quit!");
	req.session.user=null;
	return res.redirect('/');
/*	res.render('quit',{
	title:'quit'
	});
*/
});
app.get('/post',function(req,res){
	console.log("post!");
	res.render('post',{
	title:'post',
	user:req.session.user
	});
});

app.post('/post',function(req,res){
	var note=new Note({
	title:req.body.title,
	author:req.session.user.username,
	tag:req.body.tag,
	content:req.body.content
	});
	console.log("in the post: "+req.session.user);
	console.log("in the post req session user username: "+req.session.user.username);
	note.save(function(err,doc){
	if(err){
	console.log(err);
	return res.redirect('/post');
	}
	console.log("Publish successful!!");
	return res.redirect('/');
	});

});


app.get('/detail/:_id',function(req,res){
	console.log('check note');
	Note.findOne({_id:req.params._id})
	    .exec(function(err,art){
		if(err){
		    console.log(err);
		    return res.redirect('/');
		}
		if(art){
		    res.render('detail',{
		    title:'check note',
		    user:req.session.user,
		    art:art,
		    moment:moment
		    });
		}
		});

});

app.get('/weixinui',function(req,res){
	console.log('weixinui');
	res.render('weixinindex',{
		title:'weixin ui',
		user:req.session.user
		});
});
app.get('/notelist',function(req,res){
	console.log('notelist');
	res.render('trynotelist',{
		title:'notelisttry',
		user:req.session.user
		});
});

app.listen(3000,function(req,res){
	console.log('app is running at port 3000');

});
