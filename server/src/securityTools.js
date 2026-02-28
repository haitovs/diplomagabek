function scorePassword(password) {
  if (!password) {
    return {
      score: 0,
      level: 'very-weak',
      feedback: ['Password is empty.']
    };
  }

  let score = 0;
  const feedback = [];

  if (password.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters.');

  if (password.length >= 12) score += 1;
  else feedback.push('Use 12+ characters for better resistance.');

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  else feedback.push('Mix uppercase and lowercase letters.');

  if (/\d/.test(password)) score += 1;
  else feedback.push('Add numbers.');

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('Add special symbols.');

  const commonPatterns = [/1234/, /password/i, /qwerty/i, /admin/i];
  if (commonPatterns.some((re) => re.test(password))) {
    score = Math.max(score - 2, 0);
    feedback.push('Avoid common patterns and leaked passwords.');
  }

  const level = score <= 1
    ? 'very-weak'
    : score === 2
      ? 'weak'
      : score === 3
        ? 'medium'
        : score === 4
          ? 'strong'
          : 'very-strong';

  return {
    score,
    level,
    feedback
  };
}

function identifyHashType(hash) {
  const normalized = (hash || '').trim();

  if (/^WPA\*(01|02)\*/i.test(normalized)) {
    return {
      mode: 22000,
      name: 'WPA-PBKDF2-PMKID+EAPOL',
      confidence: 0.99
    };
  }

  if (/^[a-f0-9]{32}$/i.test(normalized)) {
    return {
      mode: 0,
      name: 'MD5',
      confidence: 0.8
    };
  }

  if (/^[A-Fa-f0-9]{40}$/.test(normalized)) {
    return {
      mode: 100,
      name: 'SHA1',
      confidence: 0.75
    };
  }

  return {
    mode: null,
    name: 'Unknown',
    confidence: 0
  };
}

function buildMask({
  lowercase = 0,
  uppercase = 0,
  digits = 0,
  symbols = 0
}) {
  const mask = `${'?u'.repeat(uppercase)}${'?l'.repeat(lowercase)}${'?d'.repeat(digits)}${'?s'.repeat(symbols)}`;
  return {
    mask,
    length: uppercase + lowercase + digits + symbols
  };
}

export {
  buildMask,
  identifyHashType,
  scorePassword
};
