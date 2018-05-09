const createCertificate = require('./lib');

module.exports = (context) => {
  const result = createCertificate(
    'appservice_resgroup', // Resource group
    'appservicename', // App Service name
    ['www.example.com', 'example.com'], // Registered domains
    'myemail@example.com', // Notify mail
    process.env
  );

  result
    .then((res) => { context.log.info(res); context.done(null); })
    .catch((err) => context.done(err))
};
