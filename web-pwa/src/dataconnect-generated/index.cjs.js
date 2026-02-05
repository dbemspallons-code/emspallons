const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'bus-management-complete',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const addMovieToListRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddMovieToList', inputVars);
}
addMovieToListRef.operationName = 'AddMovieToList';
exports.addMovieToListRef = addMovieToListRef;

exports.addMovieToList = function addMovieToList(dcOrVars, vars) {
  return executeMutation(addMovieToListRef(dcOrVars, vars));
};

const getPublicListsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetPublicLists');
}
getPublicListsRef.operationName = 'GetPublicLists';
exports.getPublicListsRef = getPublicListsRef;

exports.getPublicLists = function getPublicLists(dc) {
  return executeQuery(getPublicListsRef(dc));
};

const createUserReviewRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateUserReview', inputVars);
}
createUserReviewRef.operationName = 'CreateUserReview';
exports.createUserReviewRef = createUserReviewRef;

exports.createUserReview = function createUserReview(dcOrVars, vars) {
  return executeMutation(createUserReviewRef(dcOrVars, vars));
};

const getMoviesByGenreRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMoviesByGenre', inputVars);
}
getMoviesByGenreRef.operationName = 'GetMoviesByGenre';
exports.getMoviesByGenreRef = getMoviesByGenreRef;

exports.getMoviesByGenre = function getMoviesByGenre(dcOrVars, vars) {
  return executeQuery(getMoviesByGenreRef(dcOrVars, vars));
};
