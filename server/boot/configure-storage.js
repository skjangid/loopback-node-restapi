module.exports = function(server) {
  //get unique name
  function uniqueName(num) {
    var res = '';
    num.toString().split('').forEach(function(v){
      res += Number(v);
    });
    return res;
  }

  server.dataSources.file.connector.getFilename = function(file, req, res) {
    var fileName = file.name.trim().replace(/[^a-z0-9\.]/gi, '-').replace(/-+/g, '-').split('.');
    var uniqValue = uniqueName(new Date().getTime());

    //Now preparing the file name..
    return fileName[0] + '_' + uniqValue + '.' + fileName[1];
  };
};
