module.exports = function(Language) {
    Language.disableRemoteMethodByName('createChangeStream', true)
};
