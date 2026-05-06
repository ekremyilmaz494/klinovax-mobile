module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Türkçe commit mesajlarına uyum: subject case kuralını gevşek tut
    'subject-case': [0],
    // Body'de uzun açıklamalar için satır sınırını yumuşat
    'body-max-line-length': [1, 'always', 200],
    'footer-max-line-length': [1, 'always', 200],
  },
};
