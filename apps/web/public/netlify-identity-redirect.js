(function () {
  var hash = window.location.hash;
  if (
    hash.indexOf("#invite_token=") === 0 ||
    hash.indexOf("#confirmation_token=") === 0 ||
    hash.indexOf("#recovery_token=") === 0 ||
    hash.indexOf("#access_token=") === 0
  ) {
    if (window.location.pathname !== "/admin/") {
      window.location.href = "/admin/" + hash;
    }
  }
})();
