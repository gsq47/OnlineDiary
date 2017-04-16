function noLogin(req,res,next){
	if(!req.session.user){
	    console.log("sorry you have not login!");
	    return res.redirect('/login');
	}
	next();
}
exports.noLogin=noLogin;
