declare module 'crypto-js' {
  export interface WordArray {
    toString(encoder?: any): string;
  }
  
  export interface CipherParams {
    toString(): string;
  }
  
  export namespace AES {
    function encrypt(message: string, key: string): CipherParams;
    function decrypt(ciphertext: CipherParams | string, key: string): WordArray;
  }
  
  export namespace enc {
    const Utf8: {
      parse(str: string): WordArray;
      stringify(wordArray: WordArray): string;
    };
    const Hex: {
      parse(str: string): WordArray;
      stringify(wordArray: WordArray): string;
    };
  }
  
  export namespace lib {
    const WordArray: {
      random(bytes: number): WordArray;
    };
  }
  
  export function MD5(message: string): WordArray;
  export function SHA256(message: string): WordArray;
  
  const CryptoJS: {
    AES: typeof AES;
    enc: typeof enc;
    lib: typeof lib;
    MD5: typeof MD5;
    SHA256: typeof SHA256;
  };
  
  export default CryptoJS;
}

declare module 'crypto-js/core' {
  import CryptoJS from 'crypto-js';
  export default CryptoJS;
}

declare module 'crypto-js/aes';
declare module 'crypto-js/enc-utf8';
declare module 'crypto-js/enc-hex';
