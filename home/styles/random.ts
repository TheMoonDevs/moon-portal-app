export function stringToColor(word:string) {
    let hash = 0;
    let i;
  
    /* eslint-disable no-bitwise */
    for (i = 0; i < word.length; i += 1) {
      hash = word.charCodeAt(i) + ((hash << 5) - hash);
    }
  
    let color = "#";
  
    for (i = 0; i < 3; i += 1) {
      const value = (hash >> (i * 8)) & 0xff;
      color += `00${value.toString(16)}`.slice(-2);
    }
    /* eslint-enable no-bitwise */
  
    return color;
  }
  
  export function stringToAvatar(word:string) {
    let maxI = 9;
    let hash = word.length % (maxI + 1);
    return `url("/images/avatars/${hash}.jpg") center / cover no-repeat`;
  }
  
  export function stringAvatar(name:string, type:"color" | "pattern" = "color") {
    const name_words = name.split(" ");
    let style = {};
    if (type === "color") {
      style = {
        backgroundColor: stringToColor(name),
      };
    }
    if (type === "pattern") {
      style = {
        background: stringToAvatar(name),
        fontWeight: 900,
      };
    }
    return {
      style: style,
      children: `${name_words[0][0]}${
        name_words.length > 1 ? name_words[1][0] : ""
      }`,
    };
  }
  