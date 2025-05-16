declare module "@editorjs/paragraph" {
  export default class Paragraph {
    static get toolbox(): {
      title: string;
      icon: string;
    };
    constructor({ data, config, api }: any);
    render(): HTMLElement;
    save(blockContent: HTMLElement): {
      text: string;
    };
  }
}
