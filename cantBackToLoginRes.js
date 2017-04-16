function cantBack(req,res,next){
	if(req.session.user){
	    return res.redirect('/');
	}
	next();
}
exports.cantback=cantBack;
