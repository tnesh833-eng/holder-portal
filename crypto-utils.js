/**
 * Web Crypto API E2EE Module
 * Provides client-side payload encryption (AES-256-GCM + RSA-OAEP)
 * before form data leaves the browser over the network.
 */

const E2EE = {
  // Convert ArrayBuffer to Base64
  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  },

  // Convert Base64 to ArrayBuffer
  base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  },

  // Strip PEM headers and convert to ArrayBuffer
  pemToArrayBuffer(pem) {
    const b64Lines = pem.replace(/-----BEGIN PUBLIC KEY-----/, '')
                        .replace(/-----END PUBLIC KEY-----/, '')
                        .replace(/\s+/g, '');
    return E2EE.base64ToArrayBuffer(b64Lines);
  },

  // Generate User RSA-OAEP KeyPair for public_key DB registration
  async generateClientKeyPair() {
    return window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256"
      },
      true,
      ["encrypt", "decrypt"]
    );
  },

  // Export Public Key to PEM string
  async exportPublicKeyPEM(publicKey) {
    const exported = await window.crypto.subtle.exportKey("spki", publicKey);
    const b64 = E2EE.arrayBufferToBase64(exported);
    const pemFormatted = `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
    return pemFormatted;
  },

  // Import Server RSA Public Key from PEM
  async importServerPublicKey(pem) {
    const binaryDer = E2EE.pemToArrayBuffer(pem);
    return window.crypto.subtle.importKey(
      "spki",
      binaryDer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256"
      },
      true,
      ["encrypt"]
    );
  },

  /**
   * Encrypt Sensitive Form Data Payload locally using Web Crypto API
   * Hybrid Encryption: Encrypts payload with AES-256-GCM, and encrypts AES Key with Server RSA Public Key
   */
  async encryptPayload(serverPublicKeyPem, dataObject) {
    // 1. Generate 256-bit AES-GCM Key & 12-byte IV
    const aesKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // 2. Encrypt Payload JSON string with AES-GCM
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(dataObject));
    const encryptedDataBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      dataBuffer
    );

    // 3. Export Raw AES Key bytes
    const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

    // 4. Import Server RSA Public Key and Encrypt Raw AES Key
    const serverRsaKey = await E2EE.importServerPublicKey(serverPublicKeyPem);
    const encryptedAesKeyBuffer = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      serverRsaKey,
      rawAesKey
    );

    // 5. Return Base64 encoded payload package
    return {
      encryptedData: E2EE.arrayBufferToBase64(encryptedDataBuffer),
      encryptedKey: E2EE.arrayBufferToBase64(encryptedAesKeyBuffer),
      iv: E2EE.arrayBufferToBase64(iv)
    };
  }
};
