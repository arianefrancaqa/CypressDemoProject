const ApiError = require("./ApiError");

// Resource not found and "found but not yours" are deliberately distinct
// (404 vs 403) so IDOR tests can tell the two cases apart.
function assertOwnerOrAdmin(resource, user, notFoundMessage) {
  if (!resource) {
    throw ApiError.notFound(notFoundMessage);
  }
  if (resource.user_id !== user.id && user.role !== "admin") {
    throw ApiError.forbidden();
  }
}

module.exports = { assertOwnerOrAdmin };
