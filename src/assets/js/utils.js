function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function showBootstrapAlert(type, title, message, autoClose = 5000) {
  const $alertDiv = $(`
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      <strong>${title}</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `);

  const $container = $('#alerts-container').length ? $('#alerts-container') :
    $('#main-content').length ? $('#main-content') : $(document.body);

  $container.prepend($alertDiv);

  if (autoClose) {
    setTimeout(() => {
      $alertDiv.alert('close');
    }, autoClose);
  }
}

function showLoader(selector, text = '') {
  $(selector).prepend(`
    <div class="loader-overlay">
      <div class="loader-content">
        <div class="spinner-border text-primary" role="status"></div>
        ${text ? `<p class="mt-2">${text}</p>` : ''}
      </div>
    </div>
  `);
}

function hideLoader(selector) {
  $(selector).find('.loader-overlay').remove();
}