import { uptime } from "os";

enum MyEnum {
  First,
  Second
}

interface MyFuncOptions {
  option?: boolean;
  what?: any;
}

// This is my function
let foo = function myFunc(options: MyFuncOptions): number {
  const { option, ...rest } = options;
  console.log(rest);
  if (option) {
    return uptime();
  }
  return -1;
};

let time: number = uptime();
