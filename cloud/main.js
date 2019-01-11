console.log('Cloud code connected');


const configs = require('../index.js');
const config = configs.parseConfig;
const SITE = configs['URL_SITE'];



const promisifyW = pp => {
  return new Promise((rs, rj) => pp.then(rs, rs));
};

const checkRights = (user, obj) => {
  const acl = obj.getACL();
  if (!acl)
    return true;

  const read = acl.getReadAccess(user.id);
  const write = acl.getWriteAccess(user.id);

  const pRead = acl.getPublicReadAccess();
  const pWrite = acl.getPublicWriteAccess();
  
  return read && write || pRead && pWrite;
};

const getAllObjects = query => {
  const MAX_COUNT = 90;
  let objects = [];
  
  const getObjects = async (offset = 0) => {
    const res = await query
      .limit(MAX_COUNT)
      .skip(offset)
      .find({useMasterKey: true});
    
    if (!res.length)
      return objects;
    
    objects = objects.concat(res);
    return getObjects(offset + MAX_COUNT);
  };
  
  return getObjects();
};


const getTableData = async (table) => {
  const endpoint = '/schemas/' + table;
  
  try {
    const response = await Parse.Cloud.httpRequest({
      url: config.serverURL + endpoint,
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
        'X-Parse-Application-Id': config.appId,
        'X-Parse-Master-Key': config.masterKey
      }
    });
  
    if (response.status == 200)
      return response.data;
    
  } catch (e) {}
  
  return null;
};

const setTableData = async (table, data, method = 'POST') => {
  const endpoint = '/schemas/' + table;
  
  const response = await Parse.Cloud.httpRequest({
    url: config.serverURL + endpoint,
    method,
    mode: 'cors',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json',
      'X-Parse-Application-Id': config.appId,
      'X-Parse-Master-Key': config.masterKey
    },
    body: JSON.stringify(data)
  });
  
  if (response.status != 200)
    throw response.status;
};

const deleteTable = async (table) => {
  const endpoint = '/schemas/' + table;
  
  const response = await Parse.Cloud.httpRequest({
    url: config.serverURL + endpoint,
    method: 'DELETE',
    mode: 'cors',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json',
      'X-Parse-Application-Id': config.appId,
      'X-Parse-Master-Key': config.masterKey
    }
  });
  
  if (response.status != 200)
    throw response.status;
};


Parse.Cloud.beforeSave(Parse.User, request => {
  const user = request.object;
  const email = user.get('email');
  if (user.get('username') != email)
    user.set('username', email);
});


Parse.Cloud.define("checkPassword", request => {
  if (!request.user)
    throw 'Must be signed in to call this Cloud Function.';

  const {password} = request.params;
  if (!password)
    throw 'There is no password param!';

  const username = request.user.get('username');

  return Parse.User.logIn(username, password);
});