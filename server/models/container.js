module.exports = function(Container) {
  var fs = require('fs'), im = require('imagemagick'), assert = require('assert'),
    async = require('async'), basePath = 'client/', folder = 'images', quality = 0.5;
  
  /************ Common function ************/
  //merge object
  function mergeObject(obj1, obj2) {
    for (var p in obj2) {
      try {
        // Property in destination object set;  update its value.
        if (obj2[p].constructor === Object) {
          obj1[p] = mergeObject(obj1[p], obj2[p]);
        } else {
          obj1[p] = obj2[p];
        }
      } catch (e) {
        // Property in destination object not set; create it and set its value.
        obj1[p] = obj2[p];
      }
    }
    return obj1;
  }
  
  //file cropping
  function bulkCrop(opt, cb) {
    async.mapLimit(opt.bulk, 5, function (v, cbk) {
      im.crop(mergeObject({
        srcPath: opt.path,
        dstPath: v.uploadPath,
        width: v.width,
        height: v.height,
        quality: quality
      }, v.extra), cbk);
    }, cb);
  }
  
  /**************** Hooks ******************/
  Container.beforeRemote('upload', function(context, unused, next) {
    context.req.params.container = folder;
    next();
  });
  
  Container.beforeRemote('removeFile', function(context, unused, next) {
    try {
      var temp = JSON.parse(decodeURIComponent(context.req.params.container));
      temp.path = decodeURIComponent(temp.path);
      fs.rename(basePath + temp.path + '/' + context.req.params.file, basePath + folder + '/' + context.req.params.file, function(err) {
        if(err) next(err);
        else {
          context.req.params.container = folder;
          context.req.remotingContext.args.container = context.req.remotingContext.args.container ? context.req.params.container : context.req.remotingContext.args.container;
          next();
        }
      });
    } catch (e) {
      next();
    }
  });
  
  Container.afterRemote('upload', function(context, file, next) {
    if(context.req.path) {
      try {
        var temp = context.req.path.replace(new RegExp('^/|/upload$', 'ig'), '');
        temp = JSON.parse(decodeURIComponent(temp));
        temp.path = decodeURIComponent(temp.path);
        fs.rename(basePath + file.result.files.file[0].container + '/' + file.result.files.file[0].name, basePath + temp.path + '/' + file.result.files.file[0].name, next);
      } catch (e) {
        next();
      }
    } else next();
  });
  
  /****************Remote API******************/
  Container.crop = function(opt, cb) {
    assert(typeof opt === 'object', 'options required when calling Container.crop()');
    assert(opt.path, 'You must supply a image path (options.path)');
    
    opt.path = basePath + opt.path;
    opt.persist = opt.persist || false;
    if(opt.bulk) {
      assert(typeof opt.bulk === 'object', 'You must supply a valid bulk arguments (options.bulk)');
      assert(opt.bulk.length > 0, 'You must supply a valid bulk arguments (options.bulk)');
      
      opt.bulk.forEach(function(v, i){
        assert(v.width > 0, 'You must supply a crop width (options[%d].width)', i);
        assert(v.height > 0, 'You must supply a crop height (options[%d].height)', i);
      });
      
      opt.bulk = opt.bulk.map(function(v){
        if(!v.uploadPath) {
          v.uploadPath = opt.path;
        }
        else {
          v.uploadPath = basePath + v.uploadPath;
        }
        return v;
      });
    }
    else {
      assert(opt.width > 0, 'You must supply a crop width (options.width)');
      assert(opt.height > 0, 'You must supply a crop height (options.height)');
      opt.uploadPath = opt.uploadPath ? basePath + opt.uploadPath : opt.path;
    }
    
    try {
      im.convert([opt.path, '-strip', '-interlace', 'plane', '-gaussian-blur', '2', opt.path], function (err, output) {
        if (err) cb(err, null);
        async.waterfall([
          function(cbk) {
            if(opt.bulk) {
              bulkCrop(opt, cbk);
            }
            else {
              im.crop(mergeObject({
                srcPath: opt.path,
                dstPath: opt.uploadPath,
                width: opt.width,
                height: opt.height,
                quality: quality
              }, opt), cbk);
            }
          }
        ], function(err) {
          if (err) cb(err, null);
          else {
            async.waterfall([
              function(cbk) {
                if (opt.persist) {
                  fs.unlink(opt.path, cbk);
                }
                else cbk(null);
              }
            ], function(err){
              var result = {};
              var uploadFileName;
              if(opt.bulk) {
                result.file = [];
                opt.bulk.forEach(function(v){
                  uploadFileName = v.uploadPath.split('/');
                  result.file.push({
                    container: uploadFileName[uploadFileName.length - 2],
                    name: uploadFileName[uploadFileName.length - 1],
                    width: v.width,
                    height: v.height,
                    replace: err ? false : true
                  });
                });
              }
              else {
                uploadFileName = opt.uploadPath.split('/');
                result.file = {
                  container: uploadFileName[uploadFileName.length - 2],
                  name: uploadFileName[uploadFileName.length - 1],
                  width: opt.width,
                  height: opt.height,
                  replace: err ? false : true
                };
              }
              cb(null, result);
            });
          }
        });
      });
    }
    catch(e) {
      cb(new Error('Imagemagick not installed'), null);
    }
  };
  
  Container.uploadFile = function(opt, cb) {
    console.log(opt);
  }
  
  Container.remoteMethod('crop', {
    http: {path: '/crop', verb: 'get'},
    accepts: {arg: 'options', type: 'object', http: {source: 'query'}, required: true, description: 'Options defining path, width, height, persist, bulk'},
    returns: {arg: 'result', type: 'object'},
    description: 'Crop images into multiple size.'
  });
  
  Container.remoteMethod('uploadFile', {
    http: {path: '/uploadFile', verb: 'post'},
    accepts: {arg: 'data', type: 'object', http: {source: 'body'}, required: true, description: 'data is required.'},
    returns: {arg: 'result', type: 'object'},
    description: 'Upload image.'
  });
};
