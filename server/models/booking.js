module.exports = function(Booking) {
    var ObjectId = require('mongodb').ObjectID;
    var async = require('async');
    var dateFormat = require("dateformat");
    
    var getTimeZoneHours=parseInt(new Date().getTimezoneOffset()/60);
    var estTimeZone = getTimeZoneHours ;
    var mongoGroupTimeZoneDay={$dayOfMonth:{$subtract:['$created', parseInt(getTimeZoneHours)*60*60*1000]}};
    var mongoGroupTimeZoneMonth={$month:{$subtract:['$created', parseInt(getTimeZoneHours)*60*60*1000]}};
    
    Booking.disableRemoteMethodByName('createChangeStream', true);
    Booking.disableRemoteMethodByName('replaceOrCreate', true);
    Booking.disableRemoteMethodByName('upsertWithWhere', true);
    
    Booking.remoteMethod('dashboard', {
      http: {path: '/dashboard', verb: 'get'},
      accepts: {arg: 'options', type: 'object', http: {source: 'query'}, required: true, description: 'Options defining to get dashboard'},
      returns: {arg: 'result', type: 'object'},
      description: 'dashboard'
    });
    
    Booking.dashboard = function (opt, cb) {
        if(opt && opt.where && (opt.where.therapistId  ||  opt.where.companyId))
        {
            var condition = {};
            var aggregateCondition = {};
            var therapistId = type = 'all';
            
            var todayTstmp = parseInt(Date.now());
            var today = new Date(todayTstmp);
            
            if(opt && opt.where && opt.where.type)
            {
                var type = opt.where.type;
            }
            
            async.parallel([
            function(cbk)
            {
                var CompanyProfile = Booking.app.models.Member;
                if((opt && opt.where && opt.where.therapistId && opt.where.companyId) || opt.where && opt.where.companyId)
                {
                    var query = {where: {id: opt.where.companyId},fields : ['memberSince']};
                    CompanyProfile.findOne({filter:query}, function (err, user) {
                        if(user)
                        {
                            var p = user.toJSON();
                            var myDate = new Date(p['memberSince']);
                            var lastDay = myDate.getTime();
                            var daysDiff = (new Date(parseInt(Date.now())) - p['memberSince']);
                            var resp ={
                                'daysDiff' : daysDiff,
                                'lastDay':lastDay
                            }
                            cbk(null,resp);
                        }
                        else{
                            cbk(null,null);
                        }
                    });
                }
                else if(opt && opt.where && opt.where.therapistId)
                {
                    var TherapistProfile = Booking.app.models.TherapistProfile;
                    var query = {where: {id: opt.where.therapistId},fields : ['memberSince']};
                    CompanyProfile.findOne({filter:query}, function (err, user) {
                        if(user)
                        {
                            var p = user.toJSON();
                            var myDate = new Date(p['memberSince']);
                            var lastDay = myDate.getTime();
                            var daysDiff = (new Date(parseInt(Date.now())) - p['memberSince']);
                            var resp ={
                                'daysDiff' : daysDiff,
                                'lastDay':lastDay
                            }
                            cbk(null,resp);
                        }
                        else{
                            cbk(null,null);
                        }
                        
                    });
                }
            }],function(err,res)
            {
                    if (err) return cb(err);
                    if(type=='weekly')
                    {
                        var daysDiff = 7 * 86400000;
                        var lastDay = new Date(parseInt(Date.now() - daysDiff));
                        condition['created'] = 
                        {
                            "$gte":  lastDay,
                            "$lte":  today
                        }
                    }
                    else if(type=='monthly')
                    {
                        var daysDiff = 30 * 86400000;
                        var lastDay = new Date(parseInt(Date.now() - daysDiff));
                        condition['created'] = 
                        {
                            "$gte":  lastDay,
                            "$lte":  today
                        }
                    }
                    else if(type=='all')
                    {
                        if(res && res[0])
                        {
                            var daysDiff = res[0]['daysDiff'];
                            var lastDay = res[0]['lastDay'];
                        }
                        else{
                            var daysDiff = 365 * 86400000;
                            var lastDay = new Date(parseInt(Date.now() - daysDiff));
                        }
                        
                    }
                    
                    if(opt && opt.where && opt.where.therapistId && opt.where.companyId)
                    {
                        var companyId = opt.where.companyId;
                        var therapistId = opt.where.therapistId;
                        
                        condition['companyId'] = ObjectId(companyId);
                        condition['therapistId'] = ObjectId(therapistId);
                        
                        var aggregateBookingCondition = { $sum: { $cond :  [
                            {$and :[
                                {$gte : ["$created", lastDay]},
                                {$lte : ["$created", today]},
                                {$eq : ["$therapistId", ObjectId(therapistId)]},
                                {$eq : ["$companyId", ObjectId(companyId)]}
                                ]}
                        , 1, 0]} };
                        
                        
                        var aggregateHoursCondition= { $sum: { $cond :  [
                            {$and :[
                                {$gte : ["$created", lastDay]},
                                {$lte : ["$created", today]},
                                {$eq : ["$therapistId", ObjectId(therapistId)]},
                                {$eq : ["$companyId", ObjectId(companyId)]}
                                ]}
                        , {$divide : [ "$spendTime", 60 ]}, 0]} };
                        
                        
                        var aggregateRevenueCondition= { $sum: { $cond :  [
                            {$and :[
                                {$gte : ["$created", lastDay]},
                                {$lte : ["$created", today]},
                                {$eq : ["$therapistId", ObjectId(therapistId)]},
                                {$eq : ["$companyId", ObjectId(companyId)]}
                                ]}
                        , "$bookingAmount", 0]} };
                        
                    }
                    else if(opt && opt.where && opt.where.therapistId)
                    {
                        var therapistId = opt.where.therapistId;
                        condition['therapistId'] = ObjectId(therapistId);
                        
                        var aggregateBookingCondition = { $sum: { $cond :  [
                            {$and :[
                                {$gte : ["$created", lastDay]},
                                {$lte : ["$created", today]},
                                {$eq : ["$therapistId", ObjectId(therapistId)]}
                                ]}
                        , 1, 0]} };
                        
                        var aggregateHoursCondition= { $sum: { $cond :  [
                            {$and :[
                                {$gte : ["$created", lastDay]},
                                {$lte : ["$created", today]},
                                {$eq : ["$therapistId", ObjectId(therapistId)]},
                                ]}
                        , {$divide : [ "$spendTime", 60 ]}, 0]} };
                         
                        var aggregateRevenueCondition= { $sum: { $cond :  [
                            {$and :[
                                {$gte : ["$created", lastDay]},
                                {$lte : ["$created", today]},
                                {$eq : ["$therapistId", ObjectId(therapistId)]},
                                ]}
                        , "$bookingAmount", 0]} };
                        
                        
                    }
                    else if(opt && opt.where && opt.where.companyId)
                    {
                        var companyId = opt.where.companyId;
                        condition['companyId'] = ObjectId(companyId);
                        
                        var aggregateBookingCondition = { $sum: { $cond :  [
                            {$and :[
                                {$gte : ["$created", lastDay]},
                                {$lte : ["$created", today]},
                                {$eq : ["$companyId", ObjectId(companyId)]}
                                ]}
                        , 1, 0]} };
                        
                        var aggregateHoursCondition= { $sum: { $cond :  [
                            {$and :[
                                {$gte : ["$created", lastDay]},
                                {$lte : ["$created", today]},
                                {$eq : ["$companyId", ObjectId(companyId)]}
                                ]}
                        , {$divide : [ "$spendTime", 60 ]}, 0]} };
                         
                         var aggregateRevenueCondition= { $sum: { $cond :  [
                            {$and :[
                                {$gte : ["$created", lastDay]},
                                {$lte : ["$created", today]},
                                {$eq : ["$companyId", ObjectId(companyId)]}
                                ]}
                        , "$bookingAmount", 0]} };
                    }
                   
                    var start = todayTstmp-daysDiff;
                    var end = todayTstmp;
                    
                    async.parallel([
                    function(callback)
                    {
                        Booking.getDataSource().connector.connect(function(err, db) {
                            var Booking = db.collection('Booking');
                            Booking.aggregate(
                            [
                                {
                                    $match: condition
                                    
                                },
                                {
                                    $group:
                                    {
                                        _id:
                                        {
                                            therapistId: "$therapistId"
                                        },
                                        totalConditionlBooking:aggregateBookingCondition,
                                        totalConditionlHours: aggregateHoursCondition,
                                        totalConditionlRevenue: aggregateRevenueCondition,
                                        totalHours: { $sum: {$divide : [ "$spendTime", 60 ]}},
                                        totalRevenue: { $sum: "$bookingAmount" },
                                        totalBooking:{$sum: 1 },
                                        avgAmount: { $avg: "$bookingAmount" },
                                        avgTime: { $avg: {$divide : [ "$spendTime", 60 ]} },
                                        avgRating: { $avg: "$rating"},
                                        rating_1 : {$sum : {$cond: [ {"$eq": [ "$rating", 1]},1,0 ]}},
                                        rating_2 : {$sum : {$cond: [ {"$eq": [ "$rating", 2]},1,0 ]}},
                                        rating_3 : {$sum : {$cond: [ {"$eq": [ "$rating", 3]},1,0 ]}},
                                        rating_4 : {$sum : {$cond: [ {"$eq": [ "$rating", 4]},1,0 ]}},
                                        rating_5 : {$sum : {$cond: [ {"$eq": [ "$rating", 5]},1,0 ]}},
                                        chat : {$sum : {$cond: [ {"$eq": [ "$conversationTypeId", ObjectId("5914096f585257981a1e35bd")]},1,0 ]}},
                                        audio : {$sum : {$cond: [ {"$eq": [ "$conversationTypeId", ObjectId("59140978585257981a1e35be")]},1,0 ]}},
                                        video : {$sum : {$cond: [ {"$eq": [ "$conversationTypeId", ObjectId("59140982585257981a1e35bf")]},1,0 ]}}
                                    },
                                },
                                {
                                    $project:{
                                        totalConditionlBooking:1,
                                        totalConditionlRevenue :1,
                                        totalConditionlHours :1,
                                        totalHours : 1,
                                        totalRevenue : 1,
                                        totalBooking :1,
                                        avgAmount : 1,
                                        avgTime : 1,
                                        avgRating : 1,
                                        rating_1 : { $multiply: [ { $divide: [ "$rating_1", "$totalBooking" ]} ,100]},
                                        rating_2 : { $multiply: [ { $divide: [ "$rating_2", "$totalBooking" ]} ,100]},
                                        rating_3 : { $multiply: [ { $divide: [ "$rating_3", "$totalBooking" ]} ,100]},
                                        rating_4 : { $multiply: [ { $divide: [ "$rating_4", "$totalBooking" ]} ,100]},
                                        rating_5 : { $multiply: [ { $divide: [ "$rating_5", "$totalBooking" ]} ,100]},
                                        chat : { $multiply: [ { $divide: [ "$chat", "$totalBooking" ]} ,100]},
                                        audio : { $multiply: [ { $divide: [ "$audio", "$totalBooking" ]} ,100]},
                                        video : { $multiply: [ { $divide: [ "$video", "$totalBooking" ]} ,100]},
                                        percentBooking: { $multiply: [ { $divide: [ "$totalConditionlBooking", "$totalBooking" ]} ,100]},
                                        percentHours: { $multiply: [ { $divide: [ "$totalConditionlHours", "$totalHours" ]} ,100]},
                                        percentRevenue: { $multiply: [ { $divide: [ "$totalConditionlRevenue", "$totalRevenue" ]} ,100]}
                                    }
                                },
                            ], function(err, data) {
                                if (err) return cb(err);
                                callback(null,data);
                            });
                        });
                        
                    },
                    function(callback)
                    {
                        var TherapistProfile = Booking.app.models.Member;
                        TherapistProfile.findOne({where: {id: therapistId}}, function (err, user) {
                            callback(null,user);
                        });
                    },
                    function(callback)
                    {
                        Booking.getDataSource().connector.connect(function(err, db) {
                            var Booking = db.collection('Booking');
                            
                            if(type=='weekly')
                            {
                                Booking.aggregate(
                                [
                                    {
                                        $match: condition
                                    },
                                    {
                                        $group:
                                        {
                                            _id: {
                                                year: {$year: '$created'},
                                                month:{$month: '$created'},
                                                day:mongoGroupTimeZoneDay
                                            }, dateBooking: {$sum: 1}
                                        }
                                    }
                                ], function(err, data) {
                                    
                                    
                                     /*##this method return object array contain date and zero value ##*/
                                    var $getObject = _date_difference_array(start, end);
                                    var $dataObject = [];
                                    data.forEach(function (key, value) {
                                        var $generateTimeStamp = new Date(key._id.year + '-' + key._id.month + '-' + key._id.day).getTime()
                                        var $setDate = key._id.year + '-' + _set_month(key._id.month) + '-' + _set_date(key._id.day);
                                        $dataObject[$setDate] = Math.round(key.dateBooking);
                                    });
                                    var $bookings = [];
                                    var $xAxisDate = [];
                                    for (var k in $getObject) {
                                        $xAxisDate.push(dateFormat(new Date(_manage_server_date(k)), 'ddd'));
                                        var $dataValue = $dataObject[k];
                                        (typeof $dataValue == "undefined") ? $dataValue = 0 : $dataValue;
                                        var $getTotalData = parseFloat($dataValue).toFixed(2);
                                        $bookings.push(parseFloat($getTotalData));
                                    }
                                    var $response = {
                                        yAxis: $bookings,
                                        xAxis: $xAxisDate,
                                    }
                                    if (err) return callback(err);
                                    
                                    callback(null,$response);
                                    
                                })
                            }
                            else if(type=='monthly')
                            {
                                Booking.aggregate(
                                [
                                    {
                                        $match:condition
                                        
                                    },
                                    {
                                        $group:
                                        {
                                            _id:
                                            {
                                                year: {$year: '$created'},
                                                month: {$month: '$created'},
                                                day: mongoGroupTimeZoneDay,
                                            }, dateBooking: {$sum: 1}
                                        }
                                    }
                                ], function(err, data) {
                                    
                                    var $xAxisDate = [], $bookings = [];
                                    var $start = parseInt(start), $end = parseInt(end);
                                    while ($start < $end) {
                                        $xAxisDate.push(dateFormat(new Date(parseInt($start)), 'd-mmm'));
                                        $start = new Date(parseInt($start)).setDate(new Date(parseInt($start)).getDate() + 1);
                                    }
                                    
                                    $xAxisDate.forEach(function (key, value) {
                                        var $checkValue = 0, $getData = 0;
                                        data.forEach(function (dkey, ind) {
                                            if (String(dkey._id.day) == String(_get_date(key))) {
                                                var $getVal = dkey.dateBooking;
                                                $getData = parseFloat(parseFloat($getVal)).toFixed(2);
                                                $checkValue = 1;
                                            }
                                        });
                                        if ($checkValue == 0) {
                                            $getData = parseFloat(0);
                                        }
                                        $bookings.push(parseFloat($getData));
                                    });
                                    
                                    var $response = {
                                        yAxis: $bookings,
                                        xAxis: $xAxisDate,
                                    }
                                    
                                    if (err) return callback(err);
                                    
                                    callback(null,$response);
                                });
                            }
                            else if(type=="all")
                            {
                                Booking.aggregate(
                                [
                                    {
                                        $match: condition
                                    },
                                    {
                                        $group:
                                        {
                                            _id:
                                            {
                                                year: {$year: '$created'},
                                                month:mongoGroupTimeZoneMonth
                                            }, dateBooking: {$sum: 1}
                                        }
                                    }
                                ], function(err, data) {
                                   
                                    var $getObject_old = _month_name("MMM");
                                    
                                    var $getObject = [], $bookings = [];
                                    
                                    var $start = parseInt(start), $end = parseInt(end);
                                    while ($start < $end) {
                                        $getObject.push(dateFormat(new Date(parseInt($start)), 'mmm'));
                                        $start = new Date(parseInt($start)).setMonth(new Date(parseInt($start)).getMonth() + 1);
                                    }
                                    
                                    var $dataObject = [];
                                    data.forEach(function (key, value)
                                    {
                                        var $setDate =key._id.month;
                                        $dataObject[$setDate] = Math.round(key.dateBooking);
                                    });
                                    var $bookings = [];
                                    var $xAxisDate = [];
                                    var $monthName = {Jan: 1,Feb: 2,Mar: 3,Apr: 4,May: 5,Jun: 6,Jul: 7,Aug: 8,Sep: 9,Oct: 10,Nov: 11,Dec: 12};
                                    for (var k in $getObject) {
                                        $xAxisDate.push($getObject[k]);
                                        var $dataValue = $dataObject[$monthName[$getObject[k]]];
                                        (typeof $dataValue == "undefined") ? $dataValue = 0 : $dataValue;
                                        var $getTotalData = parseFloat($dataValue).toFixed(2);
                                        $bookings.push(parseFloat($getTotalData));
                                        
                                    }
                                   
                                    var $response = {
                                        yAxis: $bookings,
                                        xAxis: $xAxisDate,
                                    }
                                    
                                    if (err) return callback(err);
                                    callback(null,$response);
                                });
                            }
                            
                        });
                    }
                    ],function(err,res)
                    {
                        if (err) return cb(err);
                        var dashboardAggregateData = dashboardTherapistDetail = dashboardGraphData = '';
                        if(res[0] && res[0][0])
                        {                        
                            dashboardAggregateData = res[0][0];
                        }
                        if(res[1])
                        {
                            dashboardTherapistDetail = res[1];
                        }
                        if(res[2])
                        {
                            dashboardGraphData = res[2];
                        }
                        if (err) return cb(err);
                        
                        var result = {
                          aggregateData  :  dashboardAggregateData,
                          therapistDetail : dashboardTherapistDetail,
                          graphData : dashboardGraphData
                        };
                        cb(err, result);
                        
                    });
                });
        }
        else{
            cb(null,null)
        }
    }
    
    function _date_difference_array($startDate, $endDate) {
        var $startDate = parseInt($startDate);
        var $endDate = parseInt($endDate);
        var $dataObject = [];
        while ($startDate < $endDate) {
            var $setMonth = _set_month(new Date(parseInt($startDate)).getMonth() + 1);
            var $manageDate = _set_date(new Date(parseInt($startDate)).getDate());
            var $setDate = new Date($startDate).getFullYear() + '-' + $setMonth + '-' + $manageDate;
            $dataObject[$setDate] = 0;
            $startDate = (new Date($startDate + (60 * (60 * 24) * 1000)).getTime());
        }
        return $dataObject;
    }
    
    function _set_month($startDate) {
        var $setMonth = (parseInt($startDate) % 12) ? parseInt($startDate) : 12;
        $setMonth = ($setMonth > 9) ? $startDate : "0" + $startDate;
        return $setMonth;
    }
    
    function _set_date($startDate) {
        var $manageDate = (parseInt($startDate) % 31) ? parseInt($startDate) : 31;
        $manageDate = ($manageDate > 9) ? $startDate : "0" + $startDate;
        return $manageDate;
    }
    
    function _manage_server_date(date) {
        date = date.split('-')[1] + '-' + date.split('-')[2] + '-' + date.split('-')[0];
        return date;
    }
    
    function _get_date(date) {
        date = date.split('-')[0];
        return date;
    }
    
    function _month_name($stringName) {
        var $monthName = [];
        if ($stringName == "MMM") {
            $monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        } else if ($stringName == "MMMM") {
            $monthName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        }
        return $monthName;
    }
    
    function _object_to_array(obj) {
        var result = new Array();
        for (var k in obj) {
            if (obj[k]) {
                result.push(obj[k]);
            }
        }
        return result;
    }
  
};
