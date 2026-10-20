(function () {
  'use strict';

  function initNewsletterForm(form) {
    if (form.dataset.nlInit) return;
    form.dataset.nlInit = '1';

    var endpoint = form.dataset.endpoint;
    var requireOptIn = form.dataset.requireOptin === 'true';
    var stage = form.closest('.contact-form__stage');
    var status = form.querySelector('[data-status]');
    var submitButton = form.querySelector('button[type="submit"]');
    var optInCheckbox = form.querySelector('[name="opt_in"]');
    var successView = stage && stage.querySelector('[data-view="success"]');

    if (!endpoint || !stage || !status || !submitButton) return;

    function syncButton() {
      submitButton.disabled = requireOptIn ? !(optInCheckbox && optInCheckbox.checked) : false;
    }

    if (requireOptIn && optInCheckbox) {
      optInCheckbox.addEventListener('change', syncButton);
    }
    syncButton();

    function setStatus(message, tone) {
      status.textContent = message;
      if (tone) {
        status.dataset.tone = tone;
        status.hidden = false;
      } else {
        delete status.dataset.tone;
        status.hidden = true;
      }
    }

    function showSuccess() {
      if (!successView) return;
      form.hidden = true;
      successView.hidden = false;
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      setStatus('', null);

      if (!form.reportValidity()) return;

      submitButton.disabled = true;

      var formData = new FormData(form);
      var honeypot = formData.get('company_website');
      if (typeof honeypot === 'string' && honeypot.trim() !== '') {
        showSuccess();
        return;
      }
      var tags = [];
      try { tags = JSON.parse(formData.get('tags') || '[]'); } catch (_) {}
      if (!Array.isArray(tags)) tags = [];
      form.querySelectorAll('[data-tag-field]').forEach(function (el) {
        if (el.value) tags.push((el.dataset.tagPrefix || '') + el.value);
      });
      var payload = {
        name: formData.get('name'),
        email: formData.get('email'),
        opt_in: formData.get('opt_in') === '1',
        company_website: formData.get('company_website'),
        form_version: formData.get('form_version'),
        source: formData.get('source'),
        consent_text: formData.get('consent_text'),
        tags: JSON.stringify(tags),
        slot_id: formData.get('slot_id'),
      };
      if (formData.has('company')) payload.company = formData.get('company');
      if (formData.has('variant_key')) payload.variant_key = formData.get('variant_key');
      if (formData.has('access_token')) payload.access_token = formData.get('access_token');


      var msgError = form.dataset.msgError;
      var msgNetwork = form.dataset.msgNetwork || 'Network error. Please try again.';

      try {
        var res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        var data = await res.json().catch(function () { return {}; });

        if (res.ok && data.ok) {
          form.dispatchEvent(new CustomEvent('newsletter:success', { bubbles: true, detail: data }));
          showSuccess();
        } else {
          setStatus(msgError || data.error || 'Something went wrong. Please try again.', 'error');
          syncButton();
        }
      } catch (err) {
        setStatus(msgNetwork, 'error');
        syncButton();
      }
    });
  }

  function initAll(root) {
    (root || document).querySelectorAll('.contact-form__form').forEach(initNewsletterForm);
  }

  initAll();
  window.initNewsletterSignup = initAll;
})();