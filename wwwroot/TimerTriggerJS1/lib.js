const greenlock = require('greenlock');
const leStore = require('le-store-certbot');
const leChallenge = require('le-challenge-azure-storage');
const msRestAzure = require('ms-rest-azure');
const azureArmWebsite = require('azure-arm-website');
const { execFileSync } = require('child_process');
const { readFileSync } = require('fs');

module.exports = (resourceGroupName, appServiceName, domains, email, environments) => {
  const {
    TEST,
    OPENSSL_PATH,
    CUSTOMCONNSTR_CLIENT_ID,
    CUSTOMCONNSTR_CLIENT_SECRET,
    CUSTOMCONNSTR_TENANT,
    CUSTOMCONNSTR_SUBSCRIPTION_ID,
    CUSTOMCONNSTR_PFX_PASSWORD,
    CUSTOMCONNSTR_AZURE_STORAGE_CONNECTION_STRING,
    CUSTOMCONNSTR_AZURE_STORAGE_CONTAINER
  } = environments;

  const storeDir = __dirname + '/acme';

  const fileKey = `${storeDir}/live/${domains[0]}/privkey.pem`;
  const fileCert = `${storeDir}/live/${domains[0]}/cert.pem`;
  const fileChain = `${storeDir}/live/${domains[0]}/chain.pem`;
  const filePFX = `${storeDir}/live/${domains[0]}/certificate.pfx`;

  const server = (TEST === 'true' ? 'staging' : 'production');

  const store = leStore.create({
    configDir: storeDir
  });

  const challenge = leChallenge.create({
    connectionString: CUSTOMCONNSTR_AZURE_STORAGE_CONNECTION_STRING,
    blobContainer: CUSTOMCONNSTR_AZURE_STORAGE_CONTAINER
  });

  const le = greenlock.create({
    version: 'draft-11',
    server,
    store,
    challengeType: 'http-01',
    challenge,
    agreeToTerms: (opts, agreeCb) => agreeCb(null, opts.tosUrl),
    renewWithin: 14 * 24 * 60 * 60 * 1000,
    renewBy: 10 * 24 * 60 * 60 * 1000
  });

  const mainPromise = le.register({
    domains,
    email,
    agreeTos: true,
    rsaKeySize: 2048
  }).then(() => {
    execFileSync(OPENSSL_PATH, [
      'pkcs12', '-export',
      '-inkey', fileKey,
      '-in', fileCert,
      '-certfile', fileChain,
      '-out', filePFX,
      '-passout', `pass:${CUSTOMCONNSTR_PFX_PASSWORD}`
    ]);

    return new Promise((resolve, reject) =>
      msRestAzure.loginWithServicePrincipalSecret(CUSTOMCONNSTR_CLIENT_ID, CUSTOMCONNSTR_CLIENT_SECRET, CUSTOMCONNSTR_TENANT, (err, credentials) => {
        if (err) {
          reject(err);
        } else {
          const client = new azureArmWebsite(credentials, CUSTOMCONNSTR_SUBSCRIPTION_ID);

          client.webApps.get(resourceGroupName, appServiceName)
            .then(({ location }) =>
              client.certificates.createOrUpdate(resourceGroupName, `${domains[0]}-${+new Date()}`, {
                pfxBlob: readFileSync(filePFX),
                password: CUSTOMCONNSTR_PFX_PASSWORD,
                location
              })
            )
            .then(({ thumbprint }) =>
              domains.reduce((prevPromise, domain) =>
                prevPromise.then(() =>
                  client.webApps.createOrUpdateHostNameBinding(resourceGroupName, appServiceName, domain, {
                    sslState: 'SniEnabled',
                    thumbprint
                  })
                ),
                Promise.resolve()
              )
            )
            .then(() => resolve('success'))
            .catch((err) =>
              err.statusCode === 409
                ? resolve('already exists')
                : reject(err)
            );
        }
      })
    );
  });

  return mainPromise;
};
