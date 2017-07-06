module.exports = function(EmailTemplate) {
  var assert = require('assert');
  var async = require('async');
  var LoopBackContext = require('loopback-context');

  /************Common function************/
  //clean name
  function clean(name){
    if(name){
      return name.trim().toLowerCase()
        .replace(/\s{1,}/gi,'_')
        .replace(/[^a-z0-9_]/g,'')
        .replace(/^_|_$/g,'');
    }
    else return name;
  }

  //valid email
  function isValidEmail(email) {
    return /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/.test(email);
  }

  //Replace mail content
  function filterEmailContent(content, obj){
    obj = obj || {};
    if (content) {
      var keys = content.match(/\[(.+?)\]/g);
      if (keys && keys.length) {
        keys.forEach(function (k) {
          content = content.replace(k, obj[k.slice(1, -1)]);
        });
      }
      return content;
    }
    else {
      return false;
    }
  }

  //get user
  function getUser(cb) {
    var MemberModel = EmailTemplate.app.models.Member;
    var ctx = LoopBackContext.getCurrentContext();

    // Get the current access token
    var accessToken = ctx && ctx.get('accessToken');
    if(accessToken) {
      MemberModel.findById(accessToken.userId, {fields: ['email']}, function(err, user) {
        if(err) cb(err);
        else cb(null, user.email);
      });
    }
    else {
      var err = new Error('Unauthorized user');
      err.status = err.statusCode = 401;
      err.code = 'UNAUTHORIZED_USER';
      cb(err);
    }
  }

  //send mail
  function sendMail(opt, cb) {
    var allowedSlug = EmailTemplate.app.dataSources.myEmailDataSource.settings.allowedSlug;
    opt.replacer = opt.replacer || {};
    var MemberModel = EmailTemplate.app.models.Member;
    var EmailModel = EmailTemplate.app.models.Email;
    var search = {};
    if(typeof opt.receiver === 'string') {
      search.id = opt.receiver;
    }
    else if (typeof opt.receiver === 'object' && opt.receiver.length) {
      search.id = {inq: opt.receiver};
    }
    else{
      assert(opt.receiver, 'You must supply a receiver (options.receiver)');
    }

    EmailTemplate.findOne({where: {slug: opt.slug}}, function(err, template) {
      if(err) cb(err, null);

      if(!template || template === null) {
        err = new Error('Invalid slug found.');
        err.status = err.statusCode = 404;
        err.code = 'INVALID_SLUG';
        return cb(err, null);
      }
      var mailOptions = {
        from: 'noreply@connec2.me',
        subject: opt.subject || filterEmailContent(template.subject, opt.replacer),
        html: opt.html || filterEmailContent(template.content, opt.replacer)
      };
      if(allowedSlug.indexOf(opt.slug) > -1) {
        mailOptions.from = opt.from;
        mailOptions.to = opt.receiver;
        EmailModel.send(mailOptions, function(err) {
          if (err) {
            cb(err, null);
          }
          cb();
        });
      }
      else {
        MemberModel.find({where: search, fields: {email: true}}, function(err, user) {
          if (err) cb(err, null);

          if (user && user.length === 0) {
            cb(new Error('No valid receiver found.'), null);
          }

          //send mail
          async.mapLimit(user, 5, function(u, cbk){
            mailOptions.to = u.email;
            EmailModel.send(mailOptions, cbk);
          }, function(err) {
            if(err) {
              cb(err, null);
            }
            cb();
          });
        });
      }
    });
  }

  /**************** Hooks ******************/
  EmailTemplate.observe('before save', function (context, next) {
    if(context.instance) {
      EmailTemplate.find({filter: {fields: {slug: true}}}, function (err, instances) {
        if (err) next(err);
        context.instance.slug = clean(context.instance.name);
        var slugs = instances.map(function (v) {
          return v.slug;
        });
        var i = 1;
        while (slugs.indexOf(context.instance.slug) > -1) {
          context.instance.slug = context.instance.slug.replace(/\d+$/, '') + i;
          i++;
        }
        next();
      });
    }
    else next();
  });

  /****************Remote API******************/
  //send mail
  EmailTemplate.sendMail = function(opt, cb) {
    var allowedSlug = EmailTemplate.app.dataSources.myEmailDataSource.settings.allowedSlug;
    assert(typeof opt === 'object', 'options required when calling EmailTemplate.sendMail()');
    assert(opt.slug, 'You must supply a email slug (options.slug)');
    assert(opt.receiver, 'You must supply a receiver (options.receiver)');
    if(allowedSlug.indexOf(opt.slug) > -1) {
      assert(typeof opt.receiver === 'string', 'You must supply be string (options.receiver)');
      if(opt.from) {
        sendMail(opt, cb);
      }
      else {
        assert(typeof opt.html === 'string', 'You must supply be string (options.body)');
        getUser(function(err, email){
          if(err) cb(err);
          else {
            opt.from = email;
            sendMail(opt, cb);
          }
        });
      }
    } else sendMail(opt, cb);
  };

  EmailTemplate.remoteMethod('sendMail', {
    http: {path: '/sendMail', verb: 'post'},
    accepts: {arg: 'options', type: 'object', http: {source: 'body'}, required: true, description: 'Options defining slug, receiver, replacer'},
    description: 'Send mail to any user.'
  });
};
