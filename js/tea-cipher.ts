/** TEA Simple Block Cipher apapted from:
 *  http://www.movable-type.co.uk/scripts/tea-block.html
 */

module TEA {

  /** XXTEA supporting any number of blocks. */
  function code(v:number[], k:number[]) {
    var n = v.length;
    var z = v[n-1], y = v[0], delta = 0x9E3779B9;
    var mx, e, q = Math.floor(6 + 52/n), sum = 0;

    while (q-- > 0) {  // 6 + 52/n operations gives between 6 & 32 mixes on each word
        sum += delta;
        e = sum>>>2 & 3;
        for (var p = 0; p < n; p++) {
            y = v[(p+1)%n];
            mx = (z>>>5 ^ y<<2) + (y>>>3 ^ z<<4) ^ (sum^y) + (k[p&3 ^ e] ^ z);
            z = v[p] += mx;
        }
    }
  }

  /** XXTEA supporting any number of blocks. */
  function decode(v:number[], k:number[]) {
    var n = v.length;
    var z = v[n-1], y = v[0], delta = 0x9E3779B9;
    var mx, e, q = Math.floor(6 + 52/n), sum = q*delta;

    while (sum != 0) {
        e = sum>>>2 & 3;
        for (var p = n-1; p >= 0; p--) {
            z = v[p>0 ? p-1 : n-1];
            mx = (z>>>5 ^ y<<2) + (y>>>3 ^ z<<4) ^ (sum^y) + (k[p&3 ^ e] ^ z);
            y = v[p] -= mx;
        }
        sum -= delta;
    }
  }

  /** Based on this blog post:
  * http://effprog.blogspot.se/2009/12/javascript-numberprototypetobinarystrin.html
  */
  export function int2bin(num:number) {
    var temp = -1>>>1;

    var arr = new Array(32);
    for (var i = 31; i >= 0; --i) {
      arr[i] = (num & 1);
      num = num>>>1;
    }
    return arr.join('');
  }

  export function bin2int(bin:string) {
    var val:number = parseInt(bin, 2), neg:bool = bin[0] === '1';
    return (neg) ? ~(~val + 1) + 1 : val;
  }

  /** This careful function gets a max-range random unsigned int32. */
  function randomU32():number {
    return (Math.random()*(-1>>>0))>>>0;
  }

  export function randomKey():number[] {
    return [randomU32(), randomU32(), randomU32(), randomU32()];
  }

  function wrap64b(func:Function, key:number[], bin:string):string {
    var first:string = bin.slice(-64, -32), last:string = bin.slice(-32);
    var v = [bin2int(first), bin2int(last)];
    func(v, key);
    return int2bin(v[0]) + int2bin(v[1]);
  }

  /** Encrypt a number encoded as a binary string up to 64 bits. */
  export function encrypt64b(key:number[], bin:string):string {
    return wrap64b(code, key, bin);
  }
  /** Decrypt a number encoded as a binary string up to 64 bits. */
  export function decrypt64b(key:number[], bin:string):string {
    return wrap64b(decode, key, bin);
  }
}
