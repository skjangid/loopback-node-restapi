module.exports = function(MemberProfile) {
    var async = require('async');
    MemberProfile.disableRemoteMethodByName('createChangeStream', true)
    MemberProfile.afterRemote('create', function(context, data, next) {
        var ThreapistProfileLanguage = MemberProfile.app.models.ThreapistProfileLanguage;
        var ThreapistProfileAvailableFor = MemberProfile.app.models.ThreapistProfileAvailableFor;
        var MemberProfileAreaOfExperiance = MemberProfile.app.models.MemberProfileAreaOfExperiance;
        var MemberProfileSpecialist = MemberProfile.app.models.MemberProfileSpecialist;
        //console.log(context);
        if(data)
        {
            if(data.experianceArea)
            {
                data.experianceArea.map(function(list){
                    var langObj = {"therapistProfileId":data.id,"categoryId":list};
                    MemberProfileAreaOfExperiance.create(langObj, function(err) {
                        if (err) console.error(err);
                    });
                });
            }
            if(data.conversationType)
            {
                data.conversationType.map(function(list){
                    var langObj = {"therapistProfileId":data.id,"conversationTypeId":list};
                    ThreapistProfileAvailableFor.create(langObj, function(err) {
                        if (err) console.error(err);
                    });
                });
            }
            if(data.specialist)
            {
                data.specialist.map(function(list){
                    var langObj = {"therapistProfileId":data.id,"categoryId":list};
                    MemberProfileSpecialist.create(langObj, function(err) {
                        if (err) console.error(err);
                    });
                });
            }
        }
        next();
    });
    
     MemberProfile.beforeRemote('*.updateAttributes', function(context, unused, next) {
        console.log('test')
     });
    
    MemberProfile.observe('after update', function (ctx, next) {
    console.log('test')
});
    
    MemberProfile.afterRemote('update', function(context, data, next) {
        console.log('update'); return false;
        var ThreapistProfileLanguage = MemberProfile.app.models.ThreapistProfileLanguage;
        var ThreapistProfileAvailableFor = MemberProfile.app.models.ThreapistProfileAvailableFor;
        var MemberProfileAreaOfExperiance = MemberProfile.app.models.MemberProfileAreaOfExperiance;
        var MemberProfileSpecialist = MemberProfile.app.models.MemberProfileSpecialist;
        //console.log(context);
        if(data)
        {
            if(data.experianceArea)
            {
                data.experianceArea.map(function(list){
                    var langObj = {"therapistProfileId":data.id,"categoryId":list};
                    MemberProfileAreaOfExperiance.create(langObj, function(err) {
                        if (err) console.error(err);
                    });
                });
            }
            if(data.conversationType)
            {
                data.conversationType.map(function(list){
                    var langObj = {"therapistProfileId":data.id,"conversationTypeId":list};
                    ThreapistProfileAvailableFor.create(langObj, function(err) {
                        if (err) console.error(err);
                    });
                });
            }
            if(data.specialist)
            {
                data.specialist.map(function(list){
                    var langObj = {"therapistProfileId":data.id,"categoryId":list};
                    MemberProfileSpecialist.create(langObj, function(err) {
                        if (err) console.error(err);
                    });
                });
            }
        }
        next();
    });
    
    getTherapistRating = function (userId, cb) {
        
        var review = MemberProfile.app.models.Review;
        if(userId)
        {
            async.parallel([
                function(callback)
                {
                    review.find({where: {"therapistId": userId}, fields: ["rating"] },function(err, raviewData) {
                        if(raviewData)
                        {
                            var totalRating = 0;
                            raviewData.map(function(reviewList){
                                totalRating += reviewList.rating;
                            })
                            callback(null,totalRating);
                        }
                    });
                }
            ]
            ,function(err,res)
            {
                cb(res[0]);
            });
        }
    }

    
    MemberProfile.computeRating = function computeRating(item) {
        var review = MemberProfile.app.models.Review;
        
        if(item)
        {
            
            async.parallel([
            function(callback)
            {
                return 5;
                
                //console.log(list)
                review.find({where: {"therapistId": item.id}, fields: ["rating"] },function(err, raviewData) {
                    if(raviewData)
                    {
                        var totalRating = 0;
                        raviewData.map(function(reviewList){
                            totalRating += reviewList.rating;
                        })
                        callback(null,totalRating);
                    }
                });
            }]
            ,function(err,res)
            {
                console.log(res[0]);
                //cb(res[0]);
                return 5;
            });
        }
    };
    

};
