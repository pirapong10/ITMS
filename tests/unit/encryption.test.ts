import { encrypt, decrypt } from '../../src/lib/encryption';

describe('Encryption Utility (AES-256-GCM)', () => {
  it('should encrypt and decrypt a string successfully', () => {
    const plainText = 'Sensitive data 123!@#';
    const encrypted = encrypt(plainText);
    
    expect(encrypted).not.toBe(plainText);
    expect(encrypted.split(':').length).toBe(3); // iv:authTag:encryptedText
    
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plainText);
  });
  
  it('should throw an error if cipher format is invalid', () => {
    const invalidCipher = 'invalid:format';
    expect(() => decrypt(invalidCipher)).toThrow('Invalid encrypted text format');
  });
});
