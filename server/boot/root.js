module.exports = function(server) {
  var path = server.get('loopback-component-explorer') && server.get('loopback-component-explorer').mountPath;
  var router = server.loopback.Router();

  //middleware
  router.get('/', function(req, res) {
    if(path) res.redirect(path);
    else res.send('You are in space.');
  });
  server.use(router);
};
