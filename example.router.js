app.use('/.well-known/acme-challenge/:key', (req, res) => {
  res.redirect(`https://«storage_name».blob.core.windows.net/«storage_container»/${req.params.key}`);
});
