/**
 * Generate a cryptographically valid PMKID hash (WPA*01*) using Web Crypto API.
 * The resulting hash can be cracked by real hashcat with the correct password.
 */
export async function generateValidPmkidHash(password, ssid, macAP = 'aabbccddeeff', macSTA = '112233445566') {
  const enc = new TextEncoder();

  // PMK = PBKDF2(SHA1, password, ssid, 4096, 256-bit)
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const pmkBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(ssid), iterations: 4096, hash: 'SHA-1' },
    keyMaterial, 256
  );
  const pmk = new Uint8Array(pmkBits);

  // PMKID = HMAC-SHA1(PMK, "PMK Name" + MAC_AP + MAC_STA)[:16]
  const hmacKey = await crypto.subtle.importKey(
    'raw', pmk, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const macAPBytes = new Uint8Array(macAP.match(/.{2}/g).map(b => parseInt(b, 16)));
  const macSTABytes = new Uint8Array(macSTA.match(/.{2}/g).map(b => parseInt(b, 16)));
  const dataToSign = new Uint8Array([...enc.encode('PMK Name'), ...macAPBytes, ...macSTABytes]);
  const sig = await crypto.subtle.sign('HMAC', hmacKey, dataToSign);
  const pmkid = Array.from(new Uint8Array(sig).subarray(0, 16))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const ssidHex = Array.from(enc.encode(ssid))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  return `WPA*01*${pmkid}*${macAP}*${macSTA}*${ssidHex}***`;
}
