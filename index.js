const express = require('express');
const ParseServer = require('parse-server').ParseServer;
const ParseDashboard = require('parse-dashboard');
const Parse = require('parse/node');


const packageJSON = require('./package.json');
const config = require('./config.json');

const parseConfig = config.parseConfig;

const PORT        = process.env.PORT          || parseConfig.port;
const URL_SERVER  = process.env.SERVER_URL    || parseConfig.serverURL;
const URL_DB      = process.env.DATABASE_URI  ||
                    process.env.MONGODB_URI   || parseConfig.databaseURI;
const APP_ID      = process.env.APP_ID        || parseConfig.appId;
const MASTER_KEY  = process.env.MASTER_KEY    || parseConfig.masterKey;

const DASHBOARD_ACTIVATED = process.env.DASHBOARD_ACTIVATED || (config.dashboardConfig ? config.dashboardConfig.dashboardActivated : false);
const DASH_USER_EMAIL     = process.env.USER_EMAIL          || (config.dashboardConfig ? config.dashboardConfig.userEmail : '');
const DASH_USER_PASSWORD  = process.env.USER_PASS           || (config.dashboardConfig ? config.dashboardConfig.userPassword : '');

const URL_SITE    = process.env.SITE_URL      || config.siteURL;

const emailOptions = parseConfig.emailAdapter ?  parseConfig.emailAdapter.options : null;
if (emailOptions) {
  emailOptions.fromAddress  = process.env.FROM_ADDRESS    || emailOptions.fromAddress;
  emailOptions.domain       = process.env.MAILGUN_DOMAIN  || emailOptions.domain;
  emailOptions.apiKey       = process.env.MAILGUN_API_KEY || emailOptions.apiKey;
}


Object.assign(parseConfig, {
  appId: APP_ID,
  masterKey: MASTER_KEY,
  databaseURI: URL_DB,
  serverURL: URL_SERVER,
  publicServerURL: URL_SERVER,

  cloud: "./cloud/main"
});

const cps = parseConfig.customPages;
for (let p in cps) {
  cps[p] = URL_SITE + cps[p];
}

module.exports.parseConfig = parseConfig;
module.exports.URL_SITE = URL_SITE;


const API = new ParseServer(parseConfig);
const app = new express();
app.use('/parse', API);


if (DASHBOARD_ACTIVATED) {
  const dashboardConfig = {
    apps: [{
      serverURL: `http://localhost:${PORT}/parse`,
      appId: APP_ID,
      masterKey: MASTER_KEY,
      appName: parseConfig.appName
    }],
    trustProxy: 1,
    PARSE_DASHBOARD_ALLOW_INSECURE_HTTP: 1,
    allowInsecureHTTP: 1
  };

  if (DASH_USER_EMAIL && DASH_USER_PASSWORD)
    dashboardConfig.users = [{
      user: DASH_USER_EMAIL,
      pass: DASH_USER_PASSWORD
    }];
  
  module.exports.dashboardConfig = dashboardConfig;
  const dashboard = new ParseDashboard(dashboardConfig, {allowInsecureHTTP: true});
  app.use('/dashboard', dashboard);
}


const postStart = async () => {
  Parse.initialize(APP_ID, null, MASTER_KEY);
  Parse.serverURL = URL_SERVER;
};

app.listen(PORT, async () => {
  await postStart();
  console.log(`Chisel Parse server v${packageJSON.version} running on port ${PORT}.`);
});
