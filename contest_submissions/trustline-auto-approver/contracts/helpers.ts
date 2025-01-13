export const uint8ArrayToString = (ui8arr: Uint8Array) => {
  return Array.from(ui8arr)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
};

export function decodeJson(a: number[]): Record<string, any> {
    let s = "";
    for (let i = 0; i < a.length; i++) {
      s += String.fromCharCode(a[i]);
    }
    return JSON.parse(s);
  }
  
  export const decodeArray = (a: number[]) => {
    return a
      .map((v: number) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  };
  
  export function encodeString(v: string): string {
    let s = "";
    for (let i = 0; i < v.length; i++) {
      s += v.charCodeAt(i).toString(16).padStart(2, "0");
    }
    return s.toUpperCase();
  }
  
  type MyData = {
    id: string;
  };
  
  export function hexToUInt64(hex: string): any {
    return BigInt(`0x${hex}`);
  }
  
  export function uint64ToHex(value: any): string {
    return value.toString(16).padStart(16, "0").toUpperCase();
  }
  
  export function getHookParamJson(name: string): any {
    return decodeJson(hook_param(encodeString(name)) as number[]);
  }
  
  export function getOtxnParamJson(name: string): any {
    decodeJson(otxn_param(encodeString(name)) as number[]);
  }
  
  export function getStateUInt64(name: string): any {
      const stateResult = state(encodeString(name));
      if (Array.isArray(stateResult)) {
          return hexToUInt64(decodeArray(stateResult));
      } else {
          throw new Error("State returned an error code");
      }
  }
  
  export function setStateUInt64(name: string, value: any): void {
    state_set(uint64ToHex(value), encodeString(name));
  }
  
  export function getOtxnParam(key: string): number[] | number {
    return otxn_param(encodeString(key))
  }