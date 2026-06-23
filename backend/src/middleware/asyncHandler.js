// Express 4 does NOT automatically forward a rejected promise from an
// async route handler to the error-handling middleware - if you don't
// catch it yourself, the request just hangs forever with no response,
// which is confusing to debug (looks like nothing happened, no clear
// error). Wrapping every handler in this fixes that: any thrown error
// gets forwarded to next(err) -> the global error handler in server.js
// -> a proper JSON response with a real status code.
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
