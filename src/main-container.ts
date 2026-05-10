import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";

/**
 * An example element.
 *
 * @fires count-changed - Indicates when the count changes
 * @slot - This element has a slot
 * @csspart button - The button
 */
@customElement("main-container")
export class MainContainer extends LitElement {
  static override styles = css`
    :host {
      padding: 2rem;
      width: 90vw;
    }
  `;

  override render() {
    return html` <main><slot></slot></main> `;
  }

  /**
   * Formats a greeting
   * @param name The name to say "Hello" to
   */
  sayHello(name: string): string {
    return `Hello, ${name}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "main-container": MainContainer;
  }
}
