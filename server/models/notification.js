module.exports = function(Notification) {
  var assert = require('assert'), util = require('util'), async = require('async'), ObjectID = require('mongodb').ObjectID;
  Notification.validatesUniquenessOf('memberId', {scopedTo: ['memberPostId', 'templateId']});

  /******************* API *********************/
  //create notification
  Notification.customCreate = function(request, data, next) {
    assert(typeof request === 'object', 'options required when calling Notification.customCreate()');
    assert((request.body && typeof request.body.templateId === 'string'), 'You must supply a templateId (request.body.templateId)');


    if(typeof data === 'function') {
      next = data;
      data = null;
    }

var MemberConnection = Notification.app.models.MemberConnection,
      MemberPost = Notification.app.models.MemberPost,
      Member = Notification.app.models.Member,
      NotificationTemplate = Notification.app.models.NotificationTemplate,
      NotificationCollection = Notification.getDataSource().connector.collection(Notification.modelName),
      members = [],
      whoAll,
      limit = 300,
      temp = {
        templateId: request.body.templateId,
        memberId: ''
      };

    //delete unused variables
    try {
      delete request.body.templateId;
    } catch(e) {}
    async.parallel([
      function(cbk3) {
        NotificationTemplate.findById(temp.templateId, {fields: ['content', 'notificationPostId']}, cbk3);
      },
      function(cbk3) {
        switch(temp.templateId) {
          //like
          case '571898fed9662b1c19ebfc3c':
          case '5718999fd9662b1c19ebfc3d':
          case '571899b6d9662b1c19ebfc3e':
          case '571899dcd9662b1c19ebfc3f':
            assert(typeof request.params.id === 'string', 'id required when calling Notification.customCreate()');
            assert(typeof request.body.post_likes === 'object', 'id required when calling Notification.customCreate()');
            assert(typeof request.body.post_likes[request.body.post_likes.length - 1].member_id === 'string', 'like user memberId required when calling Notification.customCreate()');
            assert(typeof request.body.member_id === 'string', 'post user memberId required when calling Notification.customCreate()');
            MemberConnection.find({
              where: {memberPostId: request.params.id},
              fields: ['connectingMemberId', 'postingMemberId']
            }, function(err, res) {
              if(err) cbk3(err, null);
              else {
                var temp2 = [];
                whoAll = request.body.post_likes[request.body.post_likes.length - 1].member_id;
                temp2.push(request.body.member_id);
                if(res && res.length) {
                  res.forEach(function (v) {
                    if (v.connectingMemberId && temp2.indexOf(v.connectingMemberId) === -1 && v.connectingMemberId !== whoAll)
                      temp2.push(v.connectingMemberId);
                  });
                }
                temp.memberPostId = request.params.id;
                cbk3(null, temp2);
              }
            });
            break;

          //connect
          case '57189b74d9662b1c19ebfc48':
          case '57189b84d9662b1c19ebfc49':
          case '57189b96d9662b1c19ebfc4a':
          case '57189ba7d9662b1c19ebfc4b':
            assert(typeof request.body.connectingMemberId === 'string', 'connectingMemberId required when calling Notification.customCreate()');
            assert(typeof request.body.postingMemberId === 'string', 'postingMemberId required when calling Notification.customCreate()');
            assert(typeof request.body.memberPostId === 'string', 'memberPostId required when calling Notification.customCreate()');
            temp.memberPostId = request.body.memberPostId;
            whoAll = request.body.connectingMemberId;
            cbk3(null, [request.body.postingMemberId]);
            break;

          //leave
          case '57bee205ee2caf480c89b2f4':
            assert(typeof request.params.id === 'string', 'id required when calling Notification.customCreate()');
            MemberConnection.findById(request.params.id, {fields: ['postingMemberId', 'connectingMemberId', 'memberPostId']}, function(err, res) {
              if(err || !res) cbk3(err, null);
              else {
                temp.memberPostId = res.memberPostId;
                whoAll = res.connectingMemberId;
                cbk3(null, [res.postingMemberId]);
              }
            });
            break;

          //bookmark
          case '57189afad9662b1c19ebfc44':
          case '57189b11d9662b1c19ebfc45':
          case '57189b22d9662b1c19ebfc46':
          case '57189b35d9662b1c19ebfc47':
            assert(typeof request.params.id === 'string', 'id required when calling Notification.customCreate()');
            assert(typeof request.body.member_bookmark === 'object', 'member_bookmark required when calling Notification.customCreate()');
            var temp2 = request.body.member_bookmark[request.body.member_bookmark.length - 1];
            MemberPost.findById(temp2.post_id, {fields: ['memberId']}, function(err, res) {
              if(err || !res) cbk3(err, null);
              else {
                temp.memberPostId = temp2.post_id;
                whoAll = request.params.id;
                cbk3(null, [res.memberId]);
              }
            });
            break;

          //member bookmark
          case '57c7cfad99887f35803fbdf8':
            assert(typeof request.params.id === 'string', 'id required when calling Notification.customCreate()');
            assert(typeof request.body.member_bookmark === 'object', 'member_bookmark required when calling Notification.customCreate()');
            var temp2 = request.body.member_bookmark[request.body.member_bookmark.length - 1];
            Member.findById(temp2.post_id, {fields: ['memberId']}, function(err, res) {
              if(err || !res) cbk3(err, null);
              else {
                temp.memberPostId = temp2.post_id;
                whoAll = request.params.id;
                cbk3(null, [res.memberId]);
              }
            });
            break;

          //share
          case '57189a64d9662b1c19ebfc40':
          case '57189a87d9662b1c19ebfc41':
          case '57189aa7d9662b1c19ebfc42':
          case '57189ab6d9662b1c19ebfc43':
            cbk3(null, null);
            break;

          //add product
          case '570f391b657cf64c0900002b':
          case '57c551abca84ed5eecd48294':
          case '57c551caca84ed5eecd48295':
          case '57c551efca84ed5eecd48296':
            assert(typeof request.body.memberId === 'string', 'id required when calling Notification.customCreate()');
            MemberConnection.find({
              where: {postingMemberId: request.body.memberId},
              fields: ['connectingMemberId']
            }, function(err, res) {
              if(err || !res) cbk3(err, null);
              else {
                var temp2 = [];
                res.forEach(function (v) {
                  if (v.connectingMemberId && temp2.indexOf(v.connectingMemberId) === -1)
                    temp2.push(v.connectingMemberId);
                });
                temp.memberPostId = data.id;
                whoAll = request.body.memberId;
                cbk3(null, temp2);
              }
            });
            break;

          //double adore
          case '57c55340ca84ed5eecd48297':
            assert(typeof request.body.friendId === 'string', 'id required when calling Notification.customCreate()');
            temp.memberPostId = request.body.friendId;
            whoAll = request.body.friendId;
            cbk3(null, [request.body.memberId]);
            break;
        }
      }
    ], function(err, result) {
      if (err) next(err);
      else {
        //create notifications
        members = result[1];
        async.map(members, function (mem, cbk) {
          async.parallel([
            function (cbk2) {
              Notification.count({memberId: mem}, cbk2);
            },
            function (cbk2) {
              temp.templateId = new ObjectID(temp.templateId);
              temp.memberPostId = new ObjectID(temp.memberPostId);
              mem = new ObjectID(mem);
              NotificationCollection.updateOne(util._extend(temp, {memberId: mem}), {
                $addToSet: {whoAllId: whoAll},
                $set: {modified: new Date(), read: false},
                $setOnInsert: {created: new Date(), templateContent: result[0].content, postTemplateId: new ObjectID(result[0].notificationPostId)}
              }, {upsert: true}, cbk2);
            }
          ], function (err, res) {
            if (err) cbk(err);
            else {
              res[0]++;
              if (limit && res[0] >= limit) {
                Notification.find({
                  where: {notificationTypeId: {neq: '5718753b657cf65417000030'}},
                  fields: ['id'],
                  order: 'modified ASC',
                  limit: res[0] + 1 - limit
                }, function (err, records) {
                  if (err) cbk(err);
                  Notification.destroyAll({
                    id: {
                      inq: records.map(function (v) {
                        return v.id;
                      })
                    }
                  }, cbk);
                });
              }
              else cbk(null);
            }
          });
        }, next);
      }
    });
  };

  //read multiple records
  Notification.readAll = function(data, cb) {
    assert(typeof data === 'object', 'where required when calling Member.readAll()');
    assert(typeof data.where === 'object', 'where required when calling Member.readAll()');
    assert(typeof data.update === 'object', 'update required when calling Member.readAll()');
    Notification.updateAll(data.where, data.update, cb);
  };

  //Delete all records
  Notification.deleteAll = function(data, cb) {
    assert(typeof data === 'object', 'where required when calling Member.deleteAll()');
    assert(typeof data.where === 'object', 'where required when calling Member.deleteAll()');
    Notification.destroyAll(data.where, cb);
  };

  //Remote Method
  Notification.remoteMethod('readAll', {
    http: {path: '/readAll', verb: 'post'},
    accepts: {arg: 'data', type: 'object', http: {source: 'body'}, required: true, description: 'data is required.'},
    return: {root: true, type: 'boolean'},
    description: 'Read all for authenticated user.'
  });

  //Remote Method
  Notification.remoteMethod('deleteAll', {
    http: {path: '/deleteAll', verb: 'delete'},
    accepts: {arg: 'data', type: 'object', http: {source: 'body'}, required: true, description: 'data is required.'},
    return: {root: true, type: 'boolean'},
    description: 'Delete all for authenticated user.'
  });
};
