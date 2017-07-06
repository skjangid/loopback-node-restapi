module.exports = function(Member) {
    var assert = require('assert');
    var loopback = require('loopback');
    var async = require('async');
    var LoopBackContext = require('loopback-context');
    /*************Common function*************/
    //Replace mail content
    function filterEmailContent(content, obj){
        obj = obj || {};
        if (content) {
            var keys = content.match(/\[(.+?)\]/g);
            if (keys && keys.length) {
                keys.forEach(function (k) {
                    var val = obj[k.slice(1, -1)];
                    if(val)
                        content = content.replace(k, val);
                });
            }
            return content;
        }
        else {
            return false;
        }
    }

    //get user from token
    function getUser(context, opt, next) {
        var AccessTokenModel = Member.app.models.AccessToken;
        AccessTokenModel.findForRequest(context.req, {}, function (aux, accesstoken) {
            if (aux || accesstoken === undefined) {
                var err = new Error('Unauthorized user');
                err.status = err.statusCode = 401;
                err.code = 'UNAUTHORIZED_USER';
                next(err);
            } else {
                Member.findById(accesstoken.userId, function (err, user) {
                    if(err) {
                        next(err);
                    }
                    if(user.status !== 1) {
                        err = new Error('User either inactive or deleted');
                        err.status = err.statusCode = 422;
                        err.code = 'INACTIVE_OR_DELETED_USER';
                        next(err);
                    }
                    else if(!user.emailVerified) {
                        err = new Error('User not verified');
                        err.status = err.statusCode = 422;
                        err.code = 'UNVERIFIED_USER';
                        next(err);
                    }
                    else {
                        context.req.body.user = user;
                        next();
                    }
                });
            }
        });
    }
    Member.disableRemoteMethodByName('createChangeStream', true)

    // Update or insert a model instance
    Member.disableRemoteMethodByName('upsertWithWhere', true)

  
  //get access token
  Member.beforeRemote('changePassword', getUser);

  Member.beforeRemote('setPassword', getUser);

  Member.afterRemote('**', function(ctx, user, next) {
    //console.log(user); return;
    if(ctx.method.name=='patchAttributes')
    {
        var MemberLanguage = Member.app.models.MemberLanguage;
        var MemberAreaOfExperiance = Member.app.models.MemberAreaOfExperiance;
        var MemberSpecialist = Member.app.models.MemberSpecialist;
        var CompanyTherapist = Member.app.models.CompanyTherapist;
        if(user)
        {
            if(user.language)
            {
                MemberLanguage.deleteAll({memberId:user.id});
                user.language.map(function(list){
                    var langObj = {"memberId":user.id,"languageId":list};
                    MemberLanguage.create(langObj, function(err) {
                        if (err) console.error(err);
                    });
                });
            }
            if(user.experianceArea)
            {
                MemberAreaOfExperiance.deleteAll({memberId:user.id});
                user.experianceArea.map(function(list){
                    var langObj = {"memberId":user.id,"categoryId":list};
                    MemberAreaOfExperiance.create(langObj, function(err) {
                        if (err) console.error(err);
                    });
                });
            }
            if(user.specialist)
            {
                MemberSpecialist.deleteAll({memberId:user.id});
                user.specialist.map(function(list){
                    var langObj = {"memberId":user.id,"categoryId":list};
                    MemberSpecialist.create(langObj, function(err) {
                        if (err) console.error(err);
                    });
                });
            }
            if(user.therapistId)
            {
                CompanyTherapist.deleteAll({companyId:user.id});
                user.therapistId.map(function(list){
                    var langObj = {"companyId":user.id,"memberId":list};
                    CompanyTherapist.create(langObj, function(err) {
                        if (err) console.error(err);
                    });
                });
            }
        }
    }
    next();
  });
  
  
  //send verification email after registration
  Member.afterRemote('create', function(context, user, next) {
    var EmailTemplateModel = Member.app.models.EmailTemplate;
    var EmailModel = Member.app.models.Email;
    var MemberLanguage = Member.app.models.MemberLanguage;
    var MemberAreaOfExperiance = Member.app.models.MemberAreaOfExperiance;
    var MemberSpecialist = Member.app.models.MemberSpecialist;
    
    if(user)
    {
        if(user.language)
        {
            user.language.map(function(list){
                var langObj = {"memberId":user.id,"languageId":list};
                MemberLanguage.create(langObj, function(err) {
                    if (err) console.error(err);
                });
            });
        }
        if(user.experianceArea)
        {
            user.experianceArea.map(function(list){
                var langObj = {"memberId":user.id,"categoryId":list};
                MemberAreaOfExperiance.create(langObj, function(err) {
                    if (err) console.error(err);
                });
            });
        }
        if(user.specialist)
        {
            user.specialist.map(function(list){
                var langObj = {"memberId":user.id,"categoryId":list};
                MemberSpecialist.create(langObj, function(err) {
                    if (err) console.error(err);
                });
            });
        }
    }
    
    var domain = Member.app.get('domain');
    var sslOff = domain.port != '443' ? true:false;
    var slug, obj;

    
    slug = 'user-signup';
    obj = {
      USER: user.username
    };

    EmailTemplateModel.findOne({where: {slug: slug}}, function(err, email) {
      if(err) next(err);
      var options = {
        protocol: 'http' + (sslOff ? '':'s'),
        host: domain.host,
        port: domain.port,
        type: 'email',
        to: user.email,
        from: 'smkjangid@gmail.com',
        subject: filterEmailContent(email.subject, obj),
        html: filterEmailContent(email.content, obj),
        redirect: '/verified',
        user: user
      };

      user.verify(options, function(err) {
        if (err) return next(err);
        next();
      });
    });
    
  });

  //send reset mail
  Member.on('resetPasswordRequest', function(info) {
    var EmailTemplateModel = Member.app.models.EmailTemplate;
    var domain = Member.app.get('domain');
    var sslOff = domain.port != '443' ? true:false;
    var displayPort = (domain.port == '80' || domain.port == '443') ? '' : ':' + domain.port;
    var link = 'http' + (!sslOff ? 's':'') + '://' + domain.host + displayPort + '/reset-password' + '?access_token=' + info.accessToken.id;

    EmailTemplateModel.sendMail({
      slug: 'reset-password',
      receiver: info.user.id.toString(),
      replacer: {
        USER: info.user.username,
        LINK: link
      }
    }, function(err) {
      //console.log(err);
      if(err) console.log('Mail not send');
    });
  });

  /****************Remote API******************/
  //change password method
  Member.changePassword = function(opt, cb) {
    assert(typeof opt === 'object', 'options required when calling Member.changePassword()');
    assert((opt.cPassword && typeof opt.cPassword === 'string'), 'You must supply a current password (options.cPassword)');
    assert((opt.nPassword && typeof opt.nPassword === 'string'), 'You must supply a receiver (options.nPassword)');
    assert((opt.user && typeof opt.user === 'object'), 'Unauthenticated user');

    opt.user.hasPassword(opt.cPassword, function(err, match){
      if(match) {
        opt.user.updateAttribute('password', opt.nPassword, function(err) {
          if(err) cb(err);
          cb();
        });
      }
      else {
        cb(new Error('Incorrect password'));
      }
    });
  };

  //reset password method
  Member.setPassword = function(token, opt, cb) {
    assert(typeof opt === 'object', 'options required when calling Member.setPassword()');
    assert((opt.password && typeof opt.password === 'string'), 'You must supply a password (options.password)');
    assert((opt.user && typeof opt.user === 'object'), 'Unauthenticated user');

    opt.user.updateAttribute('password', opt.password, function(err) {
      if(err) cb(err);
      var AccessTokenModel = Member.app.models.AccessToken;
      AccessTokenModel.destroyAll({userId: opt.user.id}, function(err) {
        if(err) cb(err);
        cb();
      });
    });
  };

  
  //Remote method
  Member.remoteMethod('changePassword', {
    http: {path: '/changePassword', verb: 'put'},
    accepts: {arg: 'options', type: 'object', http: {source: 'body'}, required: true, description: 'Options defining cPassword, nPassword.'},
    description: 'Change password for authenticated user.'
  });

  Member.remoteMethod('setPassword', {
    http: {path: '/setPassword', verb: 'put'},
    accepts: [
      {arg: 'access_token', type: 'any', http: {source: 'query'}, required: true, description: 'Token is required.'},
      {arg: 'options', type: 'object', http: {source: 'body'}, required: true, description: 'Options defining password.'}
    ],
    description: 'Set password for unauthenticated user.'
  });




  
/*  Member.remoteMethod('findWithLoc', {
    http: {path: '/findWithLoc', verb: 'get'},
    accepts: {arg: 'filter', type: 'object', http: {source: 'query'}, description: 'Model query.'},
    returns: {root: true, arg: 'data', type: 'array'},
    description: 'Find data instance with location.'
  });*/
};
