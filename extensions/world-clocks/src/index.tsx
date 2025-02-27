import { type Extension } from "@hypr/extension-utils";

const extension: Extension = {
  init: async () => {
    console.log("WorldClocks init");
  },
  twoByTwo: () => <div>WorldClocks</div>,
};

export default extension;
