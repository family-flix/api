export function format_number_with_3decimals(number: number) {
  let str = number.toString();
  //   const decimal_index = str.indexOf(".");
  //   let decimalPart = "";
  const [inter, decimal] = str.split(".");
  //   if (decimal_index !== -1) {
  //     decimalPart = str.substring(decimal_index + 1);
  //   }
  // 如果小数部分为空，则补充3个0
  if (!decimal) {
    return `${inter}.000`;
  }
  // 如果小数部分超过3位，则截取前3位
  if (decimal && decimal.length > 3) {
    return `${inter}.${decimal.slice(0, 3)}`;
  }
  if (decimal && decimal.length < 3) {
    let d = decimal;
    while (d.length < 3) {
      d += "0";
    }
    return `${inter}.${d}`;
  }
  return `${inter}.${decimal}`;
}
